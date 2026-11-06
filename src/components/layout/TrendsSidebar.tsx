import React, { useState } from 'react';
import { Search, MoreHorizontal } from 'lucide-react';
import type { Trend, User } from '../../types';

interface TrendsSidebarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectTag: (tag: string) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

const DEFAULT_TRENDS: Trend[] = [
  { id: '1', category: 'التقنية · رائج في العالم العربي', tag: '#الذكاء_الاصطناعي', postsCount: '48.2 ألف تغريدة' },
  { id: '2', category: 'البرمجة · رائج', tag: '#React19', postsCount: '23.8 ألف تغريدة' },
  { id: '3', category: 'تطوير الويب · رائج', tag: '#Firebase', postsCount: '19.4 ألف تغريدة' },
  { id: '4', category: 'تصميم الواجهات · رائج', tag: '#UIUX', postsCount: '14.1 ألف تغريدة' },
  { id: '5', category: 'مجتمع المطورين', tag: '#مطورين_العرب', postsCount: '9.6 ألف تغريدة' },
];

const SUGGESTED_USERS: User[] = [
  {
    id: 'sug-1',
    name: 'عبدالله السعيد',
    username: 'abdullah_cloud',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    verified: true,
  },
  {
    id: 'sug-2',
    name: 'مها الشمري',
    username: 'maha_frontend',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    verified: false,
  },
  {
    id: 'sug-3',
    name: 'أكاديمية البرمجة',
    username: 'code_academy_ar',
    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
    verified: true,
  },
];

export const TrendsSidebar: React.FC<TrendsSidebarProps> = ({
  searchQuery,
  setSearchQuery,
  onSelectTag,
  onNotify,
}) => {
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const toggleFollow = (userId: string, name: string) => {
    const isNow = !following[userId];
    setFollowing((prev) => ({ ...prev, [userId]: isNow }));
    if (onNotify) {
      onNotify(isNow ? `أصبحت تتابع ${name} الآن!` : `ألغيت متابعة ${name}`, 'info');
    }
  };

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
            placeholder="بحث في X..."
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
        <h3 className="font-extrabold text-[#e7e9ea] text-base">اشترك في Premium</h3>
        <p className="text-xs text-[#71767b] leading-relaxed">
          احصل على علامة التوثيق الزرقاء، ميزات النشر المتقدمة، وسرعة رفع غير محدودة.
        </p>
        <button
          onClick={() => onNotify && onNotify('ميزة Premium قادمة قريباً!', 'info')}
          className="mt-1 self-start px-4 py-2 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold text-xs rounded-full transition-colors"
        >
          ترقية الحساب
        </button>
      </div>

      {/* What's happening (Trends) */}
      <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl overflow-hidden">
        <h3 className="font-extrabold text-[#e7e9ea] text-lg px-4 pt-3 pb-2">
          ماذا يحدث الآن
        </h3>

        <div className="divide-y divide-[#2f3336]/40">
          {DEFAULT_TRENDS.map((trend) => (
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
      </div>

      {/* Who to follow */}
      <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl overflow-hidden">
        <h3 className="font-extrabold text-[#e7e9ea] text-lg px-4 pt-3 pb-2">
          اقتراحات المتابعة
        </h3>

        <div className="divide-y divide-[#2f3336]/40">
          {SUGGESTED_USERS.map((user) => {
            const isFollowed = following[user.id];
            return (
              <div
                key={user.id}
                className="px-4 py-3 hover:bg-[#1d1f23] transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div className="flex flex-col leading-tight">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[#e7e9ea] text-sm hover:underline cursor-pointer">
                        {user.name}
                      </span>
                      {user.verified && (
                        <span className="text-[#1d9bf0] text-xs font-bold">✓</span>
                      )}
                    </div>
                    <span className="text-xs text-[#71767b]">@{user.username}</span>
                  </div>
                </div>

                <button
                  onClick={() => toggleFollow(user.id, user.name)}
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
      </div>

      {/* Footer Info */}
      <footer className="px-4 py-2 text-[11px] text-[#71767b] flex flex-wrap gap-x-2 gap-y-1">
        <a href="#" className="hover:underline">شروط الخدمة</a>
        <a href="#" className="hover:underline">سياسة الخصوصية</a>
        <a href="#" className="hover:underline">سياسة ملفات تعريف الارتباط</a>
        <a href="#" className="hover:underline">إمكانية الوصول</a>
        <span>© 2026 X Corp.</span>
      </footer>
    </aside>
  );
};
