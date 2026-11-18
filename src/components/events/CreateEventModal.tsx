import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Sparkles, Send, Zap } from 'lucide-react';
import type { User } from '../../types';
import { uploadMediaFile } from '../../services/storageService';
import { createPost } from '../../services/dbService';

interface CreateEventModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onNotify,
}) => {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPublishingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !selectedFile) || isSubmitting || isPublishingRef.current) return;

    try {
      isPublishingRef.current = true;
      setIsSubmitting(true);

      let mediaData: { url: string; name: string; size: string; type: 'image' | 'video' | 'file' } | undefined;

      if (selectedFile) {
        mediaData = await uploadMediaFile(selectedFile);
      }

      const text = content.trim();
      setContent('');
      removeFile();

      await createPost({
        author: currentUser,
        content: text,
        mediaUrl: mediaData?.url,
        mediaType: mediaData?.type,
        mediaName: mediaData?.name,
        mediaSize: mediaData?.size,
      });

      if (onNotify) onNotify('تم إطلاق الحدث بنجاح في الساحة! 🚀', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
      if (onNotify) onNotify('حدث خطأ أثناء إطلاق الحدث، حاول مجدداً', 'info');
    } finally {
      isPublishingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg glass-panel shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-accent-bar" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-white">إطلاق حدث أو مشروع جديد</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePublish} className="p-5 flex flex-col gap-4">
          {/* Author snippet */}
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-2xl object-cover border border-white/20"
            />
            <div>
              <span className="text-sm font-bold text-white block">{currentUser.name}</span>
              <span className="text-xs font-mono text-gray-400" dir="ltr">@{currentUser.username}</span>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="اكتب تفاصيل الحدث، التحديث التقني، أو رابط المشروع..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder-gray-400 outline-none focus:border-blue-500/50 transition-colors leading-relaxed resize-none"
            autoFocus
          />

          {/* Image Preview if selected */}
          {previewUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/40 max-h-52">
              <img src={previewUrl} alt="معاينة" className="w-full h-auto object-cover max-h-52" />
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 left-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="glass-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 text-gray-300 hover:text-white"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>إرفاق صورة / لقطة شاشة</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={(!content.trim() && !selectedFile) || isSubmitting}
              className="glass-btn-primary px-5 py-2 text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الإطلاق...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>إطلاق الحدث 🚀</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
