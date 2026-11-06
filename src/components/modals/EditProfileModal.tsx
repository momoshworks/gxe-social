import React, { useState, useRef } from 'react';
import { X, Camera, Sparkles, Check } from 'lucide-react';
import type { User } from '../../types';
import { updateUserProfile } from '../../services/dbService';
import { uploadMediaFile } from '../../services/storageService';
import { saveLocalUser } from '../../services/authService';

interface EditProfileModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onProfileUpdated: (user: User) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onProfileUpdated,
  onNotify,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadMediaFile(file);
      setAvatarUrl(res.url);
      if (onNotify) onNotify('تم رفع الصورة الشخصية الجديدة بنجاح', 'success');
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      if (onNotify) onNotify('تعذر رفع الصورة، حاول ثانية', 'info');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    try {
      setIsSaving(true);
      const updatedUser: User = {
        ...currentUser,
        name: name.trim(),
        bio: bio.trim(),
        avatar: avatarUrl,
      };

      await updateUserProfile(currentUser.id, {
        name: updatedUser.name,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
      });

      saveLocalUser(updatedUser);
      onProfileUpdated(updatedUser);
      if (onNotify) onNotify('تم تحديث ملفك الشخصي في السحابة بنجاح! ✨', 'success');
      onClose();
    } catch (err) {
      console.error('Save profile error:', err);
      if (onNotify) onNotify('حدث خطأ أثناء حفظ الملف الشخصي', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div
        className="w-full max-w-lg bg-[#000000] border border-[#2f3336] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f3336]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 text-[#71767b] hover:text-[#e7e9ea] hover:bg-[#181818] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-base text-[#e7e9ea]">تعديل الملف الشخصي</h2>
          </div>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving || isUploading}
            className="px-5 py-1.5 bg-white hover:bg-gray-200 text-black font-bold text-xs rounded-full disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isSaving ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>حفظ</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Avatar Upload Preview */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img
                src={avatarUrl}
                alt="الصورة الشخصية"
                className="w-24 h-24 rounded-full object-cover border-4 border-[#16181c] group-hover:opacity-75 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Sparkles className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <span className="text-xs text-[#1d9bf0] mt-2 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
              تغيير الصورة الشخصية
            </span>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-[#71767b] mb-1">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl px-4 py-2.5 text-sm text-[#e7e9ea] outline-none focus:border-[#1d9bf0]"
            />
          </div>

          {/* Bio Field */}
          <div>
            <label className="block text-xs font-semibold text-[#71767b] mb-1">النبذة التعريفية (Bio)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="اكتب نبذة عنك..."
              className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl px-4 py-2.5 text-sm text-[#e7e9ea] placeholder-[#71767b] outline-none resize-none focus:border-[#1d9bf0]"
            />
            <span className="text-[11px] text-[#71767b] text-left block mt-1">
              {160 - bio.length} حرف متبقي
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
