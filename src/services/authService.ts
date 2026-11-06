import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User } from '../types';

const LOCAL_USER_KEY = 'gxe_current_user';

// Fallback guest user template
const DEFAULT_GUEST_USER: User = {
  id: 'guest_user_default',
  name: 'مستخدم GXE',
  username: 'gxe_user',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  bio: 'عضو نشط في مجتمع GXE 🚀',
  verified: true,
  following: [],
  followers: [],
  followingCount: 0,
  followersCount: 0,
};

export function getLocalSavedUser(): User {
  try {
    const saved = localStorage.getItem(LOCAL_USER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_GUEST_USER,
        ...parsed,
        following: parsed.following || [],
        followers: parsed.followers || [],
        followingCount: parsed.followingCount || (parsed.following?.length || 0),
        followersCount: parsed.followersCount || (parsed.followers?.length || 0),
      };
    }
  } catch (e) {
    console.error('Error reading local user', e);
  }

  // If first time, persist a unique guest user so their actions & following are never lost
  const initialGuest: User = {
    ...DEFAULT_GUEST_USER,
    id: 'guest_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
  };
  saveLocalUser(initialGuest);
  return initialGuest;
}

export function saveLocalUser(user: User) {
  try {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Error saving local user', e);
  }
}

/**
 * Automatically creates or syncs user document in Firestore cloud
 * Preserves following, followers, and all custom profile fields!
 */
export async function syncUserToCloud(fbUser: FirebaseUser): Promise<User> {
  const localSaved = getLocalSavedUser();

  const usernameClean = (
    fbUser.email?.split('@')[0] ||
    fbUser.displayName?.replace(/\s+/g, '_') ||
    'user'
  )
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');

  const userData: User = {
    id: fbUser.uid,
    name: fbUser.displayName || localSaved.name || 'مستخدم GXE',
    username: usernameClean || localSaved.username || `user_${fbUser.uid.substring(0, 5)}`,
    avatar:
      fbUser.photoURL ||
      localSaved.avatar ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
    email: fbUser.email || undefined,
    verified: true,
    bio: localSaved.bio || 'عضو موثّق في منصة GXE 🌟',
    coverUrl: localSaved.coverUrl || undefined,
    following: localSaved.following || [],
    followers: localSaved.followers || [],
    followingCount: localSaved.followingCount || (localSaved.following?.length || 0),
    followersCount: localSaved.followersCount || (localSaved.followers?.length || 0),
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
        await setDoc(
          userRef,
          {
            lastLogin: serverTimestamp(),
            isOnline: true,
          },
          { merge: true }
        );

        userData.name = existing.name || userData.name;
        userData.username = existing.username || userData.username;
        userData.avatar = existing.avatar || userData.avatar;
        userData.bio = existing.bio !== undefined ? existing.bio : userData.bio;
        userData.coverUrl = existing.coverUrl || userData.coverUrl;

        // CRITICAL FIX: Load following and followers from Firestore!
        const cloudFollowing = existing.following || [];
        const cloudFollowers = existing.followers || [];

        // If cloud already had following, use it; otherwise preserve local following
        const finalFollowing =
          cloudFollowing.length > 0 ? cloudFollowing : (localSaved.following || []);
        const finalFollowers =
          cloudFollowers.length > 0 ? cloudFollowers : (localSaved.followers || []);

        userData.following = finalFollowing;
        userData.followers = finalFollowers;
        userData.followingCount = existing.followingCount || finalFollowing.length;
        userData.followersCount = existing.followersCount || finalFollowers.length;

        // Sync back to cloud if local had more following
        if (finalFollowing.length > cloudFollowing.length) {
          await setDoc(
            userRef,
            {
              following: finalFollowing,
              followingCount: finalFollowing.length,
            },
            { merge: true }
          );
        }
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
  const localSaved = getLocalSavedUser();

  const user: User = {
    id: result.user.uid,
    name: name.trim() || 'مستخدم GXE',
    username: email.split('@')[0],
    email,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${result.user.uid}`,
    verified: true,
    bio: 'عضو جديد في منصة GXE ✨',
    following: localSaved.following || [],
    followers: localSaved.followers || [],
    followingCount: localSaved.following?.length || 0,
    followersCount: localSaved.followers?.length || 0,
    createdAt: Date.now(),
  };

  if (db) {
    try {
      await setDoc(
        doc(db, 'users', user.id),
        {
          ...user,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );
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
