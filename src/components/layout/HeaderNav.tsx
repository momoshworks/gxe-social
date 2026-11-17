import React from 'react';
import { MessageSquare, Zap, Users, User as UserIcon, Bell, LogIn, LogOut } from 'lucide-react';
import type { User } from '../../types';
import logoImg from '../../assets/logo.png';

interface HeaderNavProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadNotifsCount: number;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenCloudSettings?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  unreadNotifsCount,
  onOpenAuth,
  onLogout,
}) => {
  const tabs = [
    { id: 'messages', label: 'المحادثات', icon: MessageSquare, badge: undefined },
    { id: 'events', label: 'الأحداث والمشاريع', icon: Zap, badge: undefined },
    { id: 'community', label: 'المجتمع', icon: Users, badge: undefined },
    { id: 'profile', label: 'الملف الشخصي', icon: UserIcon, badge: undefined },
  ];

  return (
    <header className="sticky top-0 z-40 w-full px-3 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto glass-panel py-2 px-3 sm:px-5 flex items-center justify-between gap-3">
        {/* Left: Brand Identity with GXE Logo */}
        <div
          onClick={() => setActiveTab('messages')}
          className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#70D6FF]/20 to-[#FF70A6]/20 border border-white/20 p-1.5 shadow-lg shadow-[#70D6FF]/10 group-hover:scale-105 transition-transform flex items-center justify-center">
              <img src={logoImg} alt="GXE" className="w-full h-full object-contain drop-shadow" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00ba7c] rounded-full border-2 border-[#0B0F19] animate-pulse" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-wider text-white">GXE</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#70D6FF]/15 text-[#70D6FF] border border-[#70D6FF]/30 font-bold">
                HUB
              </span>
            </div>
            <span className="text-[11px] text-gray-400">منصة التواصل والأحداث</span>
          </div>
        </div>

        {/* Center: Tactile Liquid Glass Navigation Switcher */}
        <nav className="flex items-center gap-1 sm:gap-2 p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? 'glass-btn-primary shadow-lg shadow-[#70D6FF]/20 text-[#07090E]'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                <span className="hidden md:inline">{tab.label}</span>
                {tab.id === 'messages' && (
                  <span className="md:hidden">محادثات</span>
                )}
                {tab.id === 'events' && (
                  <span className="md:hidden">أحداث</span>
                )}
                {tab.badge && (
                  <span className="w-4 h-4 rounded-full bg-[#FF70A6] text-white text-[10px] flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: User Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notifications Button */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative p-2 rounded-full border border-white/10 hover:border-white/20 transition-colors ${
              activeTab === 'notifications' ? 'bg-white/15 text-[#70D6FF]' : 'bg-white/5 text-gray-300'
            }`}
            title="الإشعارات"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF70A6] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#0B0F19]">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* User Profile Pill */}
          <div
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 p-1 sm:pr-2.5 sm:pl-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-white/20"
            />
            <span className="hidden lg:inline text-xs font-semibold text-gray-200 truncate max-w-[100px]">
              {currentUser.name}
            </span>
          </div>

          {/* Auth Button */}
          {currentUser.id && currentUser.id !== 'guest_user_default' && !currentUser.id.startsWith('guest_') ? (
            <button
              onClick={onLogout}
              className="p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="glass-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-[#70D6FF]" />
              <span className="hidden sm:inline">دخول</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
