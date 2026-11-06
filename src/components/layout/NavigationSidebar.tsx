import React from 'react';
import {
  Home,
  Hash,
  Bell,
  Mail,
  Bookmark,
  User as UserIcon,
  Feather,
  LogIn,
  LogOut,
  Smartphone,
} from 'lucide-react';
import type { User } from '../../types';
import logoImg from '../../assets/logo.png';

interface NavigationSidebarProps {
  currentUser: User;
  activeTab: string;
  unreadNotifsCount: number;
  setActiveTab: (tab: string) => void;
  onOpenComposer: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  currentUser,
  activeTab,
  unreadNotifsCount,
  setActiveTab,
  onOpenComposer,
  onOpenAuth,
  onLogout,
}) => {
  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'explore', label: 'استكشاف', icon: Hash },
    {
      id: 'notifications',
      label: 'الإشعارات',
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
    },
    { id: 'messages', label: 'الرسائل', icon: Mail },
    { id: 'bookmarks', label: 'العلامات المرجعية', icon: Bookmark },
    { id: 'profile', label: 'الملف الشخصي', icon: UserIcon },
  ];

  return (
    <header className="hidden md:flex flex-col justify-between h-screen sticky top-0 py-3 px-2 sm:px-4 md:px-6 w-16 sm:w-20 xl:w-64 select-none shrink-0 border-l border-[#2f3336]">
      {/* Top Section */}
      <div className="flex flex-col items-center xl:items-start gap-2">
        {/* GXE Logo & Brand */}
        <div
          onClick={() => setActiveTab('home')}
          className="p-2 hover:bg-[#181818] rounded-full transition-colors cursor-pointer text-[#e7e9ea] flex items-center gap-3"
          title="GXE"
        >
          <img src={logoImg} alt="GXE Logo" className="w-9 h-9 object-contain drop-shadow" />
          <span className="hidden xl:inline text-xl font-black tracking-wider text-[#e7e9ea]">
            GXE
          </span>
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
        </nav>

        {/* Big Blue "Post" Button */}
        <button
          onClick={onOpenComposer}
          className="mt-4 w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-98 text-white rounded-full font-bold p-3 xl:py-3.5 flex items-center justify-center transition-all shadow-lg shadow-[#1d9bf0]/20"
        >
          <Feather className="w-6 h-6 xl:hidden" />
          <span className="hidden xl:inline text-lg">نشر في GXE</span>
        </button>

        {/* Direct Download Android APK */}
        <a
          href="./GXE-Social.apk"
          download="GXE-Social.apk"
          className="mt-2 flex items-center justify-center gap-2.5 w-full p-2.5 bg-[#16181c] hover:bg-[#1f2227] border border-[#2f3336] hover:border-[#00ba7c]/50 text-[#e7e9ea] rounded-full text-xs font-medium transition-all group"
          title="تحميل تطبيق أندرويد APK"
        >
          <Smartphone className="w-4 h-4 text-[#00ba7c] group-hover:scale-110 transition-transform" />
          <span className="hidden xl:inline text-xs">تحميل تطبيق أندرويد (APK)</span>
        </a>
      </div>

      {/* Bottom User Account Pill & Login/Register */}
      <div className="relative my-2 w-full">
        {currentUser.email ? (
          <div className="flex items-center justify-between w-full p-2 rounded-full hover:bg-[#181818] transition-colors group cursor-pointer text-right">
            <div
              className="flex items-center gap-3 min-w-0"
              onClick={() => setActiveTab('profile')}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#2f3336]"
              />
              <div className="hidden xl:flex flex-col leading-tight min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[#e7e9ea] text-sm truncate max-w-[100px]">
                    {currentUser.name}
                  </span>
                  {currentUser.verified && (
                    <span className="text-[#1d9bf0] text-xs font-bold">✓</span>
                  )}
                </div>
                <span className="text-xs text-[#71767b] truncate" dir="ltr">
                  @{currentUser.username}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="hidden xl:block p-1.5 text-[#71767b] hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center justify-center gap-2 w-full p-2.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full text-xs shadow-md transition-all active:scale-95"
            title="تسجيل الدخول / إنشاء حساب"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden xl:inline">تسجيل الدخول</span>
            <span className="xl:hidden text-[10px] font-bold">دخول</span>
          </button>
        )}
      </div>
    </header>
  );
};
