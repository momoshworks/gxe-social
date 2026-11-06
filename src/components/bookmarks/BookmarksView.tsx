import React from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { Post, User } from '../../types';
import { PostCard } from '../feed/PostCard';

interface BookmarksViewProps {
  posts: Post[];
  currentUser: User;
  onOpenReply: (post: Post) => void;
  onOpenLightbox: (imageUrl: string, imageName?: string, imageSize?: string, content?: string) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  posts,
  currentUser,
  onOpenReply,
  onOpenLightbox,
  onNotify,
}) => {
  const bookmarkedPosts = posts.filter((p) => p.bookmarkedBy?.includes(currentUser.id));

  return (
    <main className="flex-1 min-h-screen border-x border-[#2f3336] max-w-2xl w-full bg-[#000000]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#000000]/80 backdrop-blur-md border-b border-[#2f3336] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-[#1d9bf0]" />
          <div>
            <h1 className="font-bold text-lg text-[#e7e9ea]">العلامات المرجعية</h1>
            <p className="text-xs text-[#71767b]">@{currentUser.username}</p>
          </div>
        </div>
        <span className="text-xs text-[#71767b]">{bookmarkedPosts.length} محفوظات</span>
      </div>

      {/* Bookmarked Posts Feed */}
      {bookmarkedPosts.length > 0 ? (
        <div className="divide-y divide-[#2f3336]/60">
          {bookmarkedPosts.map((post) => (
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
      ) : (
        <div className="p-16 text-center text-[#71767b] flex flex-col items-center justify-center gap-3">
          <BookmarkCheck className="w-14 h-14 text-[#2f3336]" />
          <h3 className="font-bold text-base text-[#e7e9ea]">احفظ المنشورات لوقت لاحق</h3>
          <p className="text-xs max-w-xs leading-relaxed">
            لا تفوت المنشورات الرائعة! اضغط على أيقونة الإشارة المرجعية أسفل أي منشور لحفظه هنا والرجوع إليه في أي وقت.
          </p>
        </div>
      )}
    </main>
  );
};
