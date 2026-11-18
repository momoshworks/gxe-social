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

    // Auto-dismiss after 4.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setCurrentPop(null), 300); // wait for fade-out animation
    }, 4500);

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
          className="w-10 h-10 rounded-full object-cover border border-blue-500/40 shadow-md shadow-blue-500/20 shrink-0"
        />
      );
    }
    if (currentPop.title.includes('رسالة')) {
      return (
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-emerald-400" />
        </div>
      );
    }
    if (currentPop.title.includes('إعجاب')) {
      return (
        <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5 text-rose-400 fill-current" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
        <img src={logoImg} alt="GXE" className="w-6 h-6 object-contain" />
      </div>
    );
  };

  return (
    <aside
      aria-label="إشعار فوري"
      className={`fixed bottom-6 left-6 z-50 max-w-sm w-full transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div
        onClick={handleClick}
        className="cursor-pointer bg-[#0A0C14]/95 backdrop-blur-2xl border border-white/15 hover:border-blue-500/50 rounded-2xl p-3.5 shadow-2xl shadow-black/90 flex items-center gap-3 relative overflow-hidden group select-none transition-all active:scale-98"
      >
        {/* Animated Auto-dismiss countdown bar */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 animate-pop-progress" />

        {/* Sender / App Avatar */}
        {getPopIcon()}

        {/* Text Content */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
              <span>GXE نبض فوري</span>
            </span>
          </div>
          <h4 className="font-bold text-sm text-white truncate">{currentPop.title}</h4>
          <p className="text-xs text-slate-400 truncate leading-tight">{currentPop.body}</p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
          title="إغلاق الإشعار"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
