import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  // Keep only the most recent 3 toasts to prevent screen clutter
  const visibleToasts = toasts.slice(-3);

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-4 sm:left-6 z-[70] flex flex-col gap-2 pointer-events-none items-start max-w-sm w-auto select-none"
    >
      {visibleToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Quick enter trigger
    const enterTimer = requestAnimationFrame(() => setIsRendered(true));

    // Fast auto-dismiss (1.8s) as requested
    const exitTimer = setTimeout(() => {
      handleClose();
    }, 1800);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [toast.id]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 180);
  };

  const config = {
    success: {
      border: 'border-emerald-500/40 hover:border-emerald-400/60',
      glow: 'shadow-emerald-500/15',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      bar: 'bg-emerald-400/60',
    },
    error: {
      border: 'border-rose-500/40 hover:border-rose-400/60',
      glow: 'shadow-rose-500/15',
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      bar: 'bg-rose-400/60',
    },
    info: {
      border: 'border-cyan-500/40 hover:border-cyan-400/60',
      glow: 'shadow-cyan-500/15',
      badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      icon: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
      bar: 'bg-cyan-400/60',
    },
  }[toast.type || 'info'];

  const isVisible = isRendered && !isExiting;

  return (
    <div
      role="status"
      className={`
        pointer-events-auto relative overflow-hidden flex items-center gap-2.5 px-3.5 py-2 rounded-2xl
        bg-[#090C15]/95 border ${config.border} text-white shadow-xl ${config.glow} backdrop-blur-2xl
        text-xs sm:text-sm font-medium transition-all duration-200 ease-out
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : '-translate-x-8 opacity-0 scale-95'}
      `}
      style={{ direction: 'rtl' }}
    >
      {/* Rapid countdown indicator */}
      <div
        className={`absolute bottom-0 inset-x-0 h-[2px] ${config.bar} transition-all duration-[1800ms] ease-linear`}
        style={{ width: isVisible ? '0%' : '100%' }}
      />

      <div className={`p-1 rounded-lg border ${config.badge}`}>
        {config.icon}
      </div>

      <span className="text-slate-100 leading-snug">{toast.text}</span>

      <button
        onClick={handleClose}
        className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0 mr-1"
        title="إغلاق"
        aria-label="إغلاق الإشعار"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
