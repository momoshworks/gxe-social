import React from 'react';
import { Search, MoreHorizontal, Sparkles } from 'lucide-react';
import type { Trend, User } from '../../types';

interface TrendsSidebarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  trends: Trend[];
  suggestedUsers: User[];
  currentUser: User;
  onSelectTag: (tag: string) => void;
  onToggleFollow: (user: User) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const TrendsSidebar: React.FC<TrendsSidebarProps> = ({
  searchQuery,
  setSearchQuery,
  trends,
  suggestedUsers,
  currentUser,
  onSelectTag,
  onToggleFollow,
  onNotify,
}) => {
  // Filter out self from who to follow
  const realSuggestions = suggestedUsers.filter((u) => u.id !== currentUser.id);

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-80 xl:w-88 py-3 px-4 shrink-0 border-r border-[#2f3336] select-none">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 bg-[#000000] pb-2 z-10">
        <div className="relative flex items-center">
          <Search className="absolute right-4 w-4 h-4 text-[#71767b]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في هري GXE..."
            className="w-full bg-[#202327] text-[#e7e9ea] placeholder-[#71767b] text-sm rounded-full py-2.5 pr-11 pl-4 outline-none border border-transparent focus:border-[#1d9bf0] focus:bg-[#000000] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 text-xs bg-[#71767b] text-black w-4 h-4 rounded-full flex items-center justify-center font-bold hover:bg-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Subscribe to Premium Pill */}
      <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-4 flex flex-col gap-2">
        <h3 className="font-extrabold text-[#e7e9ea] text-base">GXE Premium</h3>
        <p className="text-xs text-[#71767b] leading-relaxed">
          احصل على ميزات متقدمة ودعم رفع الوسائط غير المحدود وتوثيق الحساب.
        </p>
        <button
          onClick={() => onNotify && onNotify('ميزة GXE Premium قادمة قريباً!', 'info')}
          className="mt-1 self-start px-4 py-2 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold text-xs rounded-full transition-colors"
        >
          ترقية الحساب
        </button>
      </div>

      {/* What's happening (Real Dynamic Trends) */}
      <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl overflow-hidden">
        <h3 className="font-extrabold text-[#e7e9ea] text-lg px-4 pt-3 pb-2 flex items-center justify-between">
          <span>ماذا يحدث الآن</span>
          <Sparkles className="w-4 h-4 text-[#1d9bf0]" />
        </h3>

        {trends.length > 0 ? (
          <div className="divide-y divide-[#2f3336]/40">
            {trends.map((trend) => (
              <div
                key={trend.id}
                onClick={() => onSelectTag(trend.tag)}
                className="px-4 py-3 hover:bg-[#1d1f23] transition-colors cursor-pointer flex items-start justify-between group"
              >
                <div className="flex flex-col text-right">
                  <span className="text-xs text-[#71767b]">{trend.category}</span>
                  <span className="text-sm font-bold text-[#e7e9ea] group-hover:underline mt-0.5" dir="ltr">
                    {trend.tag}
                  </span>
                  <span className="text-xs text-[#71767b] mt-0.5">{trend.postsCount}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNotify) onNotify(`تم تحديد الهاشتاج ${trend.tag}`, 'info');
                  }}
                  className="p-1.5 text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[#71767b]">
            لا توجد هاشتاجات رائجة بعد. استخدم #الهاشتاج في هاريتك ليظهر هنا!
          </div>
        )}
      </div>

      {/* Who to follow (Real Registered Users) */}
      <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl overflow-hidden">
        <h3 className="font-extrabold text-[#e7e9ea] text-lg px-4 pt-3 pb-2">
          اقتراحات المتابعة
        </h3>

        {realSuggestions.length > 0 ? (
          <div className="divide-y divide-[#2f3336]/40">
            {realSuggestions.slice(0, 5).map((user) => {
              const isFollowed = currentUser.following?.includes(user.id) ?? false;
              return (
                <div
                  key={user.id}
                  className="px-4 py-3 hover:bg-[#1d1f23] transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                    <div className="flex flex-col leading-tight min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[#e7e9ea] text-sm hover:underline cursor-pointer truncate max-w-[110px]">
                          {user.name}
                        </span>
                        {user.verified && (
                          <span className="text-[#1d9bf0] text-xs font-bold">✓</span>
                        )}
                      </div>
                      <span className="text-xs text-[#71767b] truncate">@{user.username}</span>
                    </div>
                  </div>

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
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[#71767b]">
            أنت أول عضو مسجل! شارك رابط GXE مع أصدقائك لينضموا إليك.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="px-4 py-2 text-[11px] text-[#71767b] flex flex-wrap gap-x-2 gap-y-1">
        <a href="./privacy.html" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#00f0ff] transition-colors">سياسة الخصوصية</a>
        <a href="./privacy.html" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#00f0ff] transition-colors">شروط الخدمة والأمان</a>
        <span>© 2026 GXE Social.</span>
      </footer>
    </aside>
  );
};
