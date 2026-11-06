import React, { useState, useEffect } from 'react';
import type { Post, User } from './types';
import { subscribeToPosts } from './services/dbService';
import { NavigationSidebar } from './components/layout/NavigationSidebar';
import { MainFeed } from './components/feed/MainFeed';
import { TrendsSidebar } from './components/layout/TrendsSidebar';
import { ImageLightbox } from './components/modals/ImageLightbox';
import { ReplyModal } from './components/modals/ReplyModal';
import { CloudSettingsModal } from './components/modals/CloudSettingsModal';
import { Toast, type ToastMessage } from './components/common/Toast';
import { PwaUpdatePrompt } from './components/common/PwaUpdatePrompt';
import { Home, Hash, Bell, Mail, Feather } from 'lucide-react';

const CURRENT_USER: User = {
  id: 'current-user-1',
  name: 'محمد علي',
  username: 'mohammed_ali',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  verified: true,
  bio: 'مهندس برمجيات | مستكشف تقنيات الذكاء الاصطناعي والحوسبة السحابية ⚡',
  followersCount: 1420,
  followingCount: 380,
};

export const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
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

  // Subscribe to real-time posts
  useEffect(() => {
    const unsubscribe = subscribeToPosts((updatedPosts) => {
      setPosts(updatedPosts);
    });
    return () => unsubscribe();
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

  const handleSelectTag = (tag: string) => {
    setSearchQuery(tag);
    addToast(`تم تصفية المنشورات بواسطة ${tag}`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#e7e9ea] flex justify-center selection:bg-[#1d9bf0] selection:text-white">
      {/* Auto Update Notification Banner */}
      <PwaUpdatePrompt />

      {/* Main 3-Column Layout Container */}
      <div className="flex w-full max-w-7xl justify-between min-h-screen pb-16 md:pb-0">
        {/* Right Sidebar: Navigation (In RTL direction, this appears on the right side) */}
        <NavigationSidebar
          currentUser={CURRENT_USER}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenComposer={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenCloudSettings={() => setIsCloudModalOpen(true)}
        />

        {/* Center: Main Feed */}
        <MainFeed
          posts={posts}
          currentUser={CURRENT_USER}
          searchQuery={searchQuery}
          onOpenReply={(post) => setReplyingPost(post)}
          onOpenLightbox={handleOpenLightbox}
          onNotify={addToast}
        />

        {/* Left Sidebar: Trends & Follow suggestions */}
        <TrendsSidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectTag={handleSelectTag}
          onNotify={addToast}
        />
      </div>

      {/* Mobile Bottom Navigation Bar (Visible only on small screens) */}
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="p-3 rounded-full bg-[#1d9bf0] text-white shadow-lg -mt-5"
        >
          <Feather className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`p-2 rounded-full ${activeTab === 'notifications' ? 'text-[#1d9bf0]' : 'text-[#e7e9ea]'}`}
        >
          <Bell className="w-6 h-6" />
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`p-2 rounded-full ${activeTab === 'messages' ? 'text-[#1d9bf0]' : 'text-[#e7e9ea]'}`}
        >
          <Mail className="w-6 h-6" />
        </button>
      </div>

      {/* Lightbox Modal */}
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
        currentUser={CURRENT_USER}
        onClose={() => setReplyingPost(null)}
        onNotify={addToast}
      />

      {/* Cloud Database Setup Modal */}
      <CloudSettingsModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onNotify={addToast}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
