import React, { useState } from 'react';
import { Calendar, Edit3, Image as ImageIcon, Heart, MessageSquare } from 'lucide-react';
import type { Post, User } from '../../types';
import { PostCard } from '../feed/PostCard';
import { EditProfileModal } from '../modals/EditProfileModal';
import { FollowListModal } from '../modals/FollowListModal';

interface ProfileViewProps {
  currentUser: User;
  posts: Post[];
  communityUsers?: User[];
  onOpenReply: (post: Post) => void;
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
  onOpenReply,
  onOpenLightbox,
  onProfileUpdated,
  onToggleFollow,
  onStartChat,
  onOpenAuth,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'likes'>('posts');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('following');

  const openFollowModal = (tab: 'followers' | 'following') => {
    setFollowModalTab(tab);
    setIsFollowModalOpen(true);
  };

  // Filter posts
  const myPosts = posts.filter((p) => p.author.id === currentUser.id);
  const myMedia = posts.filter((p) => p.author.id === currentUser.id && p.mediaUrl);
  const myLikedPosts = posts.filter((p) => p.likedBy?.includes(currentUser.id));

  const displayedPosts =
    activeTab === 'posts' ? myPosts : activeTab === 'media' ? myMedia : myLikedPosts;

  const joinDate = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
    : 'نوفمبر 2026';

