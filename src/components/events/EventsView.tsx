import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Post, User } from '../../types';
import { toggleLike, deletePost } from '../../services/dbService';

interface EventsViewProps {
  posts: Post[];
  currentUser: User;
  onOpenComposer: () => void;
  onOpenReply: (post: Post) => void;
  onOpenLightbox: (imageUrl: string, imageName?: string, imageSize?: string, content?: string) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  posts,
  currentUser,
  onOpenComposer,
  onOpenReply,
  onOpenLightbox,
  onNotify,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'جميع الأحداث' },
    { id: 'projects', label: 'مشاريع برمجية 🚀' },
    { id: 'updates', label: 'تحديثات تقنية ⚡' },
    { id: 'broadcasts', label: 'إعلانات المجتمع 📢' },
  ];

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  const handleLike = async (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    const isLiked = post.likedBy?.includes(currentUser.id) ?? false;

    if (!isLiked) {
      try {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        confetti({
          particleCount: 20,
          spread: 45,
          origin: {
            x: rect.left / window.innerWidth,
            y: rect.top / window.innerHeight,
          },
          colors: ['#70D6FF', '#FF70A6', '#FFD670'],
          ticks: 100,
        });
      } catch {}
    }

    await toggleLike(post, currentUser);
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الحدث؟')) return;
    try {
      setDeletingId(postId);
      await deletePost(postId);
      if (onNotify) onNotify('تم حذف الحدث بنجاح', 'info');
    } catch {
      if (onNotify) onNotify('تعذر حذف الحدث', 'info');
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = async (post: Post) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${window.location.origin}/#event-${post.id}`);
        if (onNotify) onNotify('تم نسخ رابط الحدث إلى الحافظة! 🔗', 'success');
      }
    } catch {
      if (onNotify) onNotify('تعذر نسخ الرابط', 'info');
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 flex flex-col gap-6">
      {/* Top Showcase Banner */}
      <div className="glass-panel p-5 sm:p-7 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="card-accent-bar" />
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="card-num-badge">PORTFOLIO & EVENTS</span>
            <span className="text-xs font-mono text-gray-400">LIVE FEED</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>ساحة الأحداث والمشاريع</span>
            <Zap className="w-6 h-6 text-[#70D6FF]" />
          </h1>
          <p className="text-sm text-gray-300 leading-relaxed max-w-xl">
            منصة استعراض المشاريع البرمجية المبتكرة، التحديثات التقنية الحية، والنقاشات المباشرة.
          </p>
        </div>

        <button
          onClick={onOpenComposer}
          className="glass-btn-primary px-5 py-2.5 flex items-center gap-2 shrink-0 z-10 text-sm"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>إطلاق حدث جديد</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'glass-btn-primary text-[#07090E]'
                : 'glass-btn-secondary text-gray-300 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-5">
        {posts.length > 0 ? (
          posts.map((post, idx) => {
            const isLiked = post.likedBy?.includes(currentUser.id) ?? false;
            const isOwner = post.author.id === currentUser.id;
            const indexStr = String(idx + 1).padStart(2, '0');

            return (
              <article
                key={post.id}
                className="lineup-card group transition-all duration-300"
              >
                {/* Glowing Top Accent Bar */}
                <div className="card-accent-bar" />

                {/* Top Strip with Number Badge & Category */}
                <div className="card-top-strip">
                  <div className="flex items-center gap-2.5">
                    <span className="card-num-badge">#{indexStr}</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                      حدث تقني
                    </span>
                  </div>
                  <span className="text-xs font-mono text-gray-400">
                    {formatTimeAgo(post.createdAt)}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 flex flex-col gap-4">
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-11 h-11 rounded-2xl object-cover border border-white/20 shadow-md group-hover:border-[#70D6FF]/60 transition-colors"
                        />
                        {post.author.verified && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#70D6FF] text-[#0B0F19] flex items-center justify-center text-[10px] font-black border border-[#0B0F19]">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-white group-hover:text-[#70D6FF] transition-colors">
                          {post.author.name}
                        </span>
                        <span className="text-xs font-mono text-gray-400" dir="ltr">
                          @{post.author.username}
                        </span>
                      </div>
                    </div>

                    {isOwner && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="حذف الحدث"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Event Text Content */}
                  <p className="text-sm sm:text-base text-gray-200 leading-relaxed whitespace-pre-wrap select-text">
                    {post.content}
                  </p>

                  {/* Attached Media / Showcase Screen */}
                  {post.mediaUrl && (
                    <div
                      onClick={() => onOpenLightbox(post.mediaUrl!, post.mediaName, post.mediaSize, post.content)}
                      className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/40 cursor-pointer group/media max-h-96"
                    >
                      <img
                        src={post.mediaUrl}
                        alt={post.mediaName || 'معاينة المشروع'}
                        className="w-full h-auto object-cover max-h-96 group-hover/media:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs font-medium text-white flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-[#70D6FF]" />
                          <span>عرض الصورة بالحجم الكامل</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Interactive Action Bar (Liquid Glass Pill Buttons) */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Like Button */}
                      <button
                        onClick={(e) => handleLike(e, post)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isLiked
                            ? 'bg-[#FF70A6]/20 text-[#FF70A6] border border-[#FF70A6]/40 shadow-sm'
                            : 'glass-btn-secondary text-gray-300 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                        <span>{post.likes || 0}</span>
                      </button>

                      {/* Comments / Hary Button */}
                      <button
                        onClick={() => onOpenReply(post)}
                        className="glass-btn-secondary px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 text-gray-300 hover:text-white"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#70D6FF]" />
                        <span>{post.commentsCount || 0} هاري</span>
                      </button>
                    </div>

                    {/* Share Button */}
                    <button
                      onClick={() => handleShare(post)}
                      className="glass-btn-secondary p-2 rounded-full text-gray-300 hover:text-white"
                      title="مشاركة الحدث"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          /* Clean Empty State (Zero Fake Posts) */
          <div className="glass-panel p-10 sm:p-14 text-center flex flex-col items-center justify-center gap-4 my-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#70D6FF]/20 to-[#FF70A6]/20 border border-white/20 flex items-center justify-center text-[#70D6FF] shadow-lg shadow-[#70D6FF]/10">
              <Zap className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">لا توجد أحداث أو مشاريع منشورة بعد</h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                كن أول من يطلق حدثاً تقنياً، مشروعاً برمجياً، أو فكرة جديدة في ساحة الأحداث! 🚀
              </p>
            </div>
            <button
              onClick={onOpenComposer}
              className="glass-btn-primary px-6 py-2.5 text-sm flex items-center gap-2 mt-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>إطلاق أول حدث 🚀</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
