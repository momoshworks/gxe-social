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
          className="w-10 h-10 rounded-full object-cover border border-[#00f0ff]/40 shadow-md shadow-[#00f0ff]/20 shrink-0"
        />
      );
    }
    if (currentPop.title.includes('رسالة')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#00ba7c]/20 border border-[#00ba7c]/40 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-[#00ba7c]" />
        </div>
      );
    }
    if (currentPop.title.includes('إعجاب')) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#f91880]/20 border border-[#f91880]/40 flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5 text-[#f91880] fill-current" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-[#00f0ff]/20 border border-[#00f0ff]/40 flex items-center justify-center shrink-0">
        <img src={logoImg} alt="GXE" className="w-6 h-6 object-contain" />
      </div>
    );
  };

  return (
    <aside
      aria-label="إشعار فوري"
      className={`fixed top-3 inset-x-0 mx-auto z-50 max-w-md px-4 transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div
        onClick={handleClick}
        className="cursor-pointer bg-[#0c0d12]/95 backdrop-blur-xl border border-[#00f0ff]/30 hover:border-[#00f0ff]/60 rounded-2xl p-3 shadow-2xl shadow-black/80 flex items-center gap-3 relative overflow-hidden group select-none transition-all active:scale-98"
      >
        {/* Animated Auto-dismiss countdown bar */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-[#00f0ff] via-[#00ba7c] to-[#00f0ff] animate-pop-progress" />

        {/* Sender / App Avatar */}
        {getPopIcon()}

        {/* Text Content */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#00f0ff] animate-pulse" />
              <span>GXE نبض فوري</span>
            </span>
          </div>
          <h4 className="font-bold text-sm text-[#ffffff] truncate">{currentPop.title}</h4>
          <p className="text-xs text-[#a0a5ad] truncate leading-tight">{currentPop.body}</p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="p-1.5 text-[#71767b] hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
          title="إغلاق الإشعار"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
