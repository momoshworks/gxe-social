import React, { useState } from 'react';
import { X, Users, Search, MessageCircle, UserCheck, UserPlus } from 'lucide-react';
import type { User } from '../../types';

interface FollowListModalProps {
  isOpen: boolean;
  initialTab?: 'followers' | 'following';
  profileUser: User;
  currentUser: User;
  communityUsers: User[];
  onClose: () => void;
  onToggleFollow: (target: User) => void;
  onStartChat?: (target: User) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  initialTab = 'following',
  profileUser,
  currentUser,
  communityUsers,
  onClose,
  onToggleFollow,
  onStartChat,
}) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // IDs of followers and following
  const followingIds = profileUser.following || [];
  const followerIds = profileUser.followers || [];

  // Map IDs to full User objects from communityUsers (or fallback created object)
  const getFullUsers = (ids: string[]): User[] => {
    return ids.map((id) => {
      const found = communityUsers.find((u) => u.id === id);
      if (found) return found;
      return {
        id,
        name: 'مستخدم GXE',
        username: `user_${id.substring(0, 5)}`,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
        verified: false,
      };
    });
  };

  const listToDisplay = activeTab === 'following' ? getFullUsers(followingIds) : getFullUsers(followerIds);

  const q = searchTerm.toLowerCase().trim();
  const filteredList = listToDisplay.filter((u) => {
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email ? u.email.toLowerCase().includes(q) : false)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div
        className="w-full max-w-lg glass-panel overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-accent-bar" />

        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>سجل المتابعين والمتابَعات</span>
              </h3>
              <span className="text-xs text-slate-400" dir="ltr">@{profileUser.username}</span>
            </div>
          </div>
        </div>

        {/* Tabs: أتابعهم vs المتابعون */}
        <div className="flex border-b border-white/10 text-sm font-bold bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('following')}
            className="flex-1 py-3 text-center relative hover:bg-white/5 transition-colors"
          >
            <span
              className={
                activeTab === 'following' ? 'text-blue-400' : 'text-slate-400'
              }
            >
              يتابع ({followingIds.length})
            </span>
            {activeTab === 'following' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500 rounded-full mx-8" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('followers')}
            className="flex-1 py-3 text-center relative hover:bg-white/5 transition-colors"
          >
            <span
              className={
                activeTab === 'followers' ? 'text-blue-400' : 'text-slate-400'
              }
            >
              المتابعون ({followerIds.length})
            </span>
            {activeTab === 'followers' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500 rounded-full mx-8" />
            )}
          </button>
        </div>

        {/* Search inside followers/following */}
        <div className="p-3 border-b border-white/10">
          <div className="relative flex items-center">
            <Search className="absolute right-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو المعرّف أو الإيميل..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pr-10 pl-4 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2">
          {filteredList.length > 0 ? (
            filteredList.map((user) => {
              const isSelf = user.id === currentUser.id;
              const isFollowedByMe = currentUser.following?.includes(user.id) ?? false;

              return (
                <div
                  key={user.id}
                  className="p-3 hover:bg-white/[0.03] rounded-xl transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-11 h-11 rounded-full object-cover shrink-0 border border-white/20"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white truncate">
                          {user.name}
                        </span>
                        {user.verified && (
                          <span className="text-blue-400 text-xs font-bold">✓</span>
                        )}
                        {isSelf && (
                          <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold mr-1">
                            أنت
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate font-mono" dir="ltr">
                        @{user.username}
                      </div>
                      {user.bio && (
                        <p className="text-xs text-slate-300 truncate mt-0.5">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Follow toggle & Message */}
                  {!isSelf && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onStartChat && (
                        <button
                          onClick={() => {
                            onClose();
                            onStartChat(user);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
                          title="مراسلة خاصة"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => onToggleFollow(user)}
                        className={`px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all flex items-center gap-1 ${
                          isFollowedByMe
                            ? 'glass-btn-secondary text-slate-300 hover:border-rose-500/40 hover:text-rose-400 hover:bg-rose-500/10'
                            : 'glass-btn-primary'
                        }`}
                      >
                        {isFollowedByMe ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>متابع</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>متابعة</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
              <Users className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-sm text-white">
                {activeTab === 'following'
                  ? 'لا توجد متابعات حالياً'
                  : 'لا يوجد متابعون بعد'}
              </p>
              <p className="text-xs mt-1 text-slate-400">
                {activeTab === 'following'
                  ? 'تصفح المستخدمين واضغط "متابعة" لمتابعة حساباتهم وتحديث سجلّك.'
                  : 'عندما يتابعك أعضاء المجتمع سيظهرون هنا في سجلّك.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
