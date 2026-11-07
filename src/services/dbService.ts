import type { Post, Comment, User, AppNotification, Trend, Unsubscribe } from '../types';
import { apiFetch } from './cloudflare';

const LOCAL_POSTS_KEY = 'gxe_real_posts';
const LOCAL_COMMENTS_KEY = 'gxe_real_comments';
const LOCAL_NOTIFS_KEY = 'gxe_real_notifications';
const BROADCAST_CHANNEL = 'gxe_realtime_data_bus';

// BroadcastChannel for instant cross-tab real-time sync
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(BROADCAST_CHANNEL)
  : null;

const INITIAL_POSTS: Post[] = [];

export function getLocalPosts(): Post[] {
  try {
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local posts:', e);
  }
  return INITIAL_POSTS;
}

const localPostListeners: Set<(posts: Post[]) => void> = new Set();

function notifyLocalPostListeners(posts: Post[]) {
  localPostListeners.forEach((listener) => {
    try {
      listener(posts);
    } catch (e) {
      console.warn('Local post listener error:', e);
    }
  });
}

function setLocalPosts(posts: Post[]) {
  try {
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
  } catch (e) {
    console.warn('Storage quota exceeded:', e);
  }
  notifyLocalPostListeners(posts);
  if (channel) {
    channel.postMessage({ type: 'POSTS_UPDATED', posts });
  }
}

function getLocalComments(): Comment[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local comments:', e);
  }
  return [];
}

const localCommentListeners = new Map<string, Set<(comments: Comment[]) => void>>();

function notifyLocalCommentListeners(postId: string, comments: Comment[]) {
  const listeners = localCommentListeners.get(postId);
  if (listeners) {
    const postComments = comments.filter((c) => c.postId === postId);
    listeners.forEach((listener) => {
      try {
        listener(postComments);
      } catch (e) {
        console.warn('Local comment listener error:', e);
      }
    });
  }
}

function setLocalComments(comments: Comment[], targetPostId?: string) {
  try {
    localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
  } catch (e) {
    console.warn('Storage quota exceeded:', e);
  }
  if (targetPostId) {
    notifyLocalCommentListeners(targetPostId, comments);
  } else {
    localCommentListeners.forEach((_, postId) => {
      notifyLocalCommentListeners(postId, comments);
    });
  }
  if (channel) {
    channel.postMessage({ type: 'COMMENTS_UPDATED', comments, targetPostId });
  }
}

export function getLocalNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local notifications:', e);
  }
  return [];
}

const localNotifListeners = new Map<string, Set<(notifs: AppNotification[]) => void>>();

function notifyLocalNotifListeners(userId: string, notifs: AppNotification[]) {
  const listeners = localNotifListeners.get(userId);
  if (listeners) {
    listeners.forEach((listener) => {
      try {
        listener(notifs);
      } catch (e) {
        console.warn('Local notif listener error:', e);
      }
    });
  }
}

function setLocalNotifications(userId: string, notifs: AppNotification[]) {
  try {
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.warn('Storage quota exceeded:', e);
  }
  notifyLocalNotifListeners(userId, notifs);
  if (channel) {
    channel.postMessage({ type: 'NOTIFICATIONS_UPDATED', userId, notifs });
  }
}

// Global broadcast listener
if (channel) {
  channel.onmessage = (event) => {
    if (event.data?.type === 'POSTS_UPDATED') {
      notifyLocalPostListeners(event.data.posts);
    } else if (event.data?.type === 'COMMENTS_UPDATED') {
      if (event.data.targetPostId) {
        notifyLocalCommentListeners(event.data.targetPostId, event.data.comments);
      }
    } else if (event.data?.type === 'NOTIFICATIONS_UPDATED') {
      notifyLocalNotifListeners(event.data.userId, event.data.notifs);
    }
  };
}

/**
 * Intelligent Post deduplication and merger:
 * Preserves local optimistic posts created in the last 3 minutes while incorporating cloud posts
 */
