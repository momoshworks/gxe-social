import React, { useState, useEffect, useRef } from 'react';
import type { Post, User, AppNotification } from './types';
import {
  subscribeToPosts,
  subscribeToNotifications,
  toggleFollowUser,
  subscribeToUserDoc,
  getLocalPosts,
  getLocalNotifications,
} from './services/dbService';
import { subscribeToAuthState, logoutUser, saveLocalUser, getLocalSavedUser } from './services/authService';
import { subscribeToCommunityUsers, getKnownCommunityUsers } from './services/messageService';
import { playNotificationSound, showBrowserNotification } from './services/notificationService';
import { HeaderNav } from './components/layout/HeaderNav';
import { MessagesView } from './components/messages/MessagesView';
import { EventsView } from './components/events/EventsView';
import { CommunityView } from './components/community/CommunityView';
import { ProfileView } from './components/profile/ProfileView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { CreateEventModal } from './components/events/CreateEventModal';
import { ReplyModal } from './components/modals/ReplyModal';
import { ImageLightbox } from './components/modals/ImageLightbox';
import { AuthModal } from './components/modals/AuthModal';
import { Toast, type ToastMessage } from './components/common/Toast';
import { FloatingPopNotification } from './components/common/FloatingPopNotification';

export const App: React.FC = () => {
  // Always initialize from persisted local cache so profile is loaded in 0ms
  const [currentUser, setCurrentUser] = useState<User>(() => getLocalSavedUser());

  const [posts, setPosts] = useState<Post[]>(() => getLocalPosts());
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getLocalNotifications());
  const [communityUsers, setCommunityUsers] = useState<User[]>(() => getKnownCommunityUsers());
  const [activeTab, setActiveTab] = useState<string>('messages');
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
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Subscribe to Auth State
  useEffect(() => {
    const unsub = subscribeToAuthState((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });
    return () => unsub();
  }, []);

  // Real-time synchronization of current user document in Cloudflare D1
  useEffect(() => {
    if (!currentUser.id) return;
    const unsub = subscribeToUserDoc(currentUser.id, (updates) => {
      setCurrentUser((prev) => {
        const merged: User = {
          ...prev,
          name: updates.name && updates.name.trim().length > 0 ? updates.name : prev.name,
          username: updates.username && updates.username.trim().length > 0 ? updates.username : prev.username,
          avatar: updates.avatar && updates.avatar.trim().length > 0 ? updates.avatar : prev.avatar,
          bio: updates.bio !== undefined ? updates.bio : prev.bio,
          coverUrl: updates.coverUrl || prev.coverUrl,
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

  // Real-time subscription to events feed
  useEffect(() => {
    const unsubscribe = subscribeToPosts((updatedPosts) => {
      if (prevPostsCountRef.current > 0 && updatedPosts.length > prevPostsCountRef.current) {
        const latestPost = updatedPosts[0];
        if (
          latestPost &&
          latestPost.author.id !== currentUser.id &&
          (currentUser.following || []).includes(latestPost.author.id)
        ) {
          playNotificationSound();
          showBrowserNotification(`⚡ ${latestPost.author.name} أطلق حدثاً جديداً`, {
            body: latestPost.content.substring(0, 90),
            icon: latestPost.author.avatar,
            tag: `gxe-event-${latestPost.id}`,
            data: { tab: 'events', postId: latestPost.id },
          });
        }
      }
      prevPostsCountRef.current = updatedPosts.length;
      setPosts(updatedPosts);
    });
    return () => unsubscribe();
  }, [currentUser.following, currentUser.id]);

  // Real-time notifications
  useEffect(() => {
    if (!currentUser.id) return;
    const unsub = subscribeToNotifications(currentUser.id, (loadedNotifs) => {
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
              notifBody = newest.content || 'أرسل لك رسالة خاصة جديدة';
              notifTab = 'messages';
              break;
            case 'like':
              notifTitle = `❤️ إعجاب جديد من ${newest.sender.name}`;
              notifBody = `أعجب بحدثك: "${(newest.content || '').substring(0, 45)}"`;
              notifTab = 'events';
              break;
            case 'comment':
              notifTitle = `💬 هاري جديد من ${newest.sender.name}`;
              notifBody = `علق على حدثك: "${(newest.content || '').substring(0, 60)}"`;
              notifTab = 'events';
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

  // Subscribe to community members from Cloudflare D1
  useEffect(() => {
    const unsub = subscribeToCommunityUsers((users) => {
      setCommunityUsers(users);
    });
    return () => unsub();
  }, []);

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
    <div className="h-screen w-full bg-[#07080B] text-[#F8FAFC] flex flex-col relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Ambient Aurora Chromatic Mesh (Building A Software Portfolio Website style) */}
      <div className="aurora-mesh" />

      {/* Dynamic Pop Notification (Positioned bottom-left to never block header) */}
      <FloatingPopNotification
        onNavigate={(tab, data) => {
          if (tab) setActiveTab(tab);
          if (data?.senderId && communityUsers.length > 0) {
            const user = communityUsers.find((u) => u.id === data.senderId);
            if (user) setSelectedChatUser(user);
          }
        }}
      />

      {/* Top Liquid Glass Header Navigation */}
      <HeaderNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadNotifsCount={unreadCount}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`flex-1 w-full relative z-10 flex flex-col ${activeTab === 'messages' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {/* 1. Chats View (WhatsApp Ergonomics + Liquid Glass) */}
        {activeTab === 'messages' && (
          <MessagesView
            currentUser={currentUser}
            initialChatUser={selectedChatUser}
            onOpenLightbox={(url) => setLightboxData({ url })}
            onNotify={addToast}
          />
        )}

        {/* 2. Events View (Building A Software Portfolio Website Lineup Cards) */}
        {activeTab === 'events' && (
          <EventsView
            posts={posts}
            currentUser={currentUser}
            onOpenComposer={() => setIsCreateEventModalOpen(true)}
            onOpenReply={(post) => setReplyingPost(post)}
            onOpenLightbox={handleOpenLightbox}
            onNotify={addToast}
          />
        )}

        {/* 3. Community View (Real Verified Members Directory) */}
        {activeTab === 'community' && (
          <CommunityView
            users={communityUsers}
            currentUser={currentUser}
            onSelectChatUser={(user) => {
              setSelectedChatUser(user);
              setActiveTab('messages');
            }}
            onToggleFollow={handleToggleFollow}
            onNotify={addToast}
          />
        )}

        {/* 4. Profile View (Personal Liquid Glass Showcase) */}
        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            posts={posts}
            communityUsers={communityUsers}
            onOpenReply={(post) => setReplyingPost(post)}
            onOpenLightbox={handleOpenLightbox}
            onProfileUpdated={(updatedUser) => setCurrentUser(updatedUser)}
            onToggleFollow={handleToggleFollow}
            onStartChat={(user) => {
              setSelectedChatUser(user);
              setActiveTab('messages');
            }}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNotify={addToast}
          />
        )}

        {/* 5. Notifications Center */}
        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            currentUserId={currentUser.id}
            onNotify={addToast}
          />
        )}
      </div>

      {/* Modals & Dialogs */}
      {isCreateEventModalOpen && (
        <CreateEventModal
          isOpen={isCreateEventModalOpen}
          currentUser={currentUser}
          onClose={() => setIsCreateEventModalOpen(false)}
          onNotify={addToast}
        />
      )}

      {replyingPost && (
        <ReplyModal
          post={replyingPost}
          currentUser={currentUser}
          onClose={() => setReplyingPost(null)}
          onNotify={addToast}
        />
      )}

      {lightboxData.url && (
        <ImageLightbox
          imageUrl={lightboxData.url}
          imageName={lightboxData.name}
          imageSize={lightboxData.size}
          postContent={lightboxData.content}
          onClose={handleCloseLightbox}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(user) => {
            setCurrentUser(user);
            addToast(`مرحباً بك يا ${user.name}! 🌟`, 'success');
          }}
          onNotify={addToast}
        />
      )}

      {/* Floating Toasts */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
export default App;
