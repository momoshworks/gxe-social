import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquareDashed, Users } from 'lucide-react';
import type { Post, User } from '../../types';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { NewPostsBanner } from './NewPostsBanner';

interface MainFeedProps {
  posts: Post[];
  currentUser: User;
  searchQuery: string;
  onOpenReply: (post: Post) => void;
  onOpenLightbox: (imageUrl: string, imageName?: string, imageSize?: string, content?: string) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const MainFeed: React.FC<MainFeedProps> = ({
  posts,
  currentUser,
  searchQuery,
  onOpenReply,
  onOpenLightbox,
  onNotify,
}) => {
  const [feedTab, setFeedTab] = useState<'for_you' | 'following'>('for_you');
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>(posts);
  const [newPostsCount, setNewPostsCount] = useState<number>(0);
  const topAnchorRef = useRef<HTMLDivElement>(null);
  const prevPostsCountRef = useRef<number>(posts.length);

  // Handle incoming real-time posts
  useEffect(() => {
    // If initial load or user published, show directly
    if (displayedPosts.length === 0) {
      setDisplayedPosts(posts);
      prevPostsCountRef.current = posts.length;
      return;
    }

    // Check if new posts arrived
    const isScrolledDown = window.scrollY > 200;
    const isMyPost = posts[0] && posts[0].author.id === currentUser.id;

    if (posts.length > prevPostsCountRef.current && isScrolledDown && !isMyPost) {
      const diff = posts.length - prevPostsCountRef.current;
      setNewPostsCount((prev) => prev + diff);
    } else {
      // Auto update if user is near top OR if the user is the author of the new post
      setDisplayedPosts(posts);
      setNewPostsCount(0);
    }

    prevPostsCountRef.current = posts.length;
  }, [posts, currentUser.id]);

  const handleShowNewPosts = () => {
    setDisplayedPosts(posts);
    setNewPostsCount(0);
    topAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter posts based on search query or tab
  const filteredPosts = displayedPosts.filter((post) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const contentMatch = post.content.toLowerCase().includes(q);
      const authorMatch =
        post.author.name.toLowerCase().includes(q) || post.author.username.toLowerCase().includes(q);
      if (!contentMatch && !authorMatch) return false;
    }

    // Following tab: strictly show posts from users the current user actually follows
    if (feedTab === 'following') {
      return currentUser.following?.includes(post.author.id) ?? false;
    }

    return true;
  });

  return (
    <main className="flex-1 min-h-screen border-x border-[#2f3336] max-w-2xl w-full bg-[#000000]">
      {/* Top anchor for smooth scrolling */}
      <div ref={topAnchorRef} />

      {/* Sticky Dual Header: لك (For You) & متابَعون (Following) */}
      <div className="sticky top-0 z-30 bg-[#000000]/85 backdrop-blur-md border-b border-[#2f3336]">
        <div className="px-4 py-3 flex items-center justify-between border-b border-[#2f3336]/40">
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg text-white">شريان النبضات</h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#00ba7c] bg-[#00ba7c]/10 border border-[#00ba7c]/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ba7c] animate-ping" />
              <span>نبض مباشر</span>
            </span>
          </div>
          <Sparkles className="w-5 h-5 text-[#00f0ff]" />
        </div>

        {/* Tabs */}
        <div className="flex h-12">
          <button
            onClick={() => setFeedTab('for_you')}
            className="flex-1 flex items-center justify-center relative hover:bg-[#181818]/50 transition-colors"
          >
            <span
              className={`text-sm ${
                feedTab === 'for_you' ? 'font-bold text-white' : 'font-medium text-[#71767b]'
              }`}
            >
              لك (الجميع)
            </span>
            {feedTab === 'for_you' && (
              <span className="absolute bottom-0 h-1 w-14 bg-gradient-to-r from-[#00f0ff] to-[#00ba7c] rounded-full shadow-sm shadow-[#00f0ff]/50" />
            )}
          </button>

          <button
            onClick={() => setFeedTab('following')}
            className="flex-1 flex items-center justify-center relative hover:bg-[#181818]/50 transition-colors"
          >
            <span
              className={`text-sm ${
                feedTab === 'following' ? 'font-bold text-white' : 'font-medium text-[#71767b]'
              }`}
            >
              النبضات المتابعة ({currentUser.following?.length || 0})
            </span>
            {feedTab === 'following' && (
              <span className="absolute bottom-0 h-1 w-20 bg-gradient-to-r from-[#00f0ff] to-[#00ba7c] rounded-full shadow-sm shadow-[#00ba7c]/50" />
            )}
          </button>
        </div>
      </div>

      {/* Floating Real-time New Posts Banner */}
      <NewPostsBanner count={newPostsCount} onClick={handleShowNewPosts} />

      {/* Post Creator Composer */}
      <PostComposer
        currentUser={currentUser}
        onPostCreated={() => {
          setDisplayedPosts(posts);
          setNewPostsCount(0);
          topAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
        onNotify={onNotify}
      />

      {/* Posts Stream */}
      {filteredPosts.length > 0 ? (
        <div className="divide-y divide-[#2f3336]/60">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onOpenReply={onOpenReply}
              onOpenLightbox={onOpenLightbox}
              onNotify={onNotify}
            />
          ))}
        </div>
      ) : feedTab === 'following' ? (
        <div className="p-16 text-center text-[#71767b] flex flex-col items-center justify-center gap-3">
          <Users className="w-12 h-12 text-[#2f3336]" />
          <p className="text-base font-semibold text-[#e7e9ea]">لا توجد منشورات من الأشخاص الذين تتابعهم</p>
          <p className="text-xs max-w-xs">
            تصفح تبويب (لك) أو قائمة (اقتراحات المتابعة) لمتابعة المستخدمين ورؤية منشوراتهم الحصرية هنا!
          </p>
        </div>
      ) : (
        <div className="p-16 text-center text-[#71767b] flex flex-col items-center justify-center gap-3">
          <MessageSquareDashed className="w-12 h-12 text-[#2f3336]" />
          <p className="text-base font-semibold text-[#e7e9ea]">لا توجد منشورات في المنصة حتى الآن</p>
          <p className="text-xs max-w-xs">
            كن أول من يشارك فكرة، صورة، أو مستند في مجتمع GXE عبر صندوق النشر في الأعلى!
          </p>
        </div>
      )}
    </main>
  );
};
