import type { DirectMessage, User, Post, Unsubscribe } from '../types';
import { addNotification } from './dbService';
import { apiFetch } from './cloudflare';

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

function getLocalChatKey(chatId: string): string {
  return `gxe_chat_${chatId}`;
}

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

export function getLocalChatMessages(chatId: string): DirectMessage[] {
  try {
    const raw = localStorage.getItem(getLocalChatKey(chatId));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local chat messages', e);
  }
  return [];
}

export function setLocalChatMessages(chatId: string, messages: DirectMessage[]) {
  try {
    localStorage.setItem(getLocalChatKey(chatId), JSON.stringify(messages));
  } catch (e) {
    console.warn('Error saving local chat messages', e);
  }

  notifyLocalChatListeners(chatId, messages);

  if (channel) {
    channel.postMessage({
      type: 'NEW_CHAT_MESSAGE',
      chatId,
      messages,
    });
  }
}

if (channel) {
  channel.onmessage = (event) => {
    if (event.data?.type === 'NEW_CHAT_MESSAGE' && event.data.chatId) {
      notifyLocalChatListeners(event.data.chatId, event.data.messages);
    }
  };
}

/**
 * Send a Direct Message (0ms Instant Local + Cloudflare D1 Background Sync)
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

  const senderUser: User =
    typeof sender === 'string'
      ? {
          id: sender,
          name: 'مستخدم GXE',
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

  // 1. Optimistic instant local save (0ms)
  const current = getLocalChatMessages(chatId);
  const updated = [...current.filter((m) => m.id !== newMsg.id), newMsg];
  setLocalChatMessages(chatId, updated);

  // 2. Cloudflare D1 background sync
  try {
    await apiFetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        id: newMsg.id,
        chatId,
        senderId,
        receiverId,
        senderName: senderUser.name,
        senderAvatar: senderUser.avatar,
        text: text.trim(),
        mediaUrl: mediaUrl || null,
        createdAt: now,
      }),
    });
  } catch (err) {
    console.warn('Cloudflare direct message sync notice:', err);
  }

  // 3. Dispatch notification
  try {
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
 */
export function subscribeToChat(
  currentUserId: string,
  otherUserId: string,
  onUpdate: (messages: DirectMessage[]) => void,
  _onError?: (errMessage: string) => void
): Unsubscribe {
  const chatId = getChatId(currentUserId, otherUserId);

  // 1. Initial render from local cache (0ms)
  const cachedMessages = getLocalChatMessages(chatId);
  onUpdate(cachedMessages);

  // 2. Register local listener
  if (!localChatListeners.has(chatId)) {
    localChatListeners.set(chatId, new Set());
  }
  localChatListeners.get(chatId)!.add(onUpdate);

  let isSubscribed = true;

  // 3. Fetch from Cloudflare D1
  const fetchCloudMessages = async () => {
    if (!isSubscribed) return;
    try {
      const cloudMsgs = await apiFetch<DirectMessage[]>(`/api/messages/${chatId}`);
      if (Array.isArray(cloudMsgs) && isSubscribed) {
        // Merge with local messages
        const local = getLocalChatMessages(chatId);
        const map = new Map<string, DirectMessage>();
        cloudMsgs.forEach((m) => map.set(m.id, m));
        local.forEach((m) => {
          if (!map.has(m.id)) map.set(m.id, m);
        });
        const merged = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
        setLocalChatMessages(chatId, merged);
        onUpdate(merged);
      }
    } catch (err) {
      console.warn('Cloudflare chat sync notice:', err);
    }
  };

  fetchCloudMessages();

  // Poll chat messages every 2.5 seconds
  const intervalId = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchCloudMessages();
    }
  }, 2500);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
    const listeners = localChatListeners.get(chatId);
    if (listeners) {
      listeners.delete(onUpdate);
      if (listeners.size === 0) localChatListeners.delete(chatId);
    }
  };
}

/**
 * Harvest known users from local storage cache AND post authors so member list is never blank
 */
export function getKnownCommunityUsers(): User[] {
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
  const initial = getKnownCommunityUsers();
  onUpdate(initial);

  let isSubscribed = true;

  const fetchUsers = async () => {
    if (!isSubscribed) return;
    try {
      const cloudUsers = await apiFetch<User[]>('/api/users');
      if (Array.isArray(cloudUsers) && isSubscribed) {
        const mergedMap = new Map<string, User>();
        getKnownCommunityUsers().forEach((u) => mergedMap.set(u.id, u));
        cloudUsers.forEach((u) => mergedMap.set(u.id, u));
        const mergedList = Array.from(mergedMap.values());
        try {
          localStorage.setItem('gxe_community_users_cache', JSON.stringify(mergedList));
        } catch {}
        onUpdate(mergedList);
      }
    } catch (err) {
      console.warn('Cloudflare community users sync notice:', err);
    }
  };

  fetchUsers();

  const intervalId = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchUsers();
    }
  }, 5000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
  };
}
