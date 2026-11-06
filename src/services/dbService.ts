import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  where,
  increment,
  arrayUnion,
  arrayRemove,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Post, Comment, User } from '../types';

const LOCAL_POSTS_KEY = 'x_social_local_posts';
const LOCAL_COMMENTS_KEY = 'x_social_local_comments';
const BROADCAST_CHANNEL = 'x_social_realtime_bus';

// BroadcastChannel for instant cross-tab real-time sync when offline / demo mode
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(BROADCAST_CHANNEL)
  : null;

// Initial high-quality starter posts
const INITIAL_DEMO_POSTS: Post[] = [
  {
    id: 'demo-1',
    author: {
      id: 'user-tech-lead',
      name: 'أحمد محمود',
      username: 'ahmed_dev',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      verified: true,
      bio: 'مهندس برمجيات ومطور سحابي | شغوف بالذكاء الاصطناعي و React',
    },
    content: 'أهلاً بكم في المنصة الجديدة! 🔥 تم إطلاق التطبيق بدعم كامل للتحديثات اللحظية (Real-time)، ورفع وتحميل الصور والوسائط مباشرة، وقاعدة بيانات سحابية مجانية ودائمة 🚀✨\n\nما رأيكم في واجهة X الداكنة؟ شاركونا تجربتكم! 👇 #تطوير #تقنية #برمجة',
    mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    mediaType: 'image',
    mediaName: 'modern_abstract_wave.jpg',
    mediaSize: '420 KB',
    createdAt: Date.now() - 1000 * 60 * 15, // 15 mins ago
    likes: 42,
    reposts: 12,
    commentsCount: 3,
    likedBy: [],
    repostedBy: [],
    bookmarkedBy: [],
    pinned: true,
  },
  {
    id: 'demo-2',
    author: {
      id: 'user-designer',
      name: 'سارة القحطاني',
      username: 'sara_uiux',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      verified: true,
      bio: 'مصممة واجهات وتجربة مستخدم (UI/UX) 🎨',
    },
    content: 'التفاصيل الصغيرة هي التي تصنع الفرق دائماً! التناسق بين اللون الأسود الخالص والحدود الرمادية الناعمة (#2f3336) مع لمسات الأزرق (#1d9bf0) يعطي راحة بصرية فائقة أثناء التصفح الليلي 🖤💻',
    createdAt: Date.now() - 1000 * 60 * 45, // 45 mins ago
    likes: 89,
    reposts: 24,
    commentsCount: 7,
    likedBy: [],
    repostedBy: [],
    bookmarkedBy: [],
  },
  {
    id: 'demo-3',
    author: {
      id: 'user-ai',
      name: 'مجتمع الذكاء الاصطناعي العربي',
      username: 'arabic_ai',
      avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80',
      verified: true,
      bio: 'كل جديد في عالم تقنيات الذكاء الاصطناعي والمصادر المفتوحة',
    },
    content: 'نصيحة تقنية اليوم: عند بناء أنظمة الـ Real-time في تطبيقات التواصل، الاعتماد على WebSockets أو المستمعات السحابية مثل Firestore onSnapshot يوفر استهلاك الذاكرة ويعطي تجربة مستخدم استثنائية بدون الحاجة لإعادة تحميل الصفحة! ⚡🤖 #AI #WebDev',
    mediaUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&auto=format&fit=crop&q=80',
    mediaType: 'image',
    mediaName: 'neural_ai_network.png',
    mediaSize: '850 KB',
    createdAt: Date.now() - 1000 * 60 * 120, // 2 hours ago
    likes: 156,
    reposts: 45,
    commentsCount: 14,
    likedBy: [],
    repostedBy: [],
    bookmarkedBy: [],
  },
];

// Helper to get local posts
function getLocalPosts(): Post[] {
  try {
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local posts:', e);
  }
  localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(INITIAL_DEMO_POSTS));
  return INITIAL_DEMO_POSTS;
}

function setLocalPosts(posts: Post[]) {
  localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
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
  return [
    {
      id: 'comm-1',
      postId: 'demo-1',
      author: {
        id: 'user-comm-1',
        name: 'كريم عادل',
        username: 'karim_tech',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      text: 'ما شاء الله! التطبيق سريع جداً وتجربة التصفح ناعمة جداً تضاهي تطبيق X الرسمي 👏',
      createdAt: Date.now() - 1000 * 60 * 10,
      likes: 5,
    },
    {
      id: 'comm-2',
      postId: 'demo-1',
      author: {
        id: 'user-comm-2',
        name: 'نور الدين',
        username: 'nour_dev',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      },
      text: 'خاصية التحميل الفوري للصور بدقة كاملة ممتازة ومفيدة جداً! 🔥',
      createdAt: Date.now() - 1000 * 60 * 5,
      likes: 3,
    },
  ];
}

function setLocalComments(comments: Comment[]) {
  localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
  if (channel) {
    channel.postMessage({ type: 'COMMENTS_UPDATED', comments });
  }
}

/**
 * Real-time subscription to Posts Feed
 */
export function subscribeToPosts(onUpdate: (posts: Post[]) => void): Unsubscribe {
  if (db) {
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
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
          onUpdate(cloudPosts);
        },
        (error) => {
          console.error('Firestore Posts subscribe error, falling back to local mode:', error);
          onUpdate(getLocalPosts());
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('Could not subscribe to cloud firestore:', err);
    }
  }

  // Local fallback with BroadcastChannel real-time sync
  onUpdate(getLocalPosts());

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'POSTS_UPDATED') {
      onUpdate(event.data.posts);
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_POSTS_KEY) {
      onUpdate(getLocalPosts());
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Create a new Post
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

  if (db) {
    try {
      const postsRef = collection(db, 'posts');
      const docRef = await addDoc(postsRef, {
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
      return docRef.id;
    } catch (err) {
      console.error('Failed to add post to Firestore, storing locally:', err);
    }
  }

  const posts = getLocalPosts();
  const updated = [fullPost, ...posts];
  setLocalPosts(updated);
  return fullPost.id;
}

/**
 * Delete a Post
 */
export async function deletePost(postId: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'posts', postId));
      return;
    } catch (err) {
      console.error('Failed to delete post from Firestore:', err);
    }
  }

  const posts = getLocalPosts();
  const updated = posts.filter((p) => p.id !== postId);
  setLocalPosts(updated);
}

