import React, { useState } from 'react';
import { Search, Hash, Flame, Image as ImageIcon } from 'lucide-react';
import type { Post, User, Trend } from '../../types';
import { PostCard } from '../feed/PostCard';

interface ExploreViewProps {
  posts: Post[];
  trends: Trend[];
  currentUser: User;
  onOpenReply: (post: Post) => void;
  onOpenLightbox: (imageUrl: string, imageName?: string, imageSize?: string, content?: string) => void;
  onSelectTag: (tag: string) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  posts,
  trends,
  currentUser,
  onOpenReply,
  onOpenLightbox,
  onSelectTag,
  onNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'media' | 'top'>('all');

  const filteredPosts = posts.filter((post) => {
    if (filterType === 'media' && !post.mediaUrl) return false;
    if (filterType === 'top' && post.likes < 1) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const contentMatch = post.content.toLowerCase().includes(q);
      const authorMatch =
        post.author.name.toLowerCase().includes(q) || post.author.username.toLowerCase().includes(q);
      return contentMatch || authorMatch;
    }
    return true;
  });

  return (
    <main className="flex-1 min-h-screen border-x border-[#2f3336] max-w-2xl w-full bg-[#000000]">
      {/* Search Header */}
      <div className="sticky top-0 z-30 bg-[#000000]/90 backdrop-blur-md border-b border-[#2f3336] p-3 space-y-3">
        <div className="relative flex items-center">
          <Search className="absolute right-4 w-4 h-4 text-[#71767b]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="استكشف مواضيع، هاشتاجات، أو مستخدمين..."
            className="w-full bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] text-sm rounded-full py-2.5 pr-11 pl-4 outline-none border border-transparent focus:border-[#1d9bf0] focus:bg-[#000000] transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 text-xs bg-[#71767b] text-black w-4 h-4 rounded-full flex items-center justify-center font-bold hover:bg-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 text-xs font-semibold overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              filterType === 'all'
                ? 'bg-[#1d9bf0] text-white'
                : 'bg-[#16181c] text-[#71767b] hover:text-[#e7e9ea] border border-[#2f3336]'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterType('media')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-colors ${
              filterType === 'media'
                ? 'bg-[#1d9bf0] text-white'
                : 'bg-[#16181c] text-[#71767b] hover:text-[#e7e9ea] border border-[#2f3336]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>الوسائط والصور</span>
          </button>
          <button
            onClick={() => setFilterType('top')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-colors ${
              filterType === 'top'
                ? 'bg-[#1d9bf0] text-white'
                : 'bg-[#16181c] text-[#71767b] hover:text-[#e7e9ea] border border-[#2f3336]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>الأكثر تفاعلاً</span>
          </button>
        </div>
      </div>

      {/* Real Dynamic Trends Bar if available */}
      {trends.length > 0 && (
        <div className="p-4 border-b border-[#2f3336] bg-[#0d0f12]">
          <h2 className="text-xs font-bold text-[#71767b] mb-2 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-[#1d9bf0]" />
            <span>الهاشتاجات الرائجة من المنشورات الفعلية:</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {trends.map((trend) => (
              <button
                key={trend.id}
                onClick={() => {
                  setSearchTerm(trend.tag);
                  onSelectTag(trend.tag);
                }}
                className="px-3 py-1 bg-[#16181c] hover:bg-[#202327] border border-[#2f3336] text-[#1d9bf0] font-semibold text-xs rounded-full transition-colors flex items-center gap-1"
                dir="ltr"
              >
                <span>{trend.tag}</span>
                <span className="text-[10px] text-[#71767b]">({trend.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
      ) : (
        <div className="p-16 text-center text-[#71767b] flex flex-col items-center justify-center gap-3">
          <Search className="w-12 h-12 text-[#2f3336]" />
          <p className="text-sm font-semibold text-[#e7e9ea]">لا توجد نتائج مطابقة</p>
          <p className="text-xs">جرّب البحث بكلمات أخرى أو اختر فلتراً مختلفاً</p>
        </div>
      )}
    </main>
  );
};
