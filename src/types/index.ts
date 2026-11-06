export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified?: boolean;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
}

export interface Comment {
  id: string;
  postId: string;
  author: User;
  text: string;
  createdAt: number;
  likes: number;
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

export interface Trend {
  id: string;
  category: string;
  tag: string;
  postsCount: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
