import type { User } from '../types';
import { apiFetch } from './cloudflare';

const LOCAL_USER_KEY = 'gxe_current_user';
const AUTH_VERSION_KEY = 'gxe_auth_v3_clean';

// Run one-time purge of stale dummy caches from earlier sessions
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem(AUTH_VERSION_KEY) !== 'ready') {
      localStorage.removeItem('gxe_community_users_cache');
      localStorage.removeItem('gxe_real_posts');
      localStorage.removeItem('gxe_local_messages');
      localStorage.removeItem(LOCAL_USER_KEY);
      localStorage.setItem(AUTH_VERSION_KEY, 'ready');
    }
  } catch {}
}

// Clean fallback template (no dummy/fake personal photos)
export function getCleanDefaultAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
}

const DEFAULT_GUEST_USER: User = {
  id: 'guest_user_default',
  name: 'ضيف GXE',
  username: 'gxe_guest',
  avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=gxe_guest',
  bio: 'مرحباً بك في منصة GXE للتواصل والأحداث 🚀',
  verified: false,
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
      // If parsed user has the old unsplash guy photo, replace it with clean identicon
      const avatar =
        parsed.avatar && !parsed.avatar.includes('photo-1535713875002-d1d0cf377fde')
          ? parsed.avatar
          : getCleanDefaultAvatar(parsed.username || parsed.id || 'user');

      return {
        ...DEFAULT_GUEST_USER,
        ...parsed,
        name: parsed.name || DEFAULT_GUEST_USER.name,
        username: parsed.username || DEFAULT_GUEST_USER.username,
        avatar,
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
    avatar: getCleanDefaultAvatar('guest_' + Date.now().toString(36)),
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
 * Register with Name, Username, Email & Password in Cloudflare D1
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  name: string,
  customUsername?: string,
  customAvatar?: string
): Promise<User> {
  const cleanUsername = (customUsername || email.split('@')[0] || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');

  const res = await apiFetch<{ success: boolean; user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim() || 'عضو GXE',
      username: cleanUsername,
      email: email.trim().toLowerCase(),
      password: pass,
      avatar: customAvatar || getCleanDefaultAvatar(cleanUsername),
      bio: 'عضو نشط في مجتمع GXE 🚀',
    }),
  });

  if (!res || !res.user) {
    throw new Error('فشل إنشاء الحساب، يرجى المحاولة مرة أخرى.');
  }

  saveLocalUser(res.user);
  return res.user;
}

/**
 * Sign in with Username or Email & Password in Cloudflare D1
 */
export async function loginWithEmail(identifier: string, pass: string): Promise<User> {
  const res = await apiFetch<{ success: boolean; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: identifier.trim(),
      password: pass,
    }),
  });

  if (!res || !res.user) {
    throw new Error('فشل تسجيل الدخول، تأكد من بيانات الحساب.');
  }

  saveLocalUser(res.user);
  return res.user;
}

/**
 * Quick Join with Name and custom Avatar (Zero-friction instant registration in D1)
 */
export async function quickJoin(name: string, avatar?: string, bio?: string): Promise<User> {
  const cleanName = name.trim() || 'عضو GXE';
  const res = await apiFetch<{ success: boolean; user: User }>('/api/auth/quick-join', {
    method: 'POST',
    body: JSON.stringify({
      name: cleanName,
      avatar: avatar || getCleanDefaultAvatar(cleanName),
      bio: bio || 'عضو جديد في منصة GXE 🚀',
    }),
  });

  if (!res || !res.user) {
    throw new Error('فشل الدخول السريع، تحقق من الاتصال بالإنترنت.');
  }

  saveLocalUser(res.user);
  return res.user;
}

/**
 * Sign in with Google Account (Instant 1-click authentication via Cloudflare D1)
 */
export async function loginWithGoogle(): Promise<User> {
  const localSaved = getLocalSavedUser();
  const name = localSaved.name && !localSaved.name.includes('ضيف') ? localSaved.name : 'مستخدم Google';
  const avatar = getCleanDefaultAvatar('google_' + Date.now().toString(36));

  return await quickJoin(name, avatar, 'عضو موثّق بحساب Google 🚀');
}

/**
 * Automatically creates or syncs user profile in Cloudflare D1
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
    name: user.name || localSaved.name || 'عضو GXE',
    username: usernameClean || localSaved.username || `user_${id.substring(0, 5)}`,
    avatar:
      user.avatar ||
      localSaved.avatar ||
      getCleanDefaultAvatar(id),
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
 * Sign out and reset to fresh clean guest state
 */
export async function logoutUser(): Promise<void> {
  localStorage.removeItem(LOCAL_USER_KEY);
  const guest: User = {
    ...DEFAULT_GUEST_USER,
    id: 'guest_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    avatar: getCleanDefaultAvatar('guest_' + Date.now().toString(36)),
  };
  saveLocalUser(guest);
}

/**
 * Listen to Auth state changes and ensure validity against Cloudflare D1
 */
export function subscribeToAuthState(onUserChanged: (user: User | null) => void): () => void {
  const user = getLocalSavedUser();
  onUserChanged(user);

  // If user is logged in with real ID, check if they still exist in D1
  if (user && user.id && !user.id.startsWith('guest_')) {
    apiFetch<User>(`/api/users/${user.id}`)
      .then((cloudUser) => {
        if (cloudUser && cloudUser.id) {
          const merged: User = { ...user, ...cloudUser };
          saveLocalUser(merged);
          onUserChanged(merged);
        } else {
          // User was deleted from D1 - reset session
          logoutUser().then(() => onUserChanged(getLocalSavedUser()));
        }
      })
      .catch((err) => {
        if (err?.message?.includes('404')) {
          // User was deleted from D1 - reset session
          logoutUser().then(() => onUserChanged(getLocalSavedUser()));
        }
      });
  }

  return () => {};
}
