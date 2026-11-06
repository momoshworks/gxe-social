import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export const PwaUpdatePrompt: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setShowUpdate(true);
              }
            });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#1d9bf0] text-white shadow-xl shadow-[#1d9bf0]/20 font-medium text-sm border border-white/20">
        <Sparkles className="w-4 h-4" />
        <span>تحديث جديد متوفر للتطبيق!</span>
        <button
          onClick={handleUpdate}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#1d9bf0] font-bold text-xs hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحديث الآن</span>
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="p-1 hover:bg-black/10 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
