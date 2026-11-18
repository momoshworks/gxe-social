import React, { useState } from 'react';
import { Calendar, Edit3, Heart, MessageSquare } from 'lucide-react';
import type { Post, User } from '../../types';
import { EditProfileModal } from '../modals/EditProfileModal';
import { FollowListModal } from '../modals/FollowListModal';

interface ProfileViewProps {
  currentUser: User;
  posts: Post[];
  communityUsers?: User[];
  onOpenReply?: (post: Post) => void;
  onOpenLightbox: (imageUrl: string, imageName?: string, imageSize?: string, content?: string) => void;
  onProfileUpdated: (user: User) => void;
  onToggleFollow?: (user: User) => void;
  onStartChat?: (user: User) => void;
  onOpenAuth?: () => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  posts,
  communityUsers = [],
  onOpenLightbox,
  onProfileUpdated,
  onToggleFollow,
  onStartChat,
  onOpenAuth,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'media' | 'likes'>('events');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('following');

  const openFollowModal = (tab: 'followers' | 'following') => {
    setFollowModalTab(tab);
    setIsFollowModalOpen(true);
  };

  // Filter posts safely
  const myEvents = posts.filter((p) => p?.author?.id === currentUser?.id);
  const myMedia = posts.filter((p) => p?.author?.id === currentUser?.id && p?.mediaUrl);
  const myLiked = posts.filter((p) => p?.likedBy?.includes(currentUser?.id));

  const displayedEvents =
    activeTab === 'events' ? myEvents : activeTab === 'media' ? myMedia : myLiked;

  const joinDate = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
    : 'نوفمبر 2026';

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 flex flex-col gap-6">
      {/* Profile Card */}
      <div className="lineup-card overflow-hidden relative">
        <div className="card-accent-bar" />

        {/* Cover Canvas with Aurora Gradient */}
        <div className="h-40 sm:h-52 bg-gradient-to-r from-blue-600/20 via-slate-800/40 to-indigo-600/15 relative overflow-hidden">
          {currentUser.coverUrl && (
            <img src={currentUser.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090C]/80 to-transparent" />
        </div>

        {/* Profile Info Header */}
        <div className="px-5 sm:px-8 pb-6 relative">
          {/* Avatar & Edit Actions */}
          <div className="flex justify-between items-end -mt-16 sm:-mt-20 mb-4">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-[#08090C] shadow-2xl bg-[#08090C]"
              />
              {currentUser.verified && (
                <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-black border-2 border-[#08090C]">
                  ✓
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="glass-btn-secondary px-4 py-2 text-xs flex items-center gap-2"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل الملف</span>
              </button>

              {!currentUser.email && onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="glass-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <span>تسجيل الدخول</span>
                </button>
              )}
            </div>
          </div>

          {/* User Bio and Credentials */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">{currentUser.name}</h1>
                <span className="card-num-badge">PROFILE</span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5" dir="ltr">
                @{currentUser.username}
              </p>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-w-2xl">
              {currentUser.bio || 'لا توجد نبذة تعريفية بعد.'}
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-white/10 text-xs text-slate-400">
              <button
                onClick={() => openFollowModal('followers')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <span className="font-bold text-white ml-1 font-mono">
                  {currentUser.followersCount || currentUser.followers?.length || 0}
                </span>
                <span>متابِع</span>
              </button>

              <button
                onClick={() => openFollowModal('following')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <span className="font-bold text-white ml-1 font-mono">
                  {currentUser.followingCount || currentUser.following?.length || 0}
                </span>
                <span>يتابع</span>
              </button>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>انضم في {joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-t border-white/10 px-5 sm:px-8 bg-white/[0.02]">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-3 px-4 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            الأحداث المنشورة ({myEvents.length})
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`py-3 px-4 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'media'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            الوسائط والصور ({myMedia.length})
          </button>

          <button
            onClick={() => setActiveTab('likes')}
            className={`py-3 px-4 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'likes'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            الأحداث المعجب بها ({myLiked.length})
          </button>
        </div>
      </div>

      {/* Events Stream in Profile */}
      <div className="space-y-4">
        {displayedEvents.length > 0 ? (
          displayedEvents.map((event) => (
            <div key={event.id} className="lineup-card p-5 group">
              <div className="card-accent-bar" />
              <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                <span className="card-num-badge">EVENT</span>
                <span>{new Date(event.createdAt).toLocaleDateString('ar-EG')}</span>
              </div>

              <p className="text-sm text-slate-200 leading-relaxed mb-3 whitespace-pre-wrap">
                {event.content}
              </p>

              {event.mediaUrl && (
                <div
                  onClick={() => onOpenLightbox(event.mediaUrl!)}
                  className="rounded-2xl overflow-hidden border border-white/10 cursor-pointer max-h-72 mb-3"
                >
                  <img src={event.mediaUrl} alt="وسائط" className="w-full h-auto object-cover max-h-72" />
                </div>
              )}

              <div className="flex items-center gap-4 pt-2 border-t border-white/10 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-rose-400">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span>{event.likes || 0}</span>
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{event.commentsCount || 0} هاري</span>
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel p-8 text-center text-xs text-gray-400">
            لا توجد عناصر لعرضها في هذا القسم.
          </div>
        )}
      </div>

      {/* Modals */}
      {isEditModalOpen && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          currentUser={currentUser}
          onClose={() => setIsEditModalOpen(false)}
          onProfileUpdated={onProfileUpdated}
          onNotify={onNotify}
        />
      )}

      {isFollowModalOpen && (
        <FollowListModal
          isOpen={isFollowModalOpen}
          onClose={() => setIsFollowModalOpen(false)}
          profileUser={currentUser}
          currentUser={currentUser}
          communityUsers={communityUsers}
          initialTab={followModalTab}
          onToggleFollow={onToggleFollow || (() => {})}
          onStartChat={onStartChat}
        />
      )}
    </div>
  );
};