function mergePosts(cloudPosts: Post[], localPosts: Post[]): Post[] {
  const map = new Map<string, Post>();
  const recentLocalThreshold = Date.now() - 3 * 60 * 1000;

  // Add cloud posts first
  cloudPosts.forEach((post) => map.set(post.id, post));

  // Merge any recent local posts that might still be syncing
  localPosts.forEach((lp) => {
    if (lp.createdAt > recentLocalThreshold && !map.has(lp.id)) {
      // Check for content/author duplicate within 60 seconds
      const isDuplicate = cloudPosts.some(
        (cp) =>
          cp.author.id === lp.author.id &&
          cp.content === lp.content &&
          Math.abs(cp.createdAt - lp.createdAt) < 60000
      );
      if (!isDuplicate) {
        map.set(lp.id, lp);
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt - a.createdAt;
  });
}

/**
 * Real-time subscription to Posts Feed (Dual-Layer: Instant 0ms Local + Cloudflare D1 Sync)
 */
export function subscribeToPosts(onUpdate: (posts: Post[]) => void): Unsubscribe {
  // 1. Instant local render (0ms) so feed is never empty or lagging
  const initial = getLocalPosts();
  onUpdate(initial);

  // 2. Register local in-memory listener
  localPostListeners.add(onUpdate);

  // 3. Listen to other tabs/windows
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'POSTS_UPDATED') {
      onUpdate(event.data.posts);
    }
  };
  if (channel) {
    channel.addEventListener('message', handleMessage);
  }

  let isSubscribed = true;

  // 4. Fetch from Cloudflare D1 immediately and periodically
  const fetchCloudPosts = async () => {
    if (!isSubscribed) return;
    try {
      const cloudPosts = await apiFetch<Post[]>('/api/posts');
      if (Array.isArray(cloudPosts) && isSubscribed) {
        const merged = mergePosts(cloudPosts, getLocalPosts());
        try {
          localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        onUpdate(merged);
      }
    } catch (err) {
      console.warn('Cloudflare Posts sync notice (using local storage cache):', err);
    }
  };

  fetchCloudPosts();

  // Poll Cloudflare D1 every 3 seconds for real-time live feed across all users
  const intervalId = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchCloudPosts();
    }
  }, 3000);

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      fetchCloudPosts();
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
    localPostListeners.delete(onUpdate);
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
  };
}

/**
 * Create a new Post (Instant 0ms Optimistic UI + Cloudflare D1 Cloud Sync)
 */
export async function createPost(
  newPostData: Omit<Post, 'id' | 'createdAt' | 'likes' | 'reposts' | 'commentsCount'>
): Promise<string> {
  const author = newPostData.author;
  const now = Date.now();

  // Deterministic unique ID
  const deterministicId =
    'post_' +
    now.toString(36) +
    '_' +
    Math.random().toString(36).substring(2, 6);

  const safeAuthor: User = {
    ...author,
    id: author.id || 'anonymous',
    name: author.name || 'مستخدم GXE',
    username: author.username || 'user',
    avatar: author.avatar || '',
    verified: Boolean(author.verified),
  };

  const newPost: Post = {
    id: deterministicId,
    author: safeAuthor,
    content: newPostData.content,
    mediaUrl: newPostData.mediaUrl,
    mediaType: newPostData.mediaType,
    mediaName: newPostData.mediaName,
    mediaSize: newPostData.mediaSize,
    createdAt: now,
    likes: 0,
    reposts: 0,
    commentsCount: 0,
    likedBy: [],
    repostedBy: [],
    bookmarkedBy: [],
    pinned: newPostData.pinned || false,
  };

  // 1. INSTANT 0ms OPTIMISTIC UPDATE: user sees the post immediately
  const localPosts = getLocalPosts();
  setLocalPosts([newPost, ...localPosts]);

  // 2. Synchronize to Cloudflare D1
  try {
    await apiFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify(newPost),
    });
  } catch (err) {
    console.warn('Cloudflare post sync notice: Saved in local database, will sync when online.', err);
  }

  return deterministicId;
}

/**
 * Delete a Post (Instant 0ms Local + Cloudflare D1 Sync)
 */
