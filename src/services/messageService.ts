import {
  collection,
  onSnapshot,
  addDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { DirectMessage, User, Post } from '../types';
import { addNotification } from './dbService';

const BROADCAST_MSG_CHANNEL = 'gxe_messages_realtime_v2';

const channel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(BROADCAST_MSG_CHANNEL)
    : null;

/**
 * Generate a deterministic Chat ID between any two users
 * Always sorts IDs alphabetically so user1->user2 and user2->user1 produce the same ID
 */
export function getChatId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) return 'general_chat';
  return [uid1, uid2].sort().join('___');
}

/**
 * Helper to get local storage key for a specific chat
 */
function getLocalChatKey(chatId: string): string {
  return `gxe_chat_${chatId}`;
}

/**
 * In-memory listeners for active chats in the current window / mobile screen
 */
const localChatListeners = new Map<string, Set<(messages: DirectMessage[]) => void>>();

function notifyLocalChatListeners(chatId: string, messages: DirectMessage[]) {
  const listeners = localChatListeners.get(chatId);
  if (listeners) {
    listeners.forEach((listener) => {
      try {
        listener(messages);
      } catch (e) {
        console.warn('Local chat listener callback error:', e);
      }
    });
  }
}

/**
 * Get cached messages for a specific chat
 */
export function getLocalChatMessages(chatId: string): DirectMessage[] {
  try {
    const raw = localStorage.getItem(getLocalChatKey(chatId));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local chat messages', e);
  }
  return [];
}

/**
 * Save cached messages for a specific chat and notify all listeners
 */
export function setLocalChatMessages(chatId: string, messages: DirectMessage[]) {
  try {
    localStorage.setItem(getLocalChatKey(chatId), JSON.stringify(messages));
  } catch (e) {
    console.warn('Error saving local chat messages', e);
  }

  // 1. Instantly notify current window / mobile screen listeners (0ms)
  notifyLocalChatListeners(chatId, messages);

  // 2. Broadcast to other open tabs or windows
  if (channel) {
    channel.postMessage({
      type: 'NEW_CHAT_MESSAGE',
      chatId,
      messages,
    });
  }
}

/**
 * Send a Direct Message
 * Optimistic-first: commits to local memory & storage instantly (0ms), then syncs to cloud
 */
export async function sendDirectMessage(
  sender: User | string,
  receiverId: string,
  text: string,
  mediaUrl?: string
): Promise<DirectMessage> {
  const senderId = typeof sender === 'string' ? sender : sender.id;
  const chatId = getChatId(senderId, receiverId);
  const now = Date.now();

  const newMsg: DirectMessage = {
    id: 'msg_' + now + '_' + Math.random().toString(36).substring(2, 7),
    senderId,
    receiverId,
    participants: [senderId, receiverId].sort(),
    text: text.trim(),
    mediaUrl,
    createdAt: now,
    read: false,
  };

  // 1. Optimistic instant local save (0ms) - ALWAYS succeeds and shows immediately in chat
  const current = getLocalChatMessages(chatId);
  const updated = [...current.filter((m) => m.id !== newMsg.id), newMsg];
  setLocalChatMessages(chatId, updated);

  // 2. Background cloud sync with 3.5s timeout race so mobile UI NEVER hangs or crashes
  if (db) {
    try {
      const chatMessagesRef = collection(db, 'chats', chatId, 'messages');
      const addDocPromise = addDoc(chatMessagesRef, {
        senderId,
        receiverId,
        participants: [senderId, receiverId].sort(),
        text: text.trim(),
        mediaUrl: mediaUrl || null,
        createdAt: now,
        read: false,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3500)
      );

      const docRef = await Promise.race([addDocPromise, timeoutPromise]);
      if (docRef && (docRef as any).id) {
        newMsg.id = (docRef as any).id;
      }
    } catch (err: any) {
      console.warn('Firestore direct message sync notice (saved locally):', err);
      // DO NOT THROW! Message is safely preserved in local storage and active screen
    }
  }

  // 3. Trigger push/in-app notification for the recipient!
  try {
    const senderUser: User = typeof sender === 'string'
      ? {
          id: sender,
          name: 'عضو في GXE',
          username: 'user',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + sender,
          bio: '',
          createdAt: Date.now(),
          following: [],
          followers: [],
          followingCount: 0,
          followersCount: 0,
        }
      : sender;

    await addNotification({
      recipientId: receiverId,
      sender: senderUser,
      type: 'message',
      postContent: text.trim() || '📷 أرسل لك صورة أو ملف',
    });
  } catch (notifErr) {
    console.warn('Could not dispatch message notification:', notifErr);
  }

  return newMsg;
}

/**
 * Subscribe to messages between two users in real-time
 * Dual-Layer: Instant Local Cache + In-Memory Listener + Cloud Firestore Subscription
 */
