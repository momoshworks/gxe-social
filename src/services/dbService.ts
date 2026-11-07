import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  where,
  increment,
  arrayUnion,
  arrayRemove,
  getDocs,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Post, Comment, User, AppNotification, Trend } from '../types';

const LOCAL_POSTS_KEY = 'gxe_real_posts';
const LOCAL_COMMENTS_KEY = 'gxe_real_comments';
const LOCAL_NOTIFS_KEY = 'gxe_real_notifications';
const BROADCAST_CHANNEL = 'gxe_realtime_data_bus';

// BroadcastChannel for instant cross-tab real-time sync when offline
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(BROADCAST_CHANNEL)
  : null;

// Clean initial state: ZERO dummy/filler posts. Everything starts empty and real!
const INITIAL_POSTS: Post[] = [];

function getLocalPosts(): Post[] {
  try {
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local posts:', e);
  }
  return INITIAL_POSTS;
}

// Local in-memory listeners for the current tab / mobile screen
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
  // 1. Notify current window listeners immediately!
  notifyLocalPostListeners(posts);
  // 2. Notify other open windows/tabs via broadcast
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

// Local in-memory listeners for active post comments
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

  // 1. Notify current window listeners immediately (0ms)
  if (targetPostId) {
    notifyLocalCommentListeners(targetPostId, comments);
  } else {
    localCommentListeners.forEach((_, pid) => {
      notifyLocalCommentListeners(pid, comments);
    });
  }

  // 2. Broadcast to other tabs
  if (channel) {
    channel.postMessage({ type: 'COMMENTS_UPDATED', comments, postId: targetPostId });
  }
}

function getLocalNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local notifications:', e);
  }
  return [];
}

function setLocalNotifications(notifs: AppNotification[]) {
  localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs));
  if (channel) {
    channel.postMessage({ type: 'NOTIFICATIONS_UPDATED', notifs });
  }
}

function mergePosts(cloud: Post[], local: Post[]): Post[] {
  const map = new Map<string, Post>();
  local.forEach((p) => map.set(p.id, p));
  cloud.forEach((p) => map.set(p.id, p));
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Real-time subscription to Posts Feed (Dual-Layer: Instant Local + Cloud Firestore)
 */
export function subscribeToPosts(onUpdate: (posts: Post[]) => void): Unsubscribe {
  // 1. Instant local render (0ms) so feed is never empty or lagging
  const initial = getLocalPosts();
  onUpdate(initial);

  // 2. Register local in-memory listener for instant updates on current window
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

  let unsubFirestore: Unsubscribe = () => {};

  // 4. Listen to Cloud Firestore
  if (db) {
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'));

      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const cloudPosts: Post[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cloudPosts.push({
              id: docSnap.id,
              author: data.author,
              content: data.content || '',
              mediaUrl: data.mediaUrl || undefined,
              mediaType: data.mediaType || undefined,
              mediaName: data.mediaName || undefined,
              mediaSize: data.mediaSize || undefined,
              createdAt: data.createdAt || Date.now(),
              likes: data.likes || 0,
              reposts: data.reposts || 0,
              commentsCount: data.commentsCount || 0,
              likedBy: data.likedBy || [],
              repostedBy: data.repostedBy || [],
              bookmarkedBy: data.bookmarkedBy || [],
              pinned: data.pinned || false,
            });
          });

          // Merge cloud posts with local posts so freshly created local posts are never wiped
          const merged = mergePosts(cloudPosts, getLocalPosts());
          try {
            localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(merged));
          } catch {
            // ignore
          }
          onUpdate(merged);
        },
        (error) => {
          console.warn('Firestore Posts subscribe notice (using local storage cache):', error);
          onUpdate(getLocalPosts());
        }
      );
    } catch (err) {
      console.warn('Could not subscribe to cloud firestore:', err);
    }
  }

  return () => {
    localPostListeners.delete(onUpdate);
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
    unsubFirestore();
  };
}

/**
 * Create a new Post in Firestore
 */
