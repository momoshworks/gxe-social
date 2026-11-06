import React, { useState, useRef } from 'react';
import { X, Camera, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
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
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar);
  const [coverUrl, setCoverUrl] = useState(currentUser.coverUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const res = await uploadMediaFile(file);
      setAvatarUrl(res.url);
      if (onNotify) onNotify('تم اختيار الصورة الشخصية الجديدة', 'success');
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      if (onNotify) onNotify('تعذر رفع الصورة، حاول ثانية', 'info');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCover(true);
      const res = await uploadMediaFile(file);
      setCoverUrl(res.url);
      if (onNotify) onNotify('تم اختيار صورة الغلاف الجديدة بنجاح', 'success');
    } catch (err) {
      console.error('Failed to upload cover:', err);
      if (onNotify) onNotify('تعذر رفع الغلاف', 'info');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || currentUser.username;

    try {
      setIsSaving(true);
      const updatedUser: User = {
        ...currentUser,
        name: name.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        avatar: avatarUrl,
        coverUrl: coverUrl || undefined,
      };

      await updateUserProfile(currentUser.id, {
        name: updatedUser.name,
        username: updatedUser.username,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        coverUrl: updatedUser.coverUrl,
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
        className="w-full max-w-lg bg-[#000000] border border-[#2f3336] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f3336] bg-[#000000] sticky top-0 z-10">
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
            disabled={!name.trim() || isSaving || isUploadingAvatar || isUploadingCover}
            className="px-5 py-1.5 bg-white hover:bg-gray-200 text-black font-bold text-xs rounded-full disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isSaving ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>حفظ التعديلات</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="overflow-y-auto">
          {/* Cover Photo Upload Banner */}
          <div className="relative h-36 bg-gradient-to-r from-[#1d9bf0]/40 via-[#00ba7c]/20 to-[#16181c] flex items-center justify-center group">
            {coverUrl && (
              <img src={coverUrl} alt="صورة الغلاف" className="w-full h-full object-cover" />
            )}
            <div
              className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => coverInputRef.current?.click()}
            >
              <div className="p-3 bg-black/60 rounded-full text-white backdrop-blur-sm border border-white/20 hover:scale-110 transition-transform">
                {isUploadingCover ? (
                  <Sparkles className="w-5 h-5 animate-spin" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Avatar Upload Preview (Overlapping cover) */}
            <div className="relative -mt-12 mb-2 w-fit">
              <div
                className="relative group cursor-pointer w-24 h-24 rounded-full border-4 border-black bg-black overflow-hidden shadow-xl"
                onClick={() => avatarInputRef.current?.click()}
              >
                <img
                  src={avatarUrl}
                  alt="الصورة الشخصية"
                  className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingAvatar ? (
                    <Sparkles className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-xs font-semibold text-[#71767b] mb-1">الاسم الكامل *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                required
                className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl px-4 py-2.5 text-sm text-[#e7e9ea] outline-none focus:border-[#1d9bf0]"
              />
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold text-[#71767b] mb-1">المعرّف (@username)</label>
              <div className="flex items-center bg-[#16181c] border border-[#2f3336] rounded-xl px-4 py-2.5 focus-within:border-[#1d9bf0]">
                <span className="text-[#71767b] text-sm ml-1">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="w-full bg-transparent text-sm text-[#e7e9ea] outline-none"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Bio Field */}
            <div>
              <label className="block text-xs font-semibold text-[#71767b] mb-1">النبذة التعريفية (Bio)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                placeholder="اكتب نبذة عنك، اهتماماتك أو مجالك..."
                className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl px-4 py-2.5 text-sm text-[#e7e9ea] placeholder-[#71767b] outline-none resize-none focus:border-[#1d9bf0]"
              />
              <span className="text-[11px] text-[#71767b] text-left block mt-1">
                {160 - bio.length} حرف متبقي
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
