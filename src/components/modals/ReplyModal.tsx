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
      const textToReply = replyText.trim();
      setReplyText('');

      await addComment(post, currentUser, textToReply);
      if (onNotify) onNotify('تم نشر الهاري بنجاح! ⚡', 'success');
    } catch (err) {
      console.error('Failed to add comment:', err);
      if (onNotify) onNotify('تعذر نشر الهاري، يرجى المحاولة ثانية', 'info');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-xl glass-panel shadow-2xl overflow-hidden flex flex-col max-h-[88vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-accent-bar" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-base text-white">الهاري على الحدث</h2>
          </div>
          <span className="text-xs font-mono text-blue-400 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{comments.length} هاري</span>
          </span>
        </div>

        {/* Scrollable Thread Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Original Event Summary */}
          <div className="relative flex gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-10 h-10 rounded-2xl object-cover shrink-0 border border-white/20"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm">{post.author.name}</span>
                {post.author.verified && (
                  <span className="text-blue-400 text-xs font-bold">✓</span>
                )}
                <span className="text-xs font-mono text-gray-400">@{post.author.username}</span>
              </div>
              <p className="mt-1 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            </div>
          </div>

          {/* Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-mono text-gray-400 px-1">
                النقاشات والتعليقات ({comments.length}):
              </h3>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10"
                >
                  <img
                    src={comment.author.avatar}
                    alt={comment.author.name}
                    className="w-8 h-8 rounded-xl object-cover shrink-0 border border-white/20"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{comment.author.name}</span>
                        <span className="text-gray-400 font-mono">@{comment.author.username}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        {new Date(comment.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 leading-normal whitespace-pre-wrap">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              لا توجد ردود بعد على هذا الحدث. كن أول من يفتي برأيه! 💬
            </div>
          )}
        </div>

        {/* Reply Composer Bar */}
        <form onSubmit={handleSubmit} className="p-3.5 px-5 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-2xl object-cover shrink-0 border border-white/20"
            />
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="اكتب هاري أو تعليق هنا..."
              className="flex-1 bg-white/5 border border-white/10 rounded-full py-2 px-4 text-sm text-white placeholder-gray-400 outline-none focus:border-blue-500/50 transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className="glass-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>افتي</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
