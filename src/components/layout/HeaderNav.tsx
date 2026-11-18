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
    { id: 'messages', label: 'المحادثات', icon: MessageSquare },
    { id: 'events', label: 'الأحداث والمشاريع', icon: Zap },
    { id: 'community', label: 'المجتمع', icon: Users },
    { id: 'profile', label: 'الملف الشخصي', icon: UserIcon },
  ];

  const isGuest = !currentUser.id || currentUser.id.startsWith('guest_');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070913]/90 backdrop-blur-3xl px-2 sm:px-6 py-1.5 sm:py-3 transition-all select-none">
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Brand Identity with Clean GXE Logo */}
        <div
          onClick={() => setActiveTab('messages')}
          className="flex items-center gap-1.5 sm:gap-3 cursor-pointer group shrink-0"
        >
          <div className="relative">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/[0.08] border border-white/20 p-1 sm:p-2 shadow-lg shadow-cyan-500/15 group-hover:scale-105 group-hover:border-cyan-400/50 transition-all flex items-center justify-center">
              <img src={logoImg} alt="GXE" className="w-full h-full object-contain drop-shadow" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-emerald-500 rounded-full border-2 border-[#070913] shadow-sm shadow-emerald-500" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-wider text-white">GXE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold">
                PRO
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1">منصة التواصل والأحداث</span>
          </div>
        </div>

        {/* Center: Tactile Liquid Glass Navigation Switcher */}
        <nav className="flex items-center gap-0.5 sm:gap-1.5 p-1 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 border border-white/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
                title={tab.label}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right (Left in RTL): Notifications Bell, Profile, & Auth */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Notifications Bell Button - ALWAYS PROMINENT ON MOBILE & DESKTOP */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative p-2 sm:p-2.5 rounded-xl border transition-all ${
              activeTab === 'notifications'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-md shadow-cyan-500/20'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border-white/10'
            }`}
            title="مركز التنبيهات"
            aria-label="التنبيهات"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-cyan-400 text-black text-[9px] font-black flex items-center justify-center border border-[#070913] shadow-md shadow-cyan-400/40 animate-pulse">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar Pill */}
          <div
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all group shrink-0"
            title={currentUser.name}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover border border-white/20 bg-slate-800"
            />
            <div className="hidden lg:flex flex-col text-right leading-none">
              <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors truncate max-w-[100px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5" dir="ltr">
                @{currentUser.username}
              </span>
            </div>
          </div>

          {/* Auth Button */}
          {!isGuest ? (
            <button
              onClick={onLogout}
              className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 transition-all shrink-0"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 border border-white/20 flex items-center gap-1.5 transition-all shrink-0"
              title="دخول / حساب جديد"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">دخول</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