export function subscribeToChat(
  currentUserId: string,
  otherUserId: string,
  onUpdate: (messages: DirectMessage[]) => void,
  onError?: (errMessage: string) => void
): Unsubscribe {
  const chatId = getChatId(currentUserId, otherUserId);

  // 1. Initial render from local cache (0ms)
  const cachedMessages = getLocalChatMessages(chatId);
  onUpdate(cachedMessages);

  // 2. Register local in-memory listener for instant same-window updates
  if (!localChatListeners.has(chatId)) {
    localChatListeners.set(chatId, new Set());
  }
  localChatListeners.get(chatId)!.add(onUpdate);

  let unsubFirestore: Unsubscribe = () => {};

  // 3. Real-time Firestore Subscription (NO composite index needed)
  if (db) {
    try {
      const chatMessagesRef = collection(db, 'chats', chatId, 'messages');

      unsubFirestore = onSnapshot(
        chatMessagesRef,
        (snapshot) => {
          const list: DirectMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const createdAt =
              typeof data.createdAt === 'number'
                ? data.createdAt
                : data.createdAt?.seconds
                ? data.createdAt.seconds * 1000
                : Date.now();

            list.push({
              id: docSnap.id,
              senderId: data.senderId,
              receiverId: data.receiverId,
              participants: data.participants || [currentUserId, otherUserId],
              text: data.text || '',
              mediaUrl: data.mediaUrl || undefined,
              createdAt,
              read: !!data.read,
            });
          });

          // Merge cloud messages with local cached messages so optimistic messages are never wiped
          const localMsgs = getLocalChatMessages(chatId);
          const map = new Map<string, DirectMessage>();
          localMsgs.forEach((m) => map.set(m.id, m));
          list.forEach((m) => map.set(m.id, m));
          const merged = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);

          // Update cache
          try {
            localStorage.setItem(getLocalChatKey(chatId), JSON.stringify(merged));
          } catch {
            // ignore
          }
          onUpdate(merged);
        },
        (err) => {
          console.warn('Firestore messages subscription notice (retaining cache):', err);
          if (err.code === 'permission-denied' && onError) {
            onError('Firestore rules notice: using high-speed local persistence');
          }
          onUpdate(getLocalChatMessages(chatId));
        }
      );
    } catch (err: any) {
      console.warn('Error setting up Firestore messages listener:', err);
    }
  }

  // 4. Multi-tab BroadcastChannel listener
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'NEW_CHAT_MESSAGE' && event.data?.chatId === chatId) {
      const msgs: DirectMessage[] = event.data.messages || [event.data.message];
      const local = getLocalChatMessages(chatId);
      const map = new Map<string, DirectMessage>();
      local.forEach((m) => map.set(m.id, m));
      msgs.forEach((m) => map.set(m.id, m));
      const merged = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
      onUpdate(merged);
    }
  };

  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  return () => {
    localChatListeners.get(chatId)?.delete(onUpdate);
    unsubFirestore();
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
    }
  };
}

/**
 * Harvest known users from local storage cache AND post authors so member list is never blank
 */
function getKnownCommunityUsers(): User[] {
  const usersMap = new Map<string, User>();

  try {
    const cached = localStorage.getItem('gxe_community_users_cache');
    if (cached) {
      const list: User[] = JSON.parse(cached);
      list.forEach((u) => {
        if (u && u.id) usersMap.set(u.id, u);
      });
    }
  } catch {}

  try {
    const rawPosts = localStorage.getItem('gxe_real_posts');
    if (rawPosts) {
      const posts: Post[] = JSON.parse(rawPosts);
      posts.forEach((p) => {
        if (p.author && p.author.id && !usersMap.has(p.author.id)) {
          usersMap.set(p.author.id, p.author);
        }
      });
    }
  } catch {}

  return Array.from(usersMap.values());
}

/**
 * Subscribe to all registered community members in real-time
 */
export function subscribeToCommunityUsers(onUpdate: (users: User[]) => void): Unsubscribe {
  // 1. Initial instant load from cache & post authors (0ms)
  const initial = getKnownCommunityUsers();
  onUpdate(initial);

  if (db) {
    try {
      const usersRef = collection(db, 'users');
      return onSnapshot(
        usersRef,
        (snapshot) => {
          const list: User[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              name: data.name || 'مستخدم GXE',
              username: data.username || `user_${d.id.substring(0, 5)}`,
              avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.id}`,
              bio: data.bio || '',
              coverUrl: data.coverUrl || undefined,
              email: data.email || undefined,
              verified: !!data.verified,
              isOnline: !!data.isOnline,
              createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
              following: data.following || [],
              followers: data.followers || [],
              followingCount: data.followingCount || (data.following?.length || 0),
              followersCount: data.followersCount || (data.followers?.length || 0),
            });
          });

          // Merge with known local authors
          const mergedMap = new Map<string, User>();
          getKnownCommunityUsers().forEach((u) => mergedMap.set(u.id, u));
          list.forEach((u) => mergedMap.set(u.id, u));
          const mergedList = Array.from(mergedMap.values());

          try {
            localStorage.setItem('gxe_community_users_cache', JSON.stringify(mergedList));
          } catch {
            // ignore quota
          }
          onUpdate(mergedList);
        },
        (err) => {
          console.warn('Cloud users subscription notice (using local users):', err);
          onUpdate(getKnownCommunityUsers());
        }
      );
    } catch (e) {
      console.warn('Could not subscribe to cloud users:', e);
    }
  }

  return () => {};
}
