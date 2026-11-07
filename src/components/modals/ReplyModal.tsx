import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, MessageCircle } from 'lucide-react';
import type { Post, Comment, User } from '../../types';
import { subscribeToComments, addComment } from '../../services/dbService';

interface ReplyModalProps {
  post: Post | null;
  currentUser: User;
  onClose: () => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const ReplyModal: React.FC<ReplyModalProps> = ({
  post,
  currentUser,
  onClose,
  onNotify,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!post) return;
    const unsub = subscribeToComments(post.id, (loadedComments) => {
      setComments(loadedComments);
    });
    return () => unsub();
  }, [post]);

  if (!post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting || isSubmittingRef.current) return;

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      await addComment(post, currentUser, replyText.trim());
      setReplyText('');
      if (onNotify) onNotify('تم الفتي بالهاري بنجاح! ⚡', 'success');
    } catch (err) {
      console.error('Failed to add comment:', err);
      if (onNotify) onNotify('تعذر نشر الهاري، يرجى المحاولة ثانية', 'info');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="w-full max-w-xl bg-[#000000] border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3336] bg-[#000000]/90">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-[#e7e9ea] hover:bg-[#181818] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-base text-[#e7e9ea]">الهاري على الهارية</h2>
          </div>
          <span className="text-xs text-[#71767b] flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span className="text-[#00f0ff] font-bold">{comments.length} هاري</span>
          </span>
        </div>

        {/* Scrollable Thread Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Original Post Summary */}
          <div className="relative flex gap-3">
            {/* Connecting Vertical Line */}
            <div className="flex flex-col items-center">
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <div className="w-0.5 flex-1 bg-[#2f3336] my-1.5" />
            </div>

            <div className="flex-1 pb-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[#e7e9ea] text-sm">{post.author.name}</span>
                {post.author.verified && (
                  <span className="text-[#1d9bf0] text-xs font-bold">✓</span>
                )}
                <span className="text-xs text-[#71767b]">@{post.author.username}</span>
              </div>
              <p className="mt-1 text-sm text-[#e7e9ea] leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
              <div className="mt-2 text-xs text-[#71767b]">
                ردًا على <span className="text-[#1d9bf0]">@{post.author.username}</span>
              </div>
            </div>
          </div>

          {/* Previous Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-3 pt-1 border-t border-[#2f3336]/60">
              <h3 className="text-xs font-semibold text-[#71767b] px-1">كل الهاري على البوست ({comments.length}):</h3>
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 bg-[#0d0f12] p-3 rounded-xl border border-[#2f3336]/40">
                  <img
                    src={comment.author.avatar}
                    alt={comment.author.name}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#e7e9ea]">{comment.author.name}</span>
                        <span className="text-[#71767b]">@{comment.author.username}</span>
                      </div>
                      <span className="text-[10px] text-[#71767b]">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-[#e7e9ea] leading-normal">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#71767b] border-t border-[#2f3336]/40">
              لا يوجد هاري بعد على هذه الهارية. افتي بأول هاري وشارك رأيك!
            </div>
          )}
        </div>

        {/* Reply Composer Bar */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-[#2f3336] bg-[#000000]">
          <div className="flex items-start gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div className="flex-1">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="اهري برأيك هنا أو افتي..."
                rows={2}
                className="w-full bg-transparent text-[#e7e9ea] placeholder-[#71767b] resize-none outline-none text-sm leading-relaxed"
                autoFocus
              />
              <div className="flex items-center justify-between pt-2 border-t border-[#2f3336]/40 mt-1">
                <span className="text-xs text-[#71767b]">
                  {280 - replyText.length}
                </span>
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-[#00f0ff] to-[#00ba7c] text-black rounded-full font-black text-xs hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الفتي...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>افتي بالهاري</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
