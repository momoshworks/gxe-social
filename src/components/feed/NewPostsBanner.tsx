import React from 'react';
import { ArrowUp } from 'lucide-react';

interface NewPostsBannerProps {
  count: number;
  onClick: () => void;
}

export const NewPostsBanner: React.FC<NewPostsBannerProps> = ({ count, onClick }) => {
  if (count <= 0) return null;

  return (
    <div className="sticky top-16 z-20 flex justify-center py-2 pointer-events-none animate-bounce">
      <button
        onClick={onClick}
        className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-[#1d9bf0] text-white font-bold text-xs shadow-xl shadow-[#1d9bf0]/25 hover:bg-[#1a8cd8] active:scale-95 transition-all border border-white/20"
      >
        <ArrowUp className="w-3.5 h-3.5" />
        <span>
          {count === 1
            ? 'منشور جديد واحد متوفر 🚀'
            : count === 2
            ? 'منشوران جديدان متوفران 🚀'
            : `إظهار ${count} منشورات جديدة 🚀`}
        </span>
      </button>
    </div>
  );
};
