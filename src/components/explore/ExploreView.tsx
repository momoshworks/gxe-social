import React, { useState } from 'react';
import { Search, Hash, Flame, Image as ImageIcon, Users, MessageCircle } from 'lucide-react';
import type { Post, User, Trend } from '../../types';
import { PostCard } from '../feed/PostCard';

interface ExploreViewProps {
  posts: Post[];
  trends: Trend[];
  communityUsers: User[];
  currentUser: User;
  onOpenReply: (post: Post) => void;
  onOpenLightbox: (imageUrl: string, imageName?: string, imageSize?: string, content?: string) => void;
  onSelectTag: (tag: string) => void;
  onStartChat: (user: User) => void;
  onToggleFollow: (user: User) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  posts,
  trends,
  communityUsers,
  currentUser,
  onOpenReply,
  onOpenLightbox,
  onSelectTag,
  onStartChat,
  onToggleFollow,
  onNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'users' | 'media' | 'top'>('all');

  const q = searchTerm.toLowerCase().trim();

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    if (filterType === 'media' && !post.mediaUrl) return false;
    if (filterType === 'top' && post.likes < 1) return false;

    if (q) {
      const contentMatch = post.content.toLowerCase().includes(q);
      const authorMatch =
        post.author.name.toLowerCase().includes(q) ||
        post.author.username.toLowerCase().includes(q) ||
        post.author.email?.toLowerCase().includes(q);
      return contentMatch || authorMatch;
    }
    return true;
  });

  // Filter users by name, username, or email
  const filteredUsers = communityUsers.filter((u) => {
    if (u.id === currentUser.id) return false;
    if (!q) return true;
    const nameMatch = u.name.toLowerCase().includes(q);
    const usernameMatch = u.username.toLowerCase().includes(q);
    const emailMatch = u.email ? u.email.toLowerCase().includes(q) : false;
    return nameMatch || usernameMatch || emailMatch;
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
            placeholder="ابحث بالاسم، المعرّف @username، أو البريد الإلكتروني..."
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
            onClick={() => setFilterType('users')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-colors ${
              filterType === 'users'
                ? 'bg-[#1d9bf0] text-white'
                : 'bg-[#16181c] text-[#71767b] hover:text-[#e7e9ea] border border-[#2f3336]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>المستخدمون ({filteredUsers.length})</span>
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
            <span>الوسائط</span>
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

      {/* Dynamic Hashtags Bar */}
      {trends.length > 0 && filterType !== 'users' && (
        <div className="p-4 border-b border-[#2f3336] bg-[#0d0f12]">
          <h2 className="text-xs font-bold text-[#71767b] mb-2 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-[#1d9bf0]" />
            <span>الهاشتاجات الرائجة في المنصة:</span>
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

      {/* Users Search View */}
      {filterType === 'users' ? (
        filteredUsers.length > 0 ? (
          <div className="divide-y divide-[#2f3336]/40">
            {filteredUsers.map((user) => {
              const isFollowed = currentUser.following?.includes(user.id) ?? false;
              return (
                <div
                  key={user.id}
                  className="p-4 flex items-center justify-between hover:bg-[#16181c]/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#e7e9ea] truncate">{user.name}</span>
                        {user.verified && (
                          <span className="text-[#1d9bf0] text-xs font-bold">✓</span>
                        )}
                      </div>
                      <span className="text-xs text-[#71767b] block">@{user.username}</span>
                      {user.email && (
                        <span className="text-[11px] text-[#1d9bf0] block truncate">
                          {user.email}
                        </span>
                      )}
                      {user.bio && (
                        <p className="text-xs text-[#71767b] mt-1 line-clamp-1">{user.bio}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartChat(user)}
                      className="p-2 rounded-full border border-[#2f3336] hover:bg-[#181818] text-[#1d9bf0] transition-colors"
                      title="إرسال رسالة خاصة"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onToggleFollow(user)}
                      className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all ${
                        isFollowed
                          ? 'bg-transparent border border-[#536471] text-[#e7e9ea] hover:border-red-600 hover:text-red-500 hover:bg-red-500/10'
                          : 'bg-white hover:bg-gray-200 text-black active:scale-95'
                      }`}
                    >
                      {isFollowed ? 'متابَع' : 'متابعة'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-[#71767b] flex flex-col items-center justify-center gap-3">
            <Users className="w-12 h-12 text-[#2f3336]" />
            <p className="text-sm font-semibold text-[#e7e9ea]">لم يتم العثور على أي مستخدم</p>
            <p className="text-xs">تأكد من كتابة الاسم أو المعرّف أو الإيميل بشكل صحيح</p>
          </div>
        )
      ) : (
        /* Posts Search View */
        filteredPosts.length > 0 ? (
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
        )
      )}
    </main>
  );
};