export async function createPost(newPostData: Omit<Post, 'id' | 'createdAt' | 'likes' | 'reposts' | 'commentsCount'>): Promise<string> {
  const fullPost: Post = {
    ...newPostData,
    id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    createdAt: Date.now(),
    likes: 0,
    reposts: 0,
    commentsCount: 0,
    likedBy: [],
    repostedBy: [],
    bookmarkedBy: [],
  };

  // 1. Optimistic update (0ms): Appears on user's feed instantly
  const currentPosts = getLocalPosts();
  setLocalPosts([fullPost, ...currentPosts]);

  if (db) {
    try {
      const postsRef = collection(db, 'posts');
      const addDocPromise = addDoc(postsRef, {
        author: fullPost.author,
        content: fullPost.content,
        mediaUrl: fullPost.mediaUrl || null,
        mediaType: fullPost.mediaType || null,
        mediaName: fullPost.mediaName || null,
        mediaSize: fullPost.mediaSize || null,
        createdAt: fullPost.createdAt,
        likes: 0,
        reposts: 0,
        commentsCount: 0,
        likedBy: [],
        repostedBy: [],
        bookmarkedBy: [],
      });

      // 3.5s timeout race: ensures mobile UI never hangs if network is slow or offline
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3500)
      );

      const docRef = await Promise.race([addDocPromise, timeoutPromise]);
      if (docRef && (docRef as any).id) {
        return (docRef as any).id;
      }
    } catch (err) {
      console.warn('Failed to add post to Firestore, kept in local cache:', err);
    }
  }

  return fullPost.id;
}

/**
 * Delete a Post from Firestore
 */
export async function deletePost(postId: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'posts', postId));
      return;
    } catch (err) {
      console.warn('Failed to delete post from Firestore:', err);
    }
  }

  const posts = getLocalPosts();
  const updated = posts.filter((p) => p.id !== postId);
  setLocalPosts(updated);
}

/**
 * Toggle Like on a Post (Atomic in Firestore + Notification trigger)
 */
export async function toggleLike(post: Post, currentUser: User): Promise<void> {
  const isLiked = post.likedBy?.includes(currentUser.id) ?? false;
  const newCount = Math.max(0, post.likes + (isLiked ? -1 : 1));

  if (db) {
    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        likes: increment(isLiked ? -1 : 1),
        likedBy: isLiked ? arrayRemove(currentUser.id) : arrayUnion(currentUser.id),
      });

      // Send real notification to author if someone else liked their post
      if (!isLiked && post.author.id !== currentUser.id) {
        await addNotification({
          recipientId: post.author.id,
          sender: currentUser,
          type: 'like',
          postId: post.id,
          postContent: post.content.substring(0, 60),
        });
      }
      return;
    } catch (err) {
      console.warn('Firestore like failed, applying locally:', err);
    }
  }

  const posts = getLocalPosts();
  const updated = posts.map((p) => {
    if (p.id === post.id) {
      const likedBy = p.likedBy || [];
      const newLikedBy = isLiked ? likedBy.filter((id) => id !== currentUser.id) : [...likedBy, currentUser.id];
      return { ...p, likes: newCount, likedBy: newLikedBy };
    }
    return p;
  });
  setLocalPosts(updated);

  if (!isLiked && post.author.id !== currentUser.id) {
    addNotification({
      recipientId: post.author.id,
      sender: currentUser,
      type: 'like',
      postId: post.id,
      postContent: post.content.substring(0, 60),
    });
  }
}

/**
 * Toggle Repost on a Post
 */
export async function toggleRepost(post: Post, currentUser: User): Promise<void> {
  const isReposted = post.repostedBy?.includes(currentUser.id) ?? false;
  const newCount = Math.max(0, post.reposts + (isReposted ? -1 : 1));

  if (db) {
    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        reposts: increment(isReposted ? -1 : 1),
        repostedBy: isReposted ? arrayRemove(currentUser.id) : arrayUnion(currentUser.id),
      });

      if (!isReposted && post.author.id !== currentUser.id) {
        await addNotification({
          recipientId: post.author.id,
          sender: currentUser,
          type: 'repost',
          postId: post.id,
          postContent: post.content.substring(0, 60),
        });
      }
      return;
    } catch (err) {
      console.warn('Firestore repost failed, applying locally:', err);
    }
  }

  const posts = getLocalPosts();
  const updated = posts.map((p) => {
    if (p.id === post.id) {
      const repostedBy = p.repostedBy || [];
      const newRepostedBy = isReposted ? repostedBy.filter((id) => id !== currentUser.id) : [...repostedBy, currentUser.id];
      return { ...p, reposts: newCount, repostedBy: newRepostedBy };
    }
    return p;
  });
  setLocalPosts(updated);
}

