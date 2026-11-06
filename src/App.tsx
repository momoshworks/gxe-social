import React, { useState, useEffect } from 'react';
import type { Post, User, AppNotification, Trend } from './types';
import {
  subscribeToPosts,
  subscribeToNotifications,
  extractTrendsFromPosts,
  toggleFollowUser,
} from './services/dbService';
import { subscribeToAuthState, logoutUser } from './services/authService';
import { subscribeToCommunityUsers } from './services/messageService';
import { NavigationSidebar } from './components/layout/NavigationSidebar';
import { MainFeed } from './components/feed/MainFeed';
import { ExploreView } from './components/explore/ExploreView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { MessagesView } from './components/messages/MessagesView';
import { BookmarksView } from './components/bookmarks/BookmarksView';
import { ProfileView } from './components/profile/ProfileView';
import { TrendsSidebar } from './components/layout/TrendsSidebar';
import { ImageLightbox } from './components/modals/ImageLightbox';
import { ReplyModal } from './components/modals/ReplyModal';
import { CloudSettingsModal } from './components/modals/CloudSettingsModal';
import { AuthModal } from './components/modals/AuthModal';
import { Toast, type ToastMessage } from './components/common/Toast';
import { PwaUpdatePrompt } from './components/common/PwaUpdatePrompt';
import { Home, Hash, Bell, Mail, Feather, User as UserIcon } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'guest_user_' + Math.floor(1000 + Math.random() * 9000),
    name: 'مستخدم GXE',
    username: 'gxe_user',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    verified: true,
    bio: 'عضو في مجتمع GXE السحابي ⚡',
    following: [],
    followers: [],
    followingCount: 0,
    followersCount: 0,
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [communityUsers, setCommunityUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [lightboxData, setLightboxData] = useState<{
    url: string | null;
    name?: string;
    size?: string;
    content?: string;
  }>({ url: null });

  const [replyingPost, setReplyingPost] = useState<Post | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Subscribe to Auth State (Google / Email)
  useEffect(() => {
    const unsub = subscribeToAuthState((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time posts from ALL users across the platform
  useEffect(() => {
    const unsubscribe = subscribeToPosts((updatedPosts) => {
      setPosts(updatedPosts);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time Notifications for current user
  useEffect(() => {
    if (!currentUser.id) return;
    const unsub = subscribeToNotifications(currentUser.id, (loadedNotifs) => {
      setNotifications(loadedNotifs);
    });
    return () => unsub();
  }, [currentUser.id]);

  // Subscribe to community registered members
  useEffect(() => {
    const unsub = subscribeToCommunityUsers((users) => {
      setCommunityUsers(users);
    });
    return () => unsub();
  }, []);

  // Calculate dynamic trends from actual posts
  const dynamicTrends: Trend[] = extractTrendsFromPosts(posts);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenLightbox = (imageUrl: string, imageName?: string, imageSize?: string, content?: string) => {
    setLightboxData({ url: imageUrl, name: imageName, size: imageSize, content });
  };

  const handleCloseLightbox = () => {
    setLightboxData({ url: null });
  };

  const handleSelectTag = (tag: string) => {
    setSearchQuery(tag);
    setActiveTab('explore');
    addToast(`تم تصفية المنشورات بواسطة ${tag}`, 'info');
  };

  const handleToggleFollow = async (targetUser: User) => {
    const isNowFollowing = await toggleFollowUser(currentUser, targetUser);
    const updatedFollowing = isNowFollowing
      ? [...(currentUser.following || []), targetUser.id]
      : (currentUser.following || []).filter((id) => id !== targetUser.id);

    setCurrentUser((prev) => ({
      ...prev,
      following: updatedFollowing,
      followingCount: Math.max(0, (prev.followingCount || 0) + (isNowFollowing ? 1 : -1)),
    }));

    addToast(
      isNowFollowing ? `أصبحت تتابع ${targetUser.name} الآن!` : `ألغيت متابعة ${targetUser.name}`,
      'info'
    );
  };

  const handleLogout = async () => {
    await logoutUser();
    addToast('تم تسجيل الخروج بنجاح', 'info');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#000000] text-[#e7e9ea] flex justify-center selection:bg-[#1d9bf0] selection:text-white">
      {/* Auto Update Notification Banner */}
      <PwaUpdatePrompt />

      {/* Main 3-Column Layout Container */}
      <div className="flex w-full max-w-7xl justify-between min-h-screen pb-16 md:pb-0">
        {/* Right Sidebar: Navigation */}
        <NavigationSidebar
          currentUser={currentUser}
          activeTab={activeTab}
          unreadNotifsCount={unreadCount}
          setActiveTab={setActiveTab}
          onOpenComposer={() => {
            setActiveTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenCloudSettings={() => setIsCloudModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Center Content: Switches smoothly based on Active Tab */}
        {activeTab === 'home' && (
          <MainFeed
            posts={posts}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onOpenReply={(post) => setReplyingPost(post)}
            onOpenLightbox={handleOpenLightbox}
            onNotify={addToast}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreView
            posts={posts}
            trends={dynamicTrends}
            currentUser={currentUser}
            onOpenReply={(post) => setReplyingPost(post)}
            onOpenLightbox={handleOpenLightbox}
            onSelectTag={handleSelectTag}
            onNotify={addToast}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            currentUserId={currentUser.id}
            onNotify={addToast}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesView currentUser={currentUser} onNotify={addToast} />
        )}

        {activeTab === 'bookmarks' && (
          <BookmarksView
            posts={posts}
            currentUser={currentUser}
            onOpenReply={(post) => setReplyingPost(post)}
            onOpenLightbox={handleOpenLightbox}
            onNotify={addToast}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            posts={posts}
            onOpenReply={(post) => setReplyingPost(post)}
            onOpenLightbox={handleOpenLightbox}
            onProfileUpdated={(updated) => setCurrentUser(updated)}
            onNotify={addToast}
          />
        )}

        {/* Left Sidebar: Real Trends & Real Registered Users Suggestions */}
        <TrendsSidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          trends={dynamicTrends}
          suggestedUsers={communityUsers}
          currentUser={currentUser}
          onSelectTag={handleSelectTag}
          onToggleFollow={handleToggleFollow}
          onNotify={addToast}
        />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-[#000000]/95 backdrop-blur-md border-t border-[#2f3336] flex items-center justify-around py-3 z-40 px-2">
        <button
          onClick={() => setActiveTab('home')}
          className={`p-2 rounded-full ${activeTab === 'home' ? 'text-[#1d9bf0]' : 'text-[#e7e9ea]'}`}
        >
          <Home className="w-6 h-6" />
        </button>
        <button
          onClick={() => setActiveTab('explore')}
          className={`p-2 rounded-full ${activeTab === 'explore' ? 'text-[#1d9bf0]' : 'text-[#e7e9ea]'}`}
        >
          <Hash className="w-6 h-6" />
        </button>
        <button
          onClick={() => {
            setActiveTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="p-3 rounded-full bg-[#1d9bf0] text-white shadow-lg -mt-5"
        >
          <Feather className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`p-2 rounded-full relative ${
            activeTab === 'notifications' ? 'text-[#1d9bf0]' : 'text-[#e7e9ea]'
          }`}
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#1d9bf0] rounded-full border-2 border-black" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`p-2 rounded-full ${activeTab === 'messages' ? 'text-[#1d9bf0]' : 'text-[#e7e9ea]'}`}
        >
          <Mail className="w-6 h-6" />
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`p-2 rounded-full ${activeTab === 'profile' ? 'text-[#1d9bf0]' : 'text-[#e7e9ea]'}`}
        >
          <UserIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Lightbox Modal for Fullscreen Image Viewing & Downloading */}
      <ImageLightbox
        imageUrl={lightboxData.url}
        imageName={lightboxData.name}
        imageSize={lightboxData.size}
        postContent={lightboxData.content}
        onClose={handleCloseLightbox}
        onNotify={addToast}
      />

      {/* Reply Modal */}
      <ReplyModal
        post={replyingPost}
        currentUser={currentUser}
        onClose={() => setReplyingPost(null)}
        onNotify={addToast}
      />

      {/* Cloud Database Setup Modal */}
      <CloudSettingsModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onNotify={addToast}
      />

      {/* Google Auth / Sign-in Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenCloudSettings={() => setIsCloudModalOpen(true)}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
        onNotify={addToast}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