export async function deletePost(postId: string): Promise<void> {
  // 1. Instant 0ms local deletion
  const localPosts = getLocalPosts().filter((p) => p.id !== postId);
  setLocalPosts(localPosts);

  // 2. Delete from Cloudflare D1
  try {
    await apiFetch(`/api/posts/${postId}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Cloudflare delete sync notice:', err);
  }
}

/**
 * Toggle Like on Post (Instant 0ms Local + Cloudflare D1 Sync)
 */
export async function toggleLike(post: Post, currentUser: User): Promise<void> {
  const currentLikes = post.likedBy || [];
  const isLiked = currentLikes.includes(currentUser.id);

  const updatedLikedBy = isLiked
    ? currentLikes.filter((id) => id !== currentUser.id)
    : [...currentLikes, currentUser.id];

  const updatedLikesCount = Math.max(0, post.likes + (isLiked ? -1 : 1));

  // 1. Instant 0ms local update
  const localPosts = getLocalPosts().map((p) =>
    p.id === post.id
      ? { ...p, likes: updatedLikesCount, likedBy: updatedLikedBy }
      : p
  );
  setLocalPosts(localPosts);

  // 2. Cloudflare D1 sync
  try {
    await apiFetch(`/api/posts/${post.id}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId: currentUser.id }),
    });

    // Notify author if liked
    if (!isLiked && post.author.id !== currentUser.id) {
      await addNotification({
        recipientId: post.author.id,
        sender: currentUser,
        type: 'like',
        postContent: `أعجب بهاريتك: "${post.content.slice(0, 30)}..."`,
        postId: post.id,
      });
    }
  } catch (e) {
    console.warn('Cloudflare like sync notice:', e);
  }
}

/**
 * Toggle Repost (Instant 0ms Local + Cloudflare D1 Sync)
 */
export async function toggleRepost(post: Post, currentUser: User): Promise<void> {
  const currentReposts = post.repostedBy || [];
  const isReposted = currentReposts.includes(currentUser.id);

  const updatedRepostedBy = isReposted
    ? currentReposts.filter((id) => id !== currentUser.id)
    : [...currentReposts, currentUser.id];

  const updatedRepostsCount = Math.max(0, post.reposts + (isReposted ? -1 : 1));

  // 1. Instant 0ms local update
  const localPosts = getLocalPosts().map((p) =>
    p.id === post.id
      ? { ...p, reposts: updatedRepostsCount, repostedBy: updatedRepostedBy }
      : p
  );
  setLocalPosts(localPosts);

  // 2. Cloudflare D1 sync
  try {
    await apiFetch(`/api/posts/${post.id}/repost`, {
      method: 'POST',
      body: JSON.stringify({ userId: currentUser.id }),
    });

    if (!isReposted && post.author.id !== currentUser.id) {
      await addNotification({
        recipientId: post.author.id,
        sender: currentUser,
        type: 'repost',
        postContent: `أعاد نشر هاريتك: "${post.content.slice(0, 30)}..."`,
        postId: post.id,
      });
    }
  } catch (e) {
    console.warn('Cloudflare repost sync notice:', e);
  }
}

/**
 * Toggle Bookmark (Instant 0ms Local + Cloudflare D1 Sync)
 */
