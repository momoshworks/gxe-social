import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User } from '../types';

const LOCAL_USER_KEY = 'gxe_current_user';

// Fallback guest user for instant offline use
const DEFAULT_GUEST_USER: User = {
  id: 'guest_user_' + Math.floor(1000 + Math.random() * 9000),
  name: 'مستخدم GXE',
  username: 'gxe_user',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  bio: 'عضو نشط في مجتمع GXE 🚀',
  verified: true,
};

export function getLocalSavedUser(): User {
  try {
    const saved = localStorage.getItem(LOCAL_USER_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading local user', e);
  }
  return DEFAULT_GUEST_USER;
}

export function saveLocalUser(user: User) {
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
}

/**
 * Automatically creates or syncs user document in Firestore cloud
 */
export async function syncUserToCloud(fbUser: FirebaseUser): Promise<User> {
  const usernameClean = (fbUser.email?.split('@')[0] || fbUser.displayName?.replace(/\s+/g, '_') || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');

  const userData: User = {
    id: fbUser.uid,
    name: fbUser.displayName || 'مستخدم GXE',
    username: usernameClean || `user_${fbUser.uid.substring(0, 5)}`,
    avatar:
      fbUser.photoURL ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
    email: fbUser.email || undefined,
    verified: true,
    bio: 'عضو موثّق في منصة GXE 🌟',
    createdAt: Date.now(),
    isOnline: true,
  };

  if (db) {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
        console.log('✅ New Google user created automatically in Firestore:', userData.username);
      } else {
        const existing = snap.data();
        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
          isOnline: true,
        });
        userData.name = existing.name || userData.name;
        userData.username = existing.username || userData.username;
        userData.avatar = existing.avatar || userData.avatar;
        userData.bio = existing.bio || userData.bio;
      }
    } catch (err) {
      console.warn('Could not sync user to Firestore directly:', err);
    }
  }

  saveLocalUser(userData);
  return userData;
}

/**
 * Sign in with Google Account
 */
export async function loginWithGoogle(): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Auth غير مهيأ. يرجى التأكد من بيانات المشروع في السحابة.');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  return await syncUserToCloud(result.user);
}

/**
 * Register with Email & Password
 */
export async function registerWithEmail(email: string, pass: string, name: string): Promise<User> {
  if (!auth) throw new Error('Firebase Auth غير مهيأ');
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  
  const user: User = {
    id: result.user.uid,
    name: name.trim() || 'مستخدم GXE',
    username: email.split('@')[0],
    email,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${result.user.uid}`,
    verified: true,
    bio: 'عضو جديد في منصة GXE ✨',
    createdAt: Date.now(),
  };

  if (db) {
    try {
      await setDoc(doc(db, 'users', user.id), {
        ...user,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Save user doc failed:', e);
    }
  }

  saveLocalUser(user);
  return user;
}

/**
 * Sign in with Email & Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  if (!auth) throw new Error('Firebase Auth غير مهيأ');
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return await syncUserToCloud(result.user);
}

/**
 * Sign out
 */
export async function logoutUser(): Promise<void> {
  if (auth) {
    await firebaseSignOut(auth);
  }
  localStorage.removeItem(LOCAL_USER_KEY);
}

/**
 * Listen to Auth state changes
 */
export function subscribeToAuthState(onUserChanged: (user: User | null) => void): () => void {
  if (!auth) {
    onUserChanged(getLocalSavedUser());
    return () => {};
  }

  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const user = await syncUserToCloud(fbUser);
      onUserChanged(user);
    } else {
      const saved = getLocalSavedUser();
      onUserChanged(saved);
    }
  });
}