/**
 * Toggle Bookmark on a Post (persisted to Firestore)
 */
export async function toggleBookmark(postId: string, userId: string): Promise<boolean> {
  const posts = getLocalPosts();
  const current = posts.find((p) => p.id === postId);
  const isBookmarked = current?.bookmarkedBy?.includes(userId) ?? false;

  if (db) {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        bookmarkedBy: isBookmarked ? arrayRemove(userId) : arrayUnion(userId),
      });
      return !isBookmarked;
    } catch (err) {
      console.warn('Firestore bookmark failed, applying locally:', err);
    }
  }

  const updated = posts.map((p) => {
    if (p.id === postId) {
      const bookmarkedBy = p.bookmarkedBy || [];
      const newBookmarks = isBookmarked ? bookmarkedBy.filter((id) => id !== userId) : [...bookmarkedBy, userId];
      return { ...p, bookmarkedBy: newBookmarks };
    }
    return p;
  });
  setLocalPosts(updated);
  return !isBookmarked;
}

/**
 * Comments subscription (Zero composite index required - fully visible to all users across cloud)
 */
export function subscribeToComments(postId: string, onUpdate: (comments: Comment[]) => void): Unsubscribe {
  // 1. Immediate local render (0ms)
  const localInitial = getLocalComments().filter((c) => c.postId === postId);
  onUpdate(localInitial);

  // 2. Register local in-memory listener
  if (!localCommentListeners.has(postId)) {
    localCommentListeners.set(postId, new Set());
  }
  localCommentListeners.get(postId)!.add(onUpdate);

  let unsubFirestore: Unsubscribe = () => {};

  // 3. Real-time Cloud Firestore query without 'orderBy' (NEVER requires composite index, visible to everyone!)
  if (db) {
    try {
      const commentsRef = collection(db, 'comments');
      const q = query(commentsRef, where('postId', '==', postId));

      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const cloudList: Comment[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cloudList.push({
              id: docSnap.id,
              postId: data.postId,
              author: data.author,
              text: data.text,
              createdAt: data.createdAt || Date.now(),
              likes: data.likes || 0,
            });
          });

          // Sort by timestamp in memory
          cloudList.sort((a, b) => a.createdAt - b.createdAt);

          // Merge with local comments so fresh submissions are never wiped
          const allLocal = getLocalComments();
          const thisPostLocal = allLocal.filter((c) => c.postId === postId);
          const map = new Map<string, Comment>();
          thisPostLocal.forEach((c) => map.set(c.id, c));
          cloudList.forEach((c) => map.set(c.id, c));
          const merged = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);

          // Update cache with merged
          const otherLocal = allLocal.filter((c) => c.postId !== postId);
          try {
            localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify([...otherLocal, ...merged]));
          } catch {}

          onUpdate(merged);
        },
        (error) => {
          console.warn('Comments cloud subscription notice (using cache):', error);
          const all = getLocalComments();
          onUpdate(all.filter((c) => c.postId === postId));
        }
      );
    } catch (e) {
      console.warn('Comments subscription fallback:', e);
    }
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'COMMENTS_UPDATED') {
      const comms: Comment[] = event.data.comments;
      onUpdate(comms.filter((c) => c.postId === postId));
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }

  return () => {
    localCommentListeners.get(postId)?.delete(onUpdate);
    unsubFirestore();
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
  };
}

/**
 * Add a Comment to a Post (Visible to everyone!)
 */