/**
 * Toggle Like on a Post (Real-time)
 */
export async function toggleLike(postId: string, userId: string): Promise<void> {
  if (db) {
    try {
      const postRef = doc(db, 'posts', postId);
      // We check if current user liked it
      // Let's do atomic increment or arrayUnion/arrayRemove
      // In local/firestore, we update doc
      const posts = getLocalPosts();
      const current = posts.find((p) => p.id === postId);
      const isLiked = current?.likedBy?.includes(userId) ?? false;

      await updateDoc(postRef, {
        likes: increment(isLiked ? -1 : 1),
        likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
      });
      return;
    } catch (err) {
      console.warn('Firestore like failed, applying locally:', err);
    }
  }

  const posts = getLocalPosts();
  const updated = posts.map((post) => {
    if (post.id === postId) {
      const likedBy = post.likedBy || [];
      const isLiked = likedBy.includes(userId);
      const newLikedBy = isLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
      return {
        ...post,
        likes: Math.max(0, post.likes + (isLiked ? -1 : 1)),
        likedBy: newLikedBy,
      };
    }
    return post;
  });
  setLocalPosts(updated);
}

/**
 * Toggle Repost on a Post (Real-time)
 */
export async function toggleRepost(postId: string, userId: string): Promise<void> {
  if (db) {
    try {
      const postRef = doc(db, 'posts', postId);
      const posts = getLocalPosts();
      const current = posts.find((p) => p.id === postId);
      const isReposted = current?.repostedBy?.includes(userId) ?? false;

      await updateDoc(postRef, {
        reposts: increment(isReposted ? -1 : 1),
        repostedBy: isReposted ? arrayRemove(userId) : arrayUnion(userId),
      });
      return;
    } catch (err) {
      console.warn('Firestore repost failed, applying locally:', err);
    }
  }

  const posts = getLocalPosts();
  const updated = posts.map((post) => {
    if (post.id === postId) {
      const repostedBy = post.repostedBy || [];
      const isReposted = repostedBy.includes(userId);
      const newRepostedBy = isReposted ? repostedBy.filter((id) => id !== userId) : [...repostedBy, userId];
      return {
        ...post,
        reposts: Math.max(0, post.reposts + (isReposted ? -1 : 1)),
        repostedBy: newRepostedBy,
      };
    }
    return post;
  });
  setLocalPosts(updated);
}

/**
 * Toggle Bookmark
 */
export function toggleBookmark(postId: string, userId: string): Post[] {
  const posts = getLocalPosts();
  const updated = posts.map((post) => {
    if (post.id === postId) {
      const bookmarkedBy = post.bookmarkedBy || [];
      const isBookmarked = bookmarkedBy.includes(userId);
      const newBookmarks = isBookmarked ? bookmarkedBy.filter((id) => id !== userId) : [...bookmarkedBy, userId];
      return {
        ...post,
        bookmarkedBy: newBookmarks,
      };
    }
    return post;
  });
  setLocalPosts(updated);
  return updated;
}

/**
 * Real-time subscription to Comments of a Post
 */
export function subscribeToComments(postId: string, onUpdate: (comments: Comment[]) => void): Unsubscribe {
  if (db) {
    try {
      const commentsRef = collection(db, 'comments');
      const q = query(commentsRef, where('postId', '==', postId), orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Comment[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              postId: data.postId,
              author: data.author,
              text: data.text,
              createdAt: data.createdAt,
              likes: data.likes || 0,
            });
          });
          onUpdate(list);
        },
        (error) => {
          console.error('Firestore comments error, using local:', error);
          const all = getLocalComments();
          onUpdate(all.filter((c) => c.postId === postId));
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Comments subscription fallback:', e);
    }
  }

  const all = getLocalComments();
  onUpdate(all.filter((c) => c.postId === postId));

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
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
  };
}

/**
 * Add a Comment to a Post
 */
export async function addComment(postId: string, author: User, text: string): Promise<Comment> {
  const newComment: Comment = {
    id: 'comm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    postId,
    author,
    text,
    createdAt: Date.now(),
    likes: 0,
  };

  if (db) {
    try {
      await addDoc(collection(db, 'comments'), {
        postId: newComment.postId,
        author: newComment.author,
        text: newComment.text,
        createdAt: newComment.createdAt,
        likes: 0,
      });

      // Increment post commentsCount
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(1),
      });

      return newComment;
    } catch (err) {
      console.warn('Failed to add comment to Firestore, saving locally:', err);
    }
  }

  const comments = getLocalComments();
  setLocalComments([...comments, newComment]);

  // Update post count
  const posts = getLocalPosts();
  const updatedPosts = posts.map((p) => {
    if (p.id === postId) {
      return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
    }
    return p;
  });
  setLocalPosts(updatedPosts);

  return newComment;
}
