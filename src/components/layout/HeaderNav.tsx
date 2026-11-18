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
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A0E1A]/85 backdrop-blur-3xl px-4 sm:px-8 py-3">
      <div className="w-full flex items-center justify-between gap-4">
        {/* Left (Right in RTL): Brand Identity with Clean GXE Logo */}
        <div
          onClick={() => setActiveTab('messages')}
          className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/20 p-2 shadow-lg shadow-cyan-500/15 group-hover:scale-105 group-hover:border-cyan-400/50 transition-all flex items-center justify-center">
              <img src={logoImg} alt="GXE" className="w-full h-full object-contain drop-shadow" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0A0E1A] shadow-sm shadow-emerald-500" />
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
        <nav className="flex items-center gap-1 sm:gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 border border-white/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
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
                  <span className="w-4 h-4 rounded-full bg-cyan-500 text-black text-[10px] flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right (Left in RTL): User Status & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notifications Button */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative p-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all ${
              activeTab === 'notifications'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="الإشعارات"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-black text-[10px] font-bold flex items-center justify-center border-2 border-[#08090C]">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* User Profile Pill */}
          <div
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2.5 py-1 px-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all group"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-lg object-cover border border-white/20 bg-slate-800"
            />
            <div className="hidden lg:flex flex-col text-right leading-none">
              <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors truncate max-w-[110px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-mono text-slate-400 mt-0.5" dir="ltr">
                @{currentUser.username}
              </span>
            </div>
          </div>

          {/* Auth Button */}
          {currentUser.id && !currentUser.id.startsWith('guest_') ? (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 transition-all"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 border border-white/20 flex items-center gap-1.5 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>دخول / حساب جديد</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