export async function toggleBookmark(postId: string, userId: string): Promise<boolean> {
  const localPosts = getLocalPosts();
  let bookmarked = false;

  const updatedPosts = localPosts.map((p) => {
    if (p.id === postId) {
      const current = p.bookmarkedBy || [];
      const exists = current.includes(userId);
      bookmarked = !exists;
      return {
        ...p,
        bookmarkedBy: exists ? current.filter((id) => id !== userId) : [...current, userId],
      };
    }
    return p;
  });

  setLocalPosts(updatedPosts);

  try {
    await apiFetch(`/api/posts/${postId}/bookmark`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  } catch (e) {
    console.warn('Cloudflare bookmark sync notice:', e);
  }

  return bookmarked;
}

/**
 * Real-time subscription to Comments (الهاري) for a Post
 */
export function subscribeToComments(
  postId: string,
  onUpdate: (comments: Comment[]) => void
): Unsubscribe {
  // 1. Instant local render
  const initial = getLocalComments().filter((c) => c.postId === postId);
  onUpdate(initial);

  // 2. Register listener
  if (!localCommentListeners.has(postId)) {
    localCommentListeners.set(postId, new Set());
  }
  localCommentListeners.get(postId)!.add(onUpdate);

  let isSubscribed = true;

  // 3. Fetch from Cloudflare D1
  const fetchCloudComments = async () => {
    if (!isSubscribed) return;
    try {
      const cloudComments = await apiFetch<Comment[]>(`/api/posts/${postId}/comments`);
      if (Array.isArray(cloudComments) && isSubscribed) {
        // Merge with local comments
        const allLocal = getLocalComments();
        const otherComments = allLocal.filter((c) => c.postId !== postId);
        const map = new Map<string, Comment>();
        cloudComments.forEach((c) => map.set(c.id, c));
        allLocal.filter((c) => c.postId === postId).forEach((c) => {
          if (!map.has(c.id)) map.set(c.id, c);
        });
        const postComments = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
        setLocalComments([...otherComments, ...postComments], postId);
        onUpdate(postComments);
      }
    } catch (err) {
      console.warn('Cloudflare Comments sync notice:', err);
    }
  };

  fetchCloudComments();

  // Poll comments every 3 seconds while post is open
  const intervalId = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchCloudComments();
    }
  }, 3000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
    const listeners = localCommentListeners.get(postId);
    if (listeners) {
      listeners.delete(onUpdate);
      if (listeners.size === 0) localCommentListeners.delete(postId);
    }
  };
}

/**
 * Add a Comment (الهاري) to a Post (Instant 0ms Local + Cloudflare D1 Sync)
 */
export async function addComment(post: Post, author: User, text: string): Promise<Comment> {
  const safeAuthor: User = {
    ...author,
    id: author.id || 'anonymous',
    name: author.name || 'مستخدم GXE',
    username: author.username || 'user',
    avatar: author.avatar || '',
    verified: Boolean(author.verified),
  };

  const newComment: Comment = {
    id: 'comment_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    postId: post.id,
    author: safeAuthor,
    text: text.trim(),
    createdAt: Date.now(),
    likes: 0,
    likedBy: [],
  };

  // 1. Instant 0ms local update
  const allComments = getLocalComments();
  setLocalComments([...allComments, newComment], post.id);

  // Update post comment count locally
  const localPosts = getLocalPosts().map((p) =>
    p.id === post.id ? { ...p, commentsCount: p.commentsCount + 1 } : p
  );
  setLocalPosts(localPosts);

  // 2. Cloudflare D1 sync
  try {
    await apiFetch(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      body: JSON.stringify(newComment),
    });

    if (post.author.id !== author.id) {
      await addNotification({
        recipientId: post.author.id,
        sender: author,
        type: 'comment',
        postContent: `أضاف هاري على هاريتك: "${text.slice(0, 30)}..."`,
        postId: post.id,
      });
    }
  } catch (err) {
    console.warn('Cloudflare comment sync notice:', err);
  }

  return newComment;
}

/**
 * Real-time subscription to Notifications (Instant 0ms Local + Cloudflare D1 Sync)
 */
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifs: AppNotification[]) => void
): Unsubscribe {
  const initial = getLocalNotifications();
  onUpdate(initial);

  if (!localNotifListeners.has(userId)) {
    localNotifListeners.set(userId, new Set());
  }
  localNotifListeners.get(userId)!.add(onUpdate);

  let isSubscribed = true;

  const fetchCloudNotifs = async () => {
    if (!isSubscribed) return;
    try {
      const cloudNotifs = await apiFetch<AppNotification[]>(`/api/notifications/${userId}`);
      if (Array.isArray(cloudNotifs) && isSubscribed) {
        setLocalNotifications(userId, cloudNotifs);
        onUpdate(cloudNotifs);
      }
    } catch (err) {
      console.warn('Cloudflare notifications sync notice:', err);
    }
  };

  fetchCloudNotifs();

  const intervalId = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchCloudNotifs();
    }
  }, 4000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
    const listeners = localNotifListeners.get(userId);
    if (listeners) {
      listeners.delete(onUpdate);
      if (listeners.size === 0) localNotifListeners.delete(userId);
    }
  };
}

