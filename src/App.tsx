import React, { useState, useEffect, useRef } from 'react';
import type { Post, User, AppNotification, Trend } from './types';
import {
  subscribeToPosts,
  subscribeToNotifications,
  extractTrendsFromPosts,
  toggleFollowUser,
  subscribeToUserDoc,
} from './services/dbService';
import { subscribeToAuthState, logoutUser, saveLocalUser, getLocalSavedUser } from './services/authService';
import { subscribeToCommunityUsers } from './services/messageService';
import { playNotificationSound, showBrowserNotification } from './services/notificationService';
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
import { Home, Hash, Bell, Mail, Feather, User as UserIcon, LogIn, LogOut, Download } from 'lucide-react';
import logoImg from './assets/logo.png';

export const App: React.FC = () => {
  // Always initialize from persisted local cache so followers and profile are loaded instantly (0ms) on reload
  const [currentUser, setCurrentUser] = useState<User>(() => getLocalSavedUser());

  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [communityUsers, setCommunityUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const prevNotifsCountRef = useRef<number>(0);
  const prevPostsCountRef = useRef<number>(0);

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

  // Real-time synchronization of current user document in Firestore (followers, following, counters)
  useEffect(() => {
    if (!currentUser.id) return;
    const unsub = subscribeToUserDoc(currentUser.id, (updates) => {
      setCurrentUser((prev) => {
        const merged: User = {
          ...prev,
          ...updates,
          following: updates.following && updates.following.length > 0 ? updates.following : (prev.following || []),
          followers: updates.followers && updates.followers.length > 0 ? updates.followers : (prev.followers || []),
          followingCount: updates.followingCount ?? prev.followingCount,
          followersCount: updates.followersCount ?? prev.followersCount,
        };
        saveLocalUser(merged);
        return merged;
      });
    });
    return () => unsub();
  }, [currentUser.id]);

  // Subscribe to real-time posts from ALL users across the platform + notify when followed users post
  useEffect(() => {
    const unsubscribe = subscribeToPosts((updatedPosts) => {
      // If a followed user published a new post
      if (prevPostsCountRef.current > 0 && updatedPosts.length > prevPostsCountRef.current) {
        const latestPost = updatedPosts[0];
        if (
          latestPost &&
          latestPost.author.id !== currentUser.id &&
          (currentUser.following || []).includes(latestPost.author.id)
        ) {
          playNotificationSound();
          showBrowserNotification(`📢 ${latestPost.author.name} نشر تغريدة جديدة`, {
            body: latestPost.content.substring(0, 90),
            icon: latestPost.author.avatar,
            tag: `gxe-post-${latestPost.id}`,
            data: { tab: 'home', postId: latestPost.id },
          });
        }
      }
      prevPostsCountRef.current = updatedPosts.length;
      setPosts(updatedPosts);
    });
    return () => unsubscribe();
  }, [currentUser.following, currentUser.id]);

  // Subscribe to real-time Notifications for current user with WhatsApp-style push outside browser
  useEffect(() => {
    if (!currentUser.id) return;
    const unsub = subscribeToNotifications(currentUser.id, (loadedNotifs) => {
      // If new unread notification arrived
      if (loadedNotifs.length > prevNotifsCountRef.current) {
        const newest = loadedNotifs[0];
        if (newest && !newest.read) {
          playNotificationSound();

          let notifTitle = `منصة GXE: ${newest.sender.name}`;
          let notifBody = `${newest.sender.name} أرسل إشعاراً جديداً`;
          let notifTab = 'notifications';

          switch (newest.type) {
            case 'message':
              notifTitle = `💬 رسالة من ${newest.sender.name}`;
              notifBody = newest.postContent || 'أرسل لك رسالة خاصة جديدة';
              notifTab = 'messages';
              break;
            case 'like':
              notifTitle = `❤️ إعجاب جديد من ${newest.sender.name}`;
              notifBody = `أعجب بمنشورك: "${(newest.postContent || '').substring(0, 45)}"`;
              notifTab = 'home';
              break;
            case 'comment':
              notifTitle = `💬 تعليق من ${newest.sender.name}`;
              notifBody = `"${(newest.postContent || '').substring(0, 60)}"`;
              notifTab = 'home';
              break;
            case 'repost':
              notifTitle = `🔄 إعادة نشر من ${newest.sender.name}`;
              notifBody = `أعاد نشر تغريدتك: "${(newest.postContent || '').substring(0, 45)}"`;
              notifTab = 'home';
              break;
            case 'follow':
              notifTitle = `✨ متابع جديد على GXE!`;
              notifBody = `بدأ ${newest.sender.name} (@${newest.sender.username}) بمتابعتك الآن.`;
              notifTab = 'profile';
              break;
          }

          showBrowserNotification(notifTitle, {
            body: notifBody,
            icon: newest.sender.avatar,
            tag: `gxe-${newest.type}-${newest.sender.id}`,
            data: {
              tab: notifTab,
              senderId: newest.sender.id,
              postId: newest.postId,
            },
          });
        }
      }
      prevNotifsCountRef.current = loadedNotifs.length;
      setNotifications(loadedNotifs);
    });
    return () => unsub();
  }, [currentUser.id]);

  // Handle incoming notification clicks dispatched by Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE_TAB') {
        if (event.data.tab) {
          setActiveTab(event.data.tab);
        }
        if (event.data.senderId && communityUsers.length > 0) {
          const user = communityUsers.find((u) => u.id === event.data.senderId);
          if (user) setSelectedChatUser(user);
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, [communityUsers]);

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

  const handleStartChat = (user: User) => {
    setSelectedChatUser(user);
    setActiveTab('messages');
    addToast(`بدء محادثة خاصة مع ${user.name}`, 'info');
  };

  const handleToggleFollow = async (targetUser: User) => {
    const isNowFollowing = await toggleFollowUser(currentUser, targetUser);
    const updatedFollowing = isNowFollowing
      ? Array.from(new Set([...(currentUser.following || []), targetUser.id]))
      : (currentUser.following || []).filter((id) => id !== targetUser.id);

    const updatedCurrentUser: User = {
      ...currentUser,
      following: updatedFollowing,
      followingCount: updatedFollowing.length,
    };

    setCurrentUser(updatedCurrentUser);
    saveLocalUser(updatedCurrentUser);

    // Also update target user in communityUsers state for instant UI reflection
    setCommunityUsers((prev) =>
      prev.map((u) => {
        if (u.id === targetUser.id) {
          const followers = u.followers || [];
          const updatedFollowers = isNowFollowing
            ? Array.from(new Set([...followers, currentUser.id]))
            : followers.filter((id) => id !== currentUser.id);
          return {
            ...u,
            followers: updatedFollowers,
            followersCount: updatedFollowers.length,
          };
        }
        return u;
      })
    );

    addToast(
      isNowFollowing ? `أصبحت تتابع ${targetUser.name} الآن! ✨` : `ألغيت متابعة ${targetUser.name}`,
      'info'
    );
  };

  const handleLogout = async () => {
    await logoutUser();
    addToast('تم تسجيل الخروج بنجاح', 'info');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#000000] text-[#e7e9ea] flex flex-col items-center selection:bg-[#1d9bf0] selection:text-white">
      {/* Auto Update Notification Banner */}
      <PwaUpdatePrompt />

      {/* Mobile Top App Bar (Only visible on mobile browsers) */}
      <div className="md:hidden sticky top-0 inset-x-0 w-full bg-[#000000]/95 backdrop-blur-md border-b border-[#2f3336] px-4 py-2.5 flex items-center justify-between z-40">
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={() => {
            setActiveTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <img src={logoImg} alt="GXE" className="w-8 h-8 object-contain" />
          <span className="font-black text-lg text-[#e7e9ea] tracking-wider">GXE</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct Android APK download */}
          <a
            href="./GXE-Social.apk"
            download="GXE-Social.apk"
            className="flex items-center gap-1 bg-[#00ba7c]/15 hover:bg-[#00ba7c]/25 border border-[#00ba7c]/40 text-[#00ba7c] text-xs font-bold px-2.5 py-1.5 rounded-full transition-all"
            title="تحميل تطبيق أندرويد APK"
          >
            <Download className="w-3.5 h-3.5" />
            <span>APK</span>
          </a>

          {currentUser.email ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-1.5 p-0.5 rounded-full hover:bg-[#181818]"
                title="الملف الشخصي"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-[#2f3336]"
                />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 text-[#71767b] hover:text-red-400 rounded-full"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md shadow-[#1d9bf0]/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>
          )}
        </div>
      </div>

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
            communityUsers={communityUsers}
            currentUser={currentUser}
            onOpenReply={(post) => setReplyingPost(post)}
            onOpenLightbox={handleOpenLightbox}
            onSelectTag={handleSelectTag}
            onStartChat={handleStartChat}
            onToggleFollow={handleToggleFollow}
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
          <MessagesView
            currentUser={currentUser}
            initialChatUser={selectedChatUser}
            onNotify={addToast}
          />
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
            communityUsers={communityUsers}
            onOpenReply={(post) => setReplyingPost(post)}
            onOpenLightbox={handleOpenLightbox}
            onProfileUpdated={(updated) => setCurrentUser(updated)}
            onToggleFollow={handleToggleFollow}
            onStartChat={handleStartChat}
            onOpenAuth={() => setIsAuthModalOpen(true)}
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

      {/* Guest Floating Registration Banner (Mobile only) */}
      {!currentUser.email && (
        <div className="md:hidden fixed bottom-16 inset-x-2 bg-[#16181c]/95 border border-[#1d9bf0]/40 backdrop-blur-md p-3 rounded-2xl flex items-center justify-between z-30 shadow-2xl animate-fade-in">
          <div className="flex flex-col text-right pr-1">
            <span className="text-xs font-bold text-[#e7e9ea]">انضم إلى مجتمع GXE 🚀</span>
            <span className="text-[10px] text-[#71767b]">سجّل دخولك لحفظ ونشر التغريدات</span>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-full shrink-0 shadow-md transition-all"
          >
            تسجيل الآن
          </button>
        </div>
      )}

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
