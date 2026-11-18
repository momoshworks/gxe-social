import React, { useState, useEffect } from 'react';
import {
  subscribeToPopNotifications,
  type PopNotificationPayload,
} from '../../services/notificationService';
import { X, Sparkles, MessageCircle, Heart } from 'lucide-react';
import logoImg from '../../assets/logo.png';

interface FloatingPopNotificationProps {
  onNavigate?: (tab: string, data?: any) => void;
}

export const FloatingPopNotification: React.FC<FloatingPopNotificationProps> = ({ onNavigate }) => {
  const [currentPop, setCurrentPop] = useState<PopNotificationPayload | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPopNotifications((pop) => {
      setCurrentPop(pop);
      setIsVisible(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isVisible || !currentPop) return;

    // Auto-dismiss after 3.2 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setCurrentPop(null), 250);
    }, 3200);

    return () => clearTimeout(timer);
  }, [isVisible, currentPop]);

  if (!currentPop) return null;

  const handleClick = () => {
    if (onNavigate && currentPop.data?.tab) {
      onNavigate(currentPop.data.tab, currentPop.data);
    }
    setIsVisible(false);
  };

  const getPopIcon = () => {
    if (currentPop.icon) {
      return (
        <img
          src={currentPop.icon}
          alt="Avatar"
          className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 shadow-md shadow-cyan-500/20 shrink-0"
        />
      );
    }
    if (currentPop.title.includes('رسالة')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20 shrink-0">
          <MessageCircle className="w-5 h-5 fill-current/20" />
        </div>
      );
    }
    if (currentPop.title.includes('إعجاب') || currentPop.title.includes('تفاعل')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400 shadow-md shadow-rose-500/20 shrink-0">
          <Heart className="w-5 h-5 fill-current" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/20 shrink-0">
        <img src={logoImg} alt="GXE" className="w-6 h-6 object-contain drop-shadow" />
      </div>
    );
  };

  return (
    <aside
      aria-label="إشعار فوري"
      className="fixed top-3 inset-x-3 sm:top-5 sm:left-6 sm:right-auto sm:w-[380px] z-[80] pointer-events-none select-none transition-all duration-250 ease-out"
      style={{ direction: 'rtl' }}
    >
      <div
        className={`
          pointer-events-auto cursor-pointer relative overflow-hidden rounded-2xl p-3.5
          bg-[#070913]/95 border border-white/20 hover:border-cyan-400/50
          backdrop-blur-3xl shadow-2xl shadow-cyan-500/10
          flex items-center gap-3 transition-all duration-250 ease-out active:scale-98
          ${isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95'}
        `}
        onClick={handleClick}
      >
        {/* Specular top rim highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

        {/* Rapid countdown bar */}
        <div
          className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-[3200ms] ease-linear"
          style={{ width: isVisible ? '0%' : '100%' }}
        />

        {/* Sender / App Avatar */}
        {getPopIcon()}

        {/* Text Content */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>GXE نبض فوري</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">الآن ⚡</span>
          </div>
          <h4 className="font-bold text-sm text-white truncate">{currentPop.title}</h4>
          <p className="text-xs text-slate-300 truncate leading-tight mt-0.5">{currentPop.body}</p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
