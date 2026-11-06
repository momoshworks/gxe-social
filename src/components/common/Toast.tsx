import React, { useEffect } from 'react';
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
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#00ba7c]" />,
    error: <AlertCircle className="w-5 h-5 text-[#f4212e]" />,
    info: <Info className="w-5 h-5 text-[#1d9bf0]" />,
  };

  return (
    <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-full bg-[#16181c] border border-[#2f3336] text-[#e7e9ea] shadow-2xl backdrop-blur-md animate-fade-in text-sm font-medium">
      {icons[toast.type || 'info']}
      <span>{toast.text}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[#71767b] hover:text-[#e7e9ea] transition-colors p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