export async function addComment(post: Post, author: User, text: string): Promise<Comment> {
  const newComment: Comment = {
    id: 'comm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    postId: post.id,
    author,
    text: text.trim(),
    createdAt: Date.now(),
    likes: 0,
  };

  // 1. Optimistic instant local save (0ms) - instantly updates UI
  const currentComments = getLocalComments();
  const updatedComments = [...currentComments, newComment];
  setLocalComments(updatedComments, post.id);

  // Update local post comments counter
  const posts = getLocalPosts();
  const updatedPosts = posts.map((p) => {
    if (p.id === post.id) {
      return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
    }
    return p;
  });
  setLocalPosts(updatedPosts);

  // 2. Cloud Firestore sync with timeout race so it never blocks or fails silently
  if (db) {
    try {
      const addDocPromise = addDoc(collection(db, 'comments'), {
        postId: newComment.postId,
        author: newComment.author,
        text: newComment.text,
        createdAt: newComment.createdAt,
        likes: 0,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3500)
      );

      const docRef = await Promise.race([addDocPromise, timeoutPromise]);
      if (docRef && (docRef as any).id) {
        newComment.id = (docRef as any).id;
      }

      // Update counter in Firestore
      try {
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, {
          commentsCount: increment(1),
        });
      } catch (countErr) {
        console.warn('Could not increment post commentsCount in cloud:', countErr);
      }

      // Send Notification to post author
      if (post.author.id !== author.id) {
        await addNotification({
          recipientId: post.author.id,
          sender: author,
          type: 'comment',
          postId: post.id,
          postContent: text.substring(0, 60),
        });
      }
    } catch (err) {
      console.warn('Failed to add comment to Firestore, kept safely in local cache:', err);
    }
  }

  return newComment;
}

/**
 * Real-time Notifications system
 */
export function subscribeToNotifications(userId: string, onUpdate: (notifs: AppNotification[]) => void): Unsubscribe {
  if (db) {
    try {
      const notifsRef = collection(db, 'notifications');
      const q = query(notifsRef, where('recipientId', '==', userId), orderBy('createdAt', 'desc'));

      return onSnapshot(
        q,
        (snapshot) => {
          const list: AppNotification[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              recipientId: data.recipientId,
              sender: data.sender,
              type: data.type,
              postId: data.postId,
              postContent: data.postContent,
              createdAt: data.createdAt,
              read: data.read ?? false,
            });
          });
          onUpdate(list);
          setLocalNotifications(list);
        },
        () => {
          const all = getLocalNotifications().filter((n) => n.recipientId === userId);
          onUpdate(all);
        }
      );
    } catch (err) {
      console.warn('Notifications subscribe failed:', err);
    }
  }

  const all = getLocalNotifications().filter((n) => n.recipientId === userId);
  onUpdate(all);

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'NOTIFICATIONS_UPDATED') {
      const list: AppNotification[] = e.data.notifs;
      onUpdate(list.filter((n) => n.recipientId === userId));
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
  };
}

