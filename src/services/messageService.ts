import {
  collection,
  onSnapshot,
  addDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { DirectMessage, User } from '../types';
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
 * Save cached messages for a specific chat
 */
export function setLocalChatMessages(chatId: string, messages: DirectMessage[]) {
  try {
    localStorage.setItem(getLocalChatKey(chatId), JSON.stringify(messages));
  } catch (e) {
    console.error('Error saving local chat messages', e);
  }
}

/**
 * Send a Direct Message
 * Saves to Firestore subcollection chats/{chatId}/messages for zero-index real-time sync
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

  if (db) {
    try {
      // Primary storage: subcollection chats/{chatId}/messages
      const chatMessagesRef = collection(db, 'chats', chatId, 'messages');
      const docRef = await addDoc(chatMessagesRef, {
        senderId,
        receiverId,
        participants: [senderId, receiverId].sort(),
        text: text.trim(),
        mediaUrl: mediaUrl || null,
        createdAt: now,
        read: false,
      });

      newMsg.id = docRef.id;
    } catch (err: any) {
      console.warn('Firestore direct message save error:', err);
      if (err?.code === 'permission-denied') {
        throw new Error('قواعد حماية Firestore مقفلة (allow read, write: if false;). يرجى نسخ قواعد الحماية ونشرها في Firebase Console.');
      }
    }
  }

  // Always update local cache for instant zero-latency UI
  const current = getLocalChatMessages(chatId);
  const updated = [...current.filter((m) => m.id !== newMsg.id), newMsg];
  setLocalChatMessages(chatId, updated);

  // Broadcast to other open tabs/windows on same device
  if (channel) {
    channel.postMessage({
      type: 'NEW_CHAT_MESSAGE',
      chatId,
      message: newMsg,
    });
  }

  // Trigger push/in-app notification for the recipient!
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
 * Uses subcollection chats/{chatId}/messages without ANY composite index!
 */
export function subscribeToChat(
  currentUserId: string,
  otherUserId: string,
  onUpdate: (messages: DirectMessage[]) => void,
  onError?: (errMessage: string) => void
): Unsubscribe {
  const chatId = getChatId(currentUserId, otherUserId);

  // 1. Initial render from local cache
  const cachedMessages = getLocalChatMessages(chatId);
  onUpdate(cachedMessages);

  let unsubFirestore: Unsubscribe = () => {};

  // 2. Real-time Firestore Subscription (NO 'where', NO 'orderBy', NEVER requires composite index!)
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

          // Sort in memory - 100% reliable, zero Firestore index needed!
          list.sort((a, b) => a.createdAt - b.createdAt);

          // Update cache
          setLocalChatMessages(chatId, list);
          onUpdate(list);
        },
        (err) => {
          console.warn('Firestore messages subscription error:', err);
          if (err.code === 'permission-denied') {
            if (onError) {
              onError('قواعد حماية Firestore مقفلة. يرجى تفعيل allow read, write: if true; في لوحة تحكم Firebase.');
            }
          }
          // On cloud error, retain local cached messages
          onUpdate(getLocalChatMessages(chatId));
        }
      );
    } catch (err: any) {
      console.warn('Error setting up Firestore messages listener:', err);
    }
  }

  // 3. Multi-tab BroadcastChannel listener for instant cross-tab testing
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'NEW_CHAT_MESSAGE' && event.data?.chatId === chatId) {
      const incoming = event.data.message as DirectMessage;
      const current = getLocalChatMessages(chatId);
      if (!current.some((m) => m.id === incoming.id)) {
        const merged = [...current, incoming].sort((a, b) => a.createdAt - b.createdAt);
        setLocalChatMessages(chatId, merged);
        onUpdate(merged);
      }
    }
  };

  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  return () => {
    unsubFirestore();
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
    }
  };
}

/**
 * Subscribe to all registered community members in real-time from Firestore
 */
export function subscribeToCommunityUsers(onUpdate: (users: User[]) => void): Unsubscribe {
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

          try {
            localStorage.setItem('gxe_community_users_cache', JSON.stringify(list));
          } catch {
            // ignore quota
          }
          onUpdate(list);
        },
        (err) => {
          console.warn('Cloud users subscription fallback:', err);
          try {
            const cached = localStorage.getItem('gxe_community_users_cache');
            if (cached) onUpdate(JSON.parse(cached));
          } catch {
            onUpdate([]);
          }
        }
      );
    } catch (e) {
      console.warn('Could not subscribe to cloud users:', e);
    }
  }

  onUpdate([]);
  return () => {};
}
