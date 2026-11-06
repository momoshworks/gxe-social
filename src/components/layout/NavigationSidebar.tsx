import React from 'react';
import {
  Home,
  Hash,
  Bell,
  Mail,
  Bookmark,
  User as UserIcon,
  Feather,
  Cloud,
  MoreHorizontal,
} from 'lucide-react';
import type { User } from '../../types';
import { isCloudConnected } from '../../services/firebase';

interface NavigationSidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenComposer: () => void;
  onOpenCloudSettings: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenComposer,
  onOpenCloudSettings,
}) => {
  const isConnected = isCloudConnected();

  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'explore', label: 'استكشاف', icon: Hash },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, badge: 2 },
    { id: 'messages', label: 'الرسائل', icon: Mail },
    { id: 'bookmarks', label: 'العلامات المرجعية', icon: Bookmark },
    { id: 'profile', label: 'الملف الشخصي', icon: UserIcon },
  ];

  return (
    <header className="flex flex-col justify-between h-screen sticky top-0 py-3 px-2 sm:px-4 md:px-6 w-16 sm:w-20 xl:w-64 select-none shrink-0 border-l border-[#2f3336]">
      {/* Top Section */}
      <div className="flex flex-col items-center xl:items-start gap-2">
        {/* X Logo */}
        <div className="p-3 hover:bg-[#181818] rounded-full transition-colors cursor-pointer text-[#e7e9ea] inline-flex items-center justify-center">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-8 h-8 fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 w-full mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-4 p-3 xl:px-4 xl:py-3 rounded-full transition-colors w-full group relative ${
                  isActive
                    ? 'font-bold text-[#e7e9ea]'
                    : 'text-[#e7e9ea] hover:bg-[#181818]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-7 h-7 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-[#1d9bf0] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-black">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline text-xl">{item.label}</span>
              </button>
            );
          })}

          {/* Cloud Database Status & Config Button */}
          <button
            onClick={onOpenCloudSettings}
            className="flex items-center gap-4 p-3 xl:px-4 xl:py-3 rounded-full transition-colors w-full text-[#e7e9ea] hover:bg-[#181818] group"
          >
            <div className="relative">
              <Cloud className={`w-7 h-7 stroke-[1.8] ${isConnected ? 'text-[#00ba7c]' : 'text-[#ff9900]'}`} />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${
                  isConnected ? 'bg-[#00ba7c]' : 'bg-[#ff9900]'
                }`}
              />
            </div>
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-sm font-bold text-[#e7e9ea]">الربط السحابي</span>
              <span className={`text-[11px] ${isConnected ? 'text-[#00ba7c]' : 'text-[#ff9900]'}`}>
                {isConnected ? 'Firebase Realtime 🟢' : 'تجريبي محلي 🟡'}
              </span>
            </div>
          </button>
        </nav>

        {/* Big Blue "Post" Button */}
        <button
          onClick={onOpenComposer}
          className="mt-4 w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-98 text-white rounded-full font-bold p-3 xl:py-3.5 flex items-center justify-center transition-all shadow-lg shadow-[#1d9bf0]/20"
        >
          <Feather className="w-6 h-6 xl:hidden" />
          <span className="hidden xl:inline text-lg">نشر</span>
        </button>
      </div>

      {/* Bottom User Account Pill */}
      <div className="relative my-2">
        <button
          onClick={() => setActiveTab('profile')}
          className="flex items-center justify-between w-full p-2.5 rounded-full hover:bg-[#181818] transition-colors group cursor-pointer text-right"
        >
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
            <div className="hidden xl:flex flex-col leading-tight">
              <div className="flex items-center gap-1">
                <span className="font-bold text-[#e7e9ea] text-sm truncate max-w-[110px]">
                  {currentUser.name}
                </span>
                {currentUser.verified && (
                  <span className="text-[#1d9bf0] text-xs font-bold">✓</span>
                )}
              </div>
              <span className="text-xs text-[#71767b]">@{currentUser.username}</span>
            </div>
          </div>
          <MoreHorizontal className="hidden xl:block w-5 h-5 text-[#71767b] group-hover:text-[#e7e9ea]" />
        </button>
      </div>
    </header>
  );
};