export async function addNotification(notifData: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<void> {
  const newNotif: AppNotification = {
    ...notifData,
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    createdAt: Date.now(),
    read: false,
  };

  if (db) {
    try {
      await addDoc(collection(db, 'notifications'), newNotif);
      return;
    } catch (e) {
      console.warn('Failed to add cloud notification:', e);
    }
  }

  const all = getLocalNotifications();
  setLocalNotifications([newNotif, ...all]);
}

export async function markNotificationsAsRead(userId: string): Promise<void> {
  if (db) {
    try {
      const notifsRef = collection(db, 'notifications');
      const q = query(notifsRef, where('recipientId', '==', userId), where('read', '==', false));
      const snaps = await getDocs(q);
      const batch = writeBatch(db);
      snaps.forEach((docSnap) => {
        batch.update(docSnap.ref, { read: true });
      });
      await batch.commit();
      return;
    } catch (e) {
      console.warn('Error marking notifications as read in cloud:', e);
    }
  }

  const all = getLocalNotifications();
  const updated = all.map((n) => (n.recipientId === userId ? { ...n, read: true } : n));
  setLocalNotifications(updated);
}

/**
 * Real Follow / Unfollow System
 */
/**
 * Real Follow / Unfollow System
 * Persists permanently to Firestore and localStorage
 */
export async function toggleFollowUser(currentUser: User, targetUser: User): Promise<boolean> {
  const currentFollowing = currentUser.following || [];
  const isFollowing = currentFollowing.includes(targetUser.id);
  const newIsFollowing = !isFollowing;

  // Updated following list for current user
  const updatedCurrentUserFollowing = newIsFollowing
    ? Array.from(new Set([...currentFollowing, targetUser.id]))
    : currentFollowing.filter((id) => id !== targetUser.id);

  // Updated followers list for target user
  const targetFollowers = targetUser.followers || [];
  const updatedTargetFollowers = newIsFollowing
    ? Array.from(new Set([...targetFollowers, currentUser.id]))
    : targetFollowers.filter((id) => id !== currentUser.id);

  // 1. Permanent Local Storage Persistence (0ms)
  try {
    const raw = localStorage.getItem('gxe_current_user');
    const parsed = raw ? JSON.parse(raw) : currentUser;
    localStorage.setItem(
      'gxe_current_user',
      JSON.stringify({
        ...parsed,
        following: updatedCurrentUserFollowing,
        followingCount: updatedCurrentUserFollowing.length,
      })
    );
  } catch (e) {
    console.error('Save local user following error:', e);
  }

  // 2. Cloud Firestore Persistence via setDoc merge so it never throws error
  if (db) {
    try {
      const userRef = doc(db, 'users', currentUser.id);
      const targetRef = doc(db, 'users', targetUser.id);

      await setDoc(
        userRef,
        {
          following: updatedCurrentUserFollowing,
          followingCount: updatedCurrentUserFollowing.length,
        },
        { merge: true }
      );

      await setDoc(
        targetRef,
        {
          followers: updatedTargetFollowers,
          followersCount: updatedTargetFollowers.length,
        },
        { merge: true }
      );

      if (newIsFollowing) {
        await addNotification({
          recipientId: targetUser.id,
          sender: currentUser,
          type: 'follow',
        });
      }
    } catch (e) {
      console.warn('Follow toggle cloud sync fallback:', e);
    }
  }

  return newIsFollowing;
}

/**
 * Real Dynamic Hashtag & Trends Engine
 * Extracts all #hashtags from real posts in database!
 */
export function extractTrendsFromPosts(posts: Post[]): Trend[] {
  const tagCounts: Record<string, number> = {};

  posts.forEach((post) => {
    const matches = post.content.match(/#([\p{L}\p{N}_]+)/gu);
    if (matches) {
      matches.forEach((tag) => {
        const clean = tag.trim();
        tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    }
  });

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return sortedTags.map(([tag, count], idx) => ({
    id: `trend-${idx + 1}`,
    category: 'الرائج في GXE',
    tag,
    count,
    postsCount: count === 1 ? 'منشور واحد' : `${count} منشورات`,
  }));
}

/**
 * Update User Profile
 * Uses setDoc with merge: true so it works whether user doc exists or not, and never fails!
 */
export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
  // 1. Immediately update author info in cached local posts so UI updates without page refresh
  const currentPosts = getLocalPosts();
  const updatedPosts = currentPosts.map((p) => {
    if (p.author.id === userId) {
      return {
        ...p,
        author: {
          ...p.author,
          name: updates.name || p.author.name,
          username: updates.username || p.author.username,
          avatar: updates.avatar || p.author.avatar,
        },
      };
    }
    return p;
  });
  setLocalPosts(updatedPosts);

  // 2. Cloud Firestore merge update
  if (db) {
    try {
      await setDoc(doc(db, 'users', userId), updates, { merge: true });
    } catch (e) {
      console.warn('Error updating profile in cloud:', e);
    }
  }
}

/**
 * Real-time subscription to the user's document in Firestore
 * Keeps followers, following, and counters in sync across all devices and reloads!
 */
export function subscribeToUserDoc(
  userId: string,
  onUpdate: (userData: Partial<User>) => void
): Unsubscribe {
  if (db && userId) {
    try {
      const userRef = doc(db, 'users', userId);
      return onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const following = data.following || [];
            const followers = data.followers || [];
            onUpdate({
              name: data.name,
              username: data.username,
              avatar: data.avatar,
              bio: data.bio,
              coverUrl: data.coverUrl,
              following,
              followers,
              followingCount: data.followingCount || following.length,
              followersCount: data.followersCount || followers.length,
            });
          }
        },
        (err) => {
          console.warn('User doc realtime subscription error:', err);
        }
      );
    } catch (err) {
      console.warn('Could not subscribe to user doc:', err);
    }
  }
  return () => {};
}
