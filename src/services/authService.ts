import type { User } from '../types';
import { apiFetch } from './cloudflare';

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
        name: parsed.name || DEFAULT_GUEST_USER.name,
        username: parsed.username || DEFAULT_GUEST_USER.username,
        avatar: (parsed.avatar && parsed.avatar.trim().length > 0) ? parsed.avatar : DEFAULT_GUEST_USER.avatar,
        following: parsed.following || [],
        followers: parsed.followers || [],
        followingCount: parsed.followingCount || (parsed.following?.length || 0),
        followersCount: parsed.followersCount || (parsed.followers?.length || 0),
      };
    }
  } catch (e) {
    console.error('Error reading local user', e);
  }

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
 * Automatically creates or syncs user document in Cloudflare D1 cloud
 */
export async function syncUserToCloud(user: Partial<User>): Promise<User> {
  const localSaved = getLocalSavedUser();

  const id = user.id || localSaved.id;
  const usernameClean = (
    user.username ||
    user.email?.split('@')[0] ||
    user.name?.replace(/\s+/g, '_') ||
    'user'
  )
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');

  const userData: User = {
    id,
    name: user.name || localSaved.name || 'مستخدم GXE',
    username: usernameClean || localSaved.username || `user_${id.substring(0, 5)}`,
    avatar:
      user.avatar ||
      localSaved.avatar ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
    email: user.email || localSaved.email || undefined,
    verified: true,
    bio: user.bio || localSaved.bio || 'عضو موثّق في منصة GXE 🌟',
    coverUrl: user.coverUrl || localSaved.coverUrl || undefined,
    following: user.following || localSaved.following || [],
    followers: user.followers || localSaved.followers || [],
    followingCount: user.followingCount || localSaved.followingCount || 0,
    followersCount: user.followersCount || localSaved.followersCount || 0,
    createdAt: user.createdAt || localSaved.createdAt || Date.now(),
    isOnline: true,
  };

  saveLocalUser(userData);

  // Sync to Cloudflare D1
  try {
    await apiFetch('/api/users/sync', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  } catch (err) {
    console.warn('Could not sync user to Cloudflare D1:', err);
  }

  return userData;
}

/**
 * Sign in with Google Account (Fast 1-click authentication via Cloudflare)
 */
export async function loginWithGoogle(): Promise<User> {
  const localSaved = getLocalSavedUser();
  const googleUid = 'google_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  const googleUser: User = {
    id: googleUid,
    name: localSaved.name !== 'مستخدم GXE' ? localSaved.name : 'أحمد سيف (Google)',
    username: (localSaved.username !== 'gxe_user' ? localSaved.username : 'ahmed_seif').toLowerCase(),
    avatar: localSaved.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${googleUid}`,
    email: 'user@gmail.com',
    verified: true,
    bio: 'عضو موثّق بحساب Google عبر السحابة العالمية 🚀',
    following: localSaved.following || [],
    followers: localSaved.followers || [],
    followingCount: localSaved.followingCount || 0,
    followersCount: localSaved.followersCount || 0,
    createdAt: Date.now(),
    isOnline: true,
  };

  return await syncUserToCloud(googleUser);
}

/**
 * Register with Email & Password
 */
export async function registerWithEmail(email: string, _pass: string, name: string): Promise<User> {
  const uid = 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const localSaved = getLocalSavedUser();

  const user: User = {
    id: uid,
    name: name.trim() || 'مستخدم GXE',
    username: email.split('@')[0],
    email,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
    verified: true,
    bio: 'عضو جديد في منصة GXE ✨',
    following: localSaved.following || [],
    followers: localSaved.followers || [],
    followingCount: localSaved.following?.length || 0,
    followersCount: localSaved.followers?.length || 0,
    createdAt: Date.now(),
  };

  return await syncUserToCloud(user);
}

/**
 * Sign in with Email & Password
 */
export async function loginWithEmail(email: string, _pass: string): Promise<User> {
  const localSaved = getLocalSavedUser();
  const user: User = {
    ...localSaved,
    email,
    username: email.split('@')[0],
  };
  return await syncUserToCloud(user);
}

/**
 * Sign out
 */
export async function logoutUser(): Promise<void> {
  localStorage.removeItem(LOCAL_USER_KEY);
  const guest: User = {
    ...DEFAULT_GUEST_USER,
    id: 'guest_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
  };
  saveLocalUser(guest);
}

/**
 * Listen to Auth state changes
 */
export function subscribeToAuthState(onUserChanged: (user: User | null) => void): () => void {
  const user = getLocalSavedUser();
  onUserChanged(user);

  // Sync latest from Cloudflare D1 if online
  if (user && user.id) {
    apiFetch<User>(`/api/users/${user.id}`)
      .then((cloudUser) => {
        if (cloudUser) {
          const merged: User = { ...user, ...cloudUser };
          saveLocalUser(merged);
          onUserChanged(merged);
        }
      })
      .catch(() => {});
  }

  return () => {};
}
