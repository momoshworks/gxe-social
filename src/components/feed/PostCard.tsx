import React, { useState } from 'react';
import {
  MessageCircle,
  Repeat,
  Heart,
  Bookmark,
  Share,
  MoreHorizontal,
  Trash2,
  Copy,
  Pin,
  ExternalLink,
  Download,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Post, User } from '../../types';
import { toggleLike, toggleRepost, toggleBookmark, deletePost } from '../../services/dbService';
import { downloadFile } from '../../services/storageService';

interface PostCardProps {
  post: Post;
  currentUser: User;
  onOpenReply: (post: Post) => void;
  onOpenLightbox: (imageUrl: string, imageName?: string, imageSize?: string, content?: string) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onOpenReply,
  onOpenLightbox,
  onNotify,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const isLiked = post.likedBy?.includes(currentUser.id) ?? false;
  const isReposted = post.repostedBy?.includes(currentUser.id) ?? false;
  const isBookmarked = post.bookmarkedBy?.includes(currentUser.id) ?? false;
  const isOwner = post.author.id === currentUser.id;

  // Format relative timestamp
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} س`;
    const days = Math.floor(hours / 24);
    return `${days} يوم`;
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiking(true);

    if (!isLiked) {
      // Trigger subtle confetti burst
      try {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        confetti({
          particleCount: 22,
          spread: 45,
          origin: {
            x: rect.left / window.innerWidth,
            y: rect.top / window.innerHeight,
          },
          colors: ['#f91880', '#ff5757', '#e0245e'],
          ticks: 120,
          gravity: 1.2,
          scalar: 0.7,
        });
      } catch (err) {
        // ignore
      }
    }

    await toggleLike(post, currentUser);
    setTimeout(() => setIsLiking(false), 300);
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleRepost(post, currentUser);
    if (onNotify) {
      onNotify(isReposted ? 'تم إلغاء إعادة النشر' : 'تمت إعادة النشر بنجاح 🔁', 'info');
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark(post.id, currentUser.id);
    if (onNotify) {
      onNotify(isBookmarked ? 'تمت إزالة الهارية من المحفوظات' : 'تم حفظ الهارية في العلامات المرجعية 🔖', 'success');
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#post-${post.id}`;
    navigator.clipboard.writeText(shareUrl);
    if (onNotify) onNotify('تم نسخ رابط الهارية إلى الحافظة! 🔗', 'success');
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (window.confirm('هل أنت متأكد من حذف هذه الهارية؟')) {
      await deletePost(post.id);
      if (onNotify) onNotify('تم حذف الهارية بنجاح', 'info');
    }
  };

  const handleQuickDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.mediaUrl) {
      await downloadFile(post.mediaUrl, post.mediaName || 'post-media.png');
      if (onNotify) onNotify('تم بدء تنزيل الملف! 📥', 'success');
    }
  };

  // Highlight hashtags and URLs in text
  const renderFormattedContent = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-[#1d9bf0] hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#1d9bf0] hover:underline inline-flex items-center gap-0.5"
          >
            {part} <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <article
      onClick={() => onOpenReply(post)}
      className="border-b border-[#2f3336] p-4 hover:bg-[#080808]/70 transition-colors cursor-pointer select-none relative group"
    >
      {/* Pinned Post Badge */}
      {post.pinned && (
        <div className="flex items-center gap-2 text-xs text-[#71767b] font-bold mb-2 mr-6">
          <Pin className="w-3.5 h-3.5 text-[#1d9bf0]" />
          <span>هارية مثبتة</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Author Avatar */}
        <img
          src={post.author.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(post.author.id || 'user')}`}
          alt={post.author.name}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(post.author.id || 'user')}`;
          }}
          className="w-10 h-10 rounded-full object-cover shrink-0 select-none hover:opacity-90 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            if (onNotify) onNotify(`الملف الشخصي: @${post.author.username}`, 'info');
          }}
        />

        {/* Content & Actions */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap leading-tight">
              <span className="font-bold text-[#e7e9ea] hover:underline text-sm">
                {post.author.name}
              </span>
              {post.author.verified && (
                <span className="text-[#1d9bf0] text-xs font-bold" title="موثّق">✓</span>
              )}
              <span className="text-xs text-[#71767b]">@{post.author.username}</span>
              <span className="text-xs text-[#71767b]">·</span>
              <span className="text-xs text-[#71767b]">{formatTimeAgo(post.createdAt)}</span>
            </div>

            {/* Post Options Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <div
                  className="absolute left-0 mt-1 w-44 bg-[#000000] border border-[#2f3336] rounded-xl shadow-2xl py-1 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#e7e9ea] hover:bg-[#16181c] w-full text-right"
                  >
                    <Copy className="w-4 h-4 text-[#71767b]" />
                    <span>نسخ رابط الهارية</span>
                  </button>

                  {post.mediaUrl && (
                    <button
                      onClick={handleQuickDownload}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-[#e7e9ea] hover:bg-[#16181c] w-full text-right"
                    >
                      <Download className="w-4 h-4 text-[#1d9bf0]" />
                      <span>تحميل الصورة/الملف</span>
                    </button>
                  )}

                  {isOwner && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-[#f4212e] hover:bg-red-500/10 w-full text-right border-t border-[#2f3336]"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف الهارية</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Post Content Text */}
          <p className="mt-1 text-sm text-[#e7e9ea] leading-relaxed whitespace-pre-wrap break-words">
            {renderFormattedContent(post.content)}
          </p>

          {/* Attached Media (Image / File) */}
          {post.mediaUrl && (
            <div className="mt-3 relative rounded-2xl overflow-hidden border border-[#2f3336] group/media bg-[#0d0f12]">
              {post.mediaType === 'image' || (!post.mediaType && post.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)/i)) ? (
                <div
                  className="relative cursor-pointer max-h-96 overflow-hidden flex items-center justify-center bg-black"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLightbox(post.mediaUrl!, post.mediaName, post.mediaSize, post.content);
                  }}
                >
                  <img
                    src={post.mediaUrl}
                    alt={post.mediaName || 'صورة المنشور'}
                    className="w-full h-auto max-h-96 object-cover hover:scale-[1.01] transition-transform duration-200"
                    loading="lazy"
                  />

                  {/* Direct Download Hover Button overlay */}
                  <button
                    onClick={handleQuickDownload}
                    className="absolute bottom-3 left-3 p-2 rounded-full bg-black/80 hover:bg-black text-white backdrop-blur-md opacity-0 group-hover/media:opacity-100 transition-opacity border border-white/20 shadow-lg"
                    title="تحميل مباشر للجهاز"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Document/File Attachment */
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickDownload(e);
                  }}
                  className="p-3.5 flex items-center justify-between hover:bg-[#16181c] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#1d9bf0]/10 rounded-xl text-[#1d9bf0]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[#e7e9ea] truncate max-w-xs">
                        {post.mediaName || 'مستند مرفق'}
                      </span>
                      {post.mediaSize && (
                        <span className="text-xs text-[#71767b]">{post.mediaSize}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d9bf0] text-white text-xs font-bold rounded-full hover:bg-[#1a8cd8]"
                    title="تحميل"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Social Action Bar */}
          <div className="mt-3 flex items-center justify-between max-w-md text-[#71767b]">
            {/* Reply / Hary */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenReply(post);
              }}
              className="flex items-center gap-1.5 hover:text-[#00f0ff] transition-colors group/btn"
              title="الهاري"
            >
              <div className="p-1.5 rounded-full group-hover/btn:bg-[#00f0ff]/10">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs">{post.commentsCount || 0} هاري</span>
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 transition-colors group/btn ${
                isReposted ? 'text-[#00ba7c]' : 'hover:text-[#00ba7c]'
              }`}
              title="إعادة نشر"
            >
              <div className="p-1.5 rounded-full group-hover/btn:bg-[#00ba7c]/10">
                <Repeat className={`w-4 h-4 ${isReposted ? 'stroke-[2.5]' : ''}`} />
              </div>
              <span className="text-xs">{post.reposts || 0}</span>
            </button>

            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors group/btn ${
                isLiked ? 'text-[#f91880]' : 'hover:text-[#f91880]'
              }`}
              title="إعجاب"
            >
              <div className="p-1.5 rounded-full group-hover/btn:bg-[#f91880]/10">
                <Heart
                  className={`w-4 h-4 transition-transform ${
                    isLiked ? 'fill-current stroke-[2] animate-heart' : ''
                  } ${isLiking ? 'scale-125' : ''}`}
                />
              </div>
              <span className="text-xs">{post.likes || 0}</span>
            </button>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 transition-colors group/btn ${
                isBookmarked ? 'text-[#1d9bf0]' : 'hover:text-[#1d9bf0]'
              }`}
              title="حفظ"
            >
              <div className="p-1.5 rounded-full group-hover/btn:bg-[#1d9bf0]/10">
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </div>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 hover:text-[#1d9bf0] transition-colors group/btn"
              title="مشاركة"
            >
              <div className="p-1.5 rounded-full group-hover/btn:bg-[#1d9bf0]/10">
                <Share className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