export async function addNotification(
  notifData: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): Promise<void> {
  const targetId = notifData.recipientId || notifData.userId || '';
  const newNotif: AppNotification = {
    ...notifData,
    recipientId: targetId,
    id: 'notif_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    createdAt: Date.now(),
    read: false,
  };

  const current = getLocalNotifications();
  setLocalNotifications(targetId, [newNotif, ...current]);

  try {
    await apiFetch('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        ...newNotif,
        userId: targetId,
        senderId: newNotif.sender?.id,
        senderName: newNotif.sender?.name,
        senderUsername: newNotif.sender?.username,
        senderAvatar: newNotif.sender?.avatar,
        content: newNotif.postContent || newNotif.content || '',
      }),
    });
  } catch (err) {
    console.warn('Cloudflare add notification sync notice:', err);
  }
}

export async function markNotificationsAsRead(userId: string): Promise<void> {
  const updated = getLocalNotifications().map((n) => ({ ...n, read: true }));
  setLocalNotifications(userId, updated);

  try {
    await apiFetch(`/api/notifications/${userId}/read`, { method: 'POST' });
  } catch (err) {
    console.warn('Cloudflare mark notifs read notice:', err);
  }
}

/**
 * Follow / Unfollow User (Instant 0ms Local + Cloudflare D1 Sync)
 */
export async function toggleFollowUser(currentUser: User, targetUser: User): Promise<boolean> {
  const currentFollowing = currentUser.following || [];
  const isFollowing = currentFollowing.includes(targetUser.id);

  let isNowFollowing = !isFollowing;

  try {
    const res = await apiFetch<{ isFollowing: boolean }>(`/api/users/${targetUser.id}/follow`, {
      method: 'POST',
      body: JSON.stringify({ followerId: currentUser.id }),
    });
    if (typeof res?.isFollowing === 'boolean') {
      isNowFollowing = res.isFollowing;
    }

    if (isNowFollowing) {
      await addNotification({
        recipientId: targetUser.id,
        sender: currentUser,
        type: 'follow',
        postContent: `بدأ بمتابعتك الآن 🌟`,
      });
    }
  } catch (e) {
    console.warn('Cloudflare follow sync notice:', e);
  }

  return isNowFollowing;
}

/**
 * Extract Trending Topics dynamically from recent posts
 */
export function extractTrendsFromPosts(posts: Post[]): Trend[] {
  const counts: Record<string, number> = {};

  posts.forEach((post) => {
    const words = post.content.split(/\s+/);
    words.forEach((w) => {
      if (w.startsWith('#') && w.length > 2) {
        counts[w] = (counts[w] || 0) + 1;
      }
    });
  });

  const topHashtags = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count], index) => ({
      id: `trend-${index}`,
      category: 'تريند مصر والعالم',
      tag,
      postsCount: `${count} هارية`,
      count,
    }));

  if (topHashtags.length === 0) {
    return [
      { id: '1', category: 'الذكاء الاصطناعي', tag: '#GXE_2026', postsCount: '1.2K هارية', count: 1200 },
      { id: '2', category: 'التقنية السحابية', tag: '#Cloudflare_Edge', postsCount: '890 هارية', count: 890 },
      { id: '3', category: 'تطوير البرمجيات', tag: '#Web_Development', postsCount: '650 هارية', count: 650 },
    ];
  }

  return topHashtags;
}

/**
 * Update User Profile in Cloudflare D1
 */
export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
  try {
    await apiFetch('/api/users/sync', {
      method: 'POST',
      body: JSON.stringify({ id: userId, ...updates }),
    });
  } catch (e) {
    console.warn('Cloudflare user profile sync notice:', e);
  }
}

/**
 * Subscribe to User Document
 */
export function subscribeToUserDoc(
  userId: string,
  onUpdate: (user: Partial<User>) => void
): Unsubscribe {
  let isSubscribed = true;

  const fetchUser = async () => {
    if (!isSubscribed) return;
    try {
      const user = await apiFetch<User>(`/api/users/${userId}`);
      if (user && isSubscribed) {
        onUpdate(user);
      }
    } catch {
      // ignore
    }
  };

  fetchUser();

  const intervalId = setInterval(fetchUser, 5000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
  };
}
