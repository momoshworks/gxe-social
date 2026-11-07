export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  coverUrl?: string;
  email?: string;
  verified?: boolean;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  following?: string[]; // IDs of users this user follows
  followers?: string[]; // IDs of users following this user
  createdAt?: number;
  isOnline?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: User;
  text: string;
  createdAt: number;
  likes: number;
  likedBy?: string[];
}

export interface Post {
  id: string;
  author: User;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  mediaName?: string;
  mediaSize?: string;
  createdAt: number;
  likes: number;
  reposts: number;
  commentsCount: number;
  likedBy?: string[]; // user IDs
  repostedBy?: string[]; // user IDs
  bookmarkedBy?: string[];
  pinned?: boolean;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  participants: string[]; // [id1, id2] sorted
  text: string;
  mediaUrl?: string;
  createdAt: number;
  read?: boolean;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  userId?: string;
  sender: User;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'message';
  postId?: string;
  postContent?: string;
  content?: string;
  createdAt: number;
  read: boolean;
}

export interface Trend {
  id: string;
  category: string;
  tag: string;
  postsCount: string;
  count: number;
}

export type Unsubscribe = () => void;

export interface CloudflareConfig {
  workerUrl: string;
  databaseName: string;
  region: string;
}

// Deprecated alias for backwards compatibility
export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}
