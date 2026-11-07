import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Paperclip,
  Smile,
  Calendar,
  MapPin,
  X,
  Sparkles,
  Globe,
  Zap,
} from 'lucide-react';
import type { User } from '../../types';
import { uploadMediaFile } from '../../services/storageService';
import { createPost } from '../../services/dbService';

interface PostComposerProps {
  currentUser: User;
  onPostCreated?: () => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  currentUser,
  onPostCreated,
  onNotify,
}) => {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isPublishingRef = useRef(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handlePublish = async () => {
    if ((!content.trim() && !selectedFile) || isSubmitting || isPublishingRef.current) return;

    try {
      isPublishingRef.current = true;
      setIsSubmitting(true);
      let mediaData: { url: string; name: string; size: string; type: 'image' | 'video' | 'file' } | undefined;

      if (selectedFile) {
        setUploadProgress(10);
        mediaData = await uploadMediaFile(selectedFile, (progress) => {
          setUploadProgress(progress);
        });
      }

      await createPost({
        author: currentUser,
        content: content.trim(),
        mediaUrl: mediaData?.url,
        mediaType: mediaData?.type,
        mediaName: mediaData?.name,
        mediaSize: mediaData?.size,
      });

      // Reset
      setContent('');
      removeSelectedFile();
      setUploadProgress(null);

      if (onNotify) onNotify('تم نشر الهارية بنجاح! 🚀', 'success');
      if (onPostCreated) onPostCreated();
    } catch (error) {
      console.error('Failed to publish post:', error);
      if (onNotify) onNotify('حدث خطأ أثناء الهري، حاول مجدداً', 'info');
    } finally {
      isPublishingRef.current = false;
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handlePublish();
    }
  };

  return (
    <div className="border-b border-[#2f3336] p-4 flex gap-3 bg-[#000000]">
      {/* Current User Avatar */}
      <img
        src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.id || 'user')}`}
        alt={currentUser.name}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.id || 'user')}`;
        }}
        className="w-10 h-10 rounded-full object-cover shrink-0 select-none cursor-pointer hover:opacity-90 transition-opacity"
      />

      {/* Composer Body */}
      <div className="flex-1 flex flex-col">
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ماذا يدور في عقلك الآن؟ افتي براحتك..."
          rows={3}
          className="w-full bg-transparent text-[#e7e9ea] placeholder-[#71767b] text-lg outline-none resize-none leading-relaxed border-none focus:ring-0"
        />

        {/* Image Preview Box with 1-click remove button */}
        {selectedFile && (
          <div className="relative my-3 rounded-2xl overflow-hidden border border-[#2f3336] max-h-96 bg-[#16181c]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="معاينة الصورة قبل النشر"
                className="w-full h-auto max-h-80 object-cover rounded-2xl"
              />
            ) : (
              <div className="p-4 flex items-center justify-between text-sm text-[#e7e9ea]">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-[#1d9bf0]" />
                  <span className="font-medium truncate max-w-xs">{selectedFile.name}</span>
                </div>
                <span className="text-xs text-[#71767b]">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}

            {/* 1-Click Remove Button */}
            <button
              onClick={removeSelectedFile}
              className="absolute top-3 right-3 p-1.5 bg-black/75 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-transform hover:scale-110 shadow-lg border border-white/20"
              title="إزالة الوسائط"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="my-2">
            <div className="flex justify-between text-xs text-[#1d9bf0] mb-1 font-semibold">
              <span>جاري رفع الوسائط إلى السحابة...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#2f3336] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1d9bf0] transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Who can reply indicator */}
        <div className="pb-3 border-b border-[#2f3336]/60 flex items-center gap-1.5 text-xs text-[#1d9bf0] font-bold cursor-pointer hover:bg-[#1d9bf0]/10 px-2 py-1 rounded-full w-fit transition-colors">
          <Globe className="w-3.5 h-3.5" />
          <span>يمكن للجميع الرد</span>
        </div>

        {/* Toolbar & Publish Action */}
        <div className="pt-3 flex items-center justify-between">
          {/* Media action buttons */}
          <div className="flex items-center gap-1 text-[#1d9bf0]">
            {/* Image Upload Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
              title="رفع صورة"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Documents / File Upload */}
            <input
              ref={docInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => docInputRef.current?.click()}
              className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
              title="إرفاق ملف أو مستند"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              onClick={() => setContent((c) => c + ' 😊')}
              className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
              title="إيموجي"
            >
              <Smile className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => onNotify && onNotify('ميزة جدولة الهري قادمة قريباً!', 'info')}
              className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
              title="جدولة الهري"
            >
              <Calendar className="w-5 h-5" />
            </button>

            <button
              onClick={() => onNotify && onNotify('تمت إضافة الموقع الجغرافي: القاهرة 📍', 'info')}
              className="p-2 hover:bg-[#1d9bf0]/10 rounded-full transition-colors"
              title="الموقع الجغرافي"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>

          {/* Right Action: Publish button */}
          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span className="text-xs text-[#71767b]">
                {280 - content.length}
              </span>
            )}
            <button
              type="button"
              onClick={handlePublish}
              disabled={(!content.trim() && !selectedFile) || isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#00f0ff] via-[#00ba7c] to-[#00f0ff] hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-black font-extrabold text-sm rounded-full transition-all shadow-md shadow-[#00f0ff]/20 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>جاري الفتي...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>افتي ⚡</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