  return (
    <main className="flex-1 min-h-screen border-x border-[#2f3336] max-w-2xl w-full bg-[#000000]">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-[#000000]/80 backdrop-blur-md border-b border-[#2f3336] px-4 py-2 flex items-center gap-6">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-lg text-[#e7e9ea]">{currentUser.name}</h1>
            {currentUser.verified && <span className="text-[#1d9bf0] text-xs font-bold">✓</span>}
          </div>
          <span className="text-xs text-[#71767b]">{myPosts.length} هارية</span>
        </div>
      </div>

      {/* Cover Banner */}
      <div className="h-36 sm:h-48 bg-gradient-to-r from-[#1d9bf0]/30 via-[#00ba7c]/20 to-[#16181c] relative overflow-hidden">
        {currentUser.coverUrl && (
          <img src={currentUser.coverUrl} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Profile Details Container */}
      <div className="px-4 pb-4">
        {/* Avatar & Edit Action */}
        <div className="flex justify-between items-end relative -mt-14 sm:-mt-16 mb-4">
          <img
            src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.id || 'user')}`}
            alt={currentUser.name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.id || 'user')}`;
            }}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-black bg-black shadow-xl"
          />
          <div className="flex items-center gap-2">
            {!currentUser.email && onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <span>تسجيل الدخول</span>
              </button>
            )}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full border border-[#536471] hover:bg-[#181818] text-[#e7e9ea] font-bold text-xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>تعديل الملف</span>
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-black text-[#e7e9ea]">{currentUser.name}</h2>
              {currentUser.verified && <span className="text-[#1d9bf0] text-sm font-bold">✓</span>}
            </div>
            <p className="text-xs text-[#71767b]">@{currentUser.username}</p>
          </div>

          <p className="text-sm text-[#e7e9ea] leading-relaxed whitespace-pre-wrap">
            {currentUser.bio || 'لا توجد نبذة تعريفية بعد.'}
          </p>

          <div className="flex items-center gap-4 text-xs text-[#71767b]">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>انضم في {joinDate}</span>
            </div>
          </div>

          {/* Followers & Following Counters (Interactive & Clickable!) */}
          <div className="flex items-center gap-5 text-xs select-none">
            <button
              onClick={() => openFollowModal('following')}
              className="hover:underline flex items-center gap-1.5 text-[#71767b] cursor-pointer group"
              title="عرض قائمة الحسابات التي تتابعها"
            >
              <strong className="text-[#e7e9ea] font-bold group-hover:text-[#1d9bf0] transition-colors">
                {currentUser.followingCount ?? currentUser.following?.length ?? 0}
              </strong>
              <span>يُتابع (أتابعهم)</span>
            </button>

            <button
              onClick={() => openFollowModal('followers')}
              className="hover:underline flex items-center gap-1.5 text-[#71767b] cursor-pointer group"
              title="عرض قائمة المتابعين لحسابك"
            >
              <strong className="text-[#e7e9ea] font-bold group-hover:text-[#1d9bf0] transition-colors">
                {currentUser.followersCount ?? currentUser.followers?.length ?? 0}
              </strong>
              <span>المتابعون (يتابعونني)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2f3336] text-sm font-semibold">
        <button
          onClick={() => setActiveTab('posts')}
          className="flex-1 py-3 text-center hover:bg-[#181818] transition-colors relative flex items-center justify-center gap-1.5"
        >
          <span className={activeTab === 'posts' ? 'text-[#e7e9ea] font-bold' : 'text-[#71767b]'}>
            الهري ({myPosts.length})
          </span>
          {activeTab === 'posts' && <span className="absolute bottom-0 h-1 w-16 bg-[#1d9bf0] rounded-full" />}
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className="flex-1 py-3 text-center hover:bg-[#181818] transition-colors relative flex items-center justify-center gap-1.5"
        >
          <span className={activeTab === 'media' ? 'text-[#e7e9ea] font-bold' : 'text-[#71767b]'}>
            الوسائط ({myMedia.length})
          </span>
          {activeTab === 'media' && <span className="absolute bottom-0 h-1 w-16 bg-[#1d9bf0] rounded-full" />}
        </button>

        <button
          onClick={() => setActiveTab('likes')}
          className="flex-1 py-3 text-center hover:bg-[#181818] transition-colors relative flex items-center justify-center gap-1.5"
        >
          <span className={activeTab === 'likes' ? 'text-[#e7e9ea] font-bold' : 'text-[#71767b]'}>
            الإعجابات ({myLikedPosts.length})
          </span>
          {activeTab === 'likes' && <span className="absolute bottom-0 h-1 w-16 bg-[#1d9bf0] rounded-full" />}
        </button>
      </div>

      {/* Posts Stream */}
      {displayedPosts.length > 0 ? (
        <div className="divide-y divide-[#2f3336]/60">
          {displayedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onOpenReply={onOpenReply}
              onOpenLightbox={onOpenLightbox}
              onNotify={onNotify}
            />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center text-[#71767b] flex flex-col items-center justify-center gap-2">
          {activeTab === 'posts' ? (
            <>
              <MessageSquare className="w-12 h-12 text-[#2f3336]" />
              <p className="text-sm font-semibold text-[#e7e9ea]">لم تهري أي شيء بعد</p>
              <p className="text-xs">شارك أول هارية لك مع مجتمع GXE!</p>
            </>
          ) : activeTab === 'media' ? (
            <>
              <ImageIcon className="w-12 h-12 text-[#2f3336]" />
              <p className="text-sm font-semibold text-[#e7e9ea]">لا توجد صور أو وسائط</p>
              <p className="text-xs">الصور التي ترفعها مع الهري ستظهر هنا.</p>
            </>
          ) : (
            <>
              <Heart className="w-12 h-12 text-[#2f3336]" />
              <p className="text-sm font-semibold text-[#e7e9ea]">لا توجد إعجابات بعد</p>
              <p className="text-xs">الهري الذي يعجبك سيظهر في هذا التبويب.</p>
            </>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        currentUser={currentUser}
        onClose={() => setIsEditModalOpen(false)}
        onProfileUpdated={onProfileUpdated}
        onNotify={onNotify}
      />

      {/* Followers & Following List Modal */}
      <FollowListModal
        isOpen={isFollowModalOpen}
        initialTab={followModalTab}
        profileUser={currentUser}
        currentUser={currentUser}
        communityUsers={communityUsers}
        onClose={() => setIsFollowModalOpen(false)}
        onToggleFollow={onToggleFollow || (() => {})}
        onStartChat={onStartChat}
      />
    </main>
  );
};
