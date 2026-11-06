import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { DirectMessage, User } from '../types';

const LOCAL_MESSAGES_KEY = 'gxe_local_messages';
const BROADCAST_MSG_CHANNEL = 'gxe_messages_realtime';

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(BROADCAST_MSG_CHANNEL)
  : null;

function getLocalMessages(): DirectMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local messages', e);
  }
  return [];
}

function setLocalMessages(messages: DirectMessage[]) {
  localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
  if (channel) {
    channel.postMessage({ type: 'MESSAGES_UPDATED', messages });
  }
}

/**
 * Send a Direct Message
 */
export async function sendDirectMessage(
  senderId: string,
  receiverId: string,
  text: string,
  mediaUrl?: string
): Promise<DirectMessage> {
  const participants = [senderId, receiverId].sort();
  const newMsg: DirectMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    senderId,
    receiverId,
    participants,
    text: text.trim(),
    mediaUrl,
    createdAt: Date.now(),
    read: false,
  };

  if (db) {
    try {
      const messagesRef = collection(db, 'direct_messages');
      await addDoc(messagesRef, newMsg);
      return newMsg;
    } catch (e) {
      console.warn('Failed to add message to Firestore, storing locally:', e);
    }
  }

  const all = getLocalMessages();
  setLocalMessages([...all, newMsg]);
  return newMsg;
}

/**
 * Subscribe to messages between two users in real-time
 */
export function subscribeToChat(
  currentUserId: string,
  otherUserId: string,
  onUpdate: (messages: DirectMessage[]) => void
): Unsubscribe {
  if (db) {
    try {
      const messagesRef = collection(db, 'direct_messages');
      const q = query(
        messagesRef,
        where('participants', '==', [currentUserId, otherUserId].sort()),
        orderBy('createdAt', 'asc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const list: DirectMessage[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<DirectMessage, 'id'>) });
          });
          onUpdate(list);
        },
        (err) => {
          console.warn('Firestore messages subscription fallback to local:', err);
          const all = getLocalMessages().filter((m) =>
            m.participants.includes(currentUserId) && m.participants.includes(otherUserId)
          );
          onUpdate(all);
        }
      );
    } catch (err) {
      console.warn('Error querying Firestore messages:', err);
    }
  }

  // Local fallback
  const getFiltered = () =>
    getLocalMessages().filter((m) =>
      m.participants.includes(currentUserId) && m.participants.includes(otherUserId)
    );

  onUpdate(getFiltered());

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'MESSAGES_UPDATED') {
      onUpdate(getFiltered());
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
            list.push({ id: d.id, ...(d.data() as Omit<User, 'id'>) });
          });
          onUpdate(list);
        },
        () => onUpdate([])
      );
    } catch (e) {
      console.warn('Could not subscribe to cloud users:', e);
    }
  }

  onUpdate([]);
  return () => {};
}
