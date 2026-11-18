import React from 'react';
import { Users, MessageSquare, UserPlus, UserCheck } from 'lucide-react';
import type { User } from '../../types';

interface CommunityViewProps {
  users: User[];
  currentUser: User;
  onSelectChatUser: (user: User) => void;
  onToggleFollow: (user: User) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  users,
  currentUser,
  onSelectChatUser,
  onToggleFollow,
  onNotify,
}) => {
  const otherUsers = users.filter((u) => u.id !== currentUser.id);

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 py-4 flex flex-col gap-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 sm:p-7 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="card-accent-bar" />
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="card-num-badge">COMMUNITY DIRECTORY</span>
            <span className="text-xs font-mono text-gray-400">VERIFIED USERS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>أعضاء مجتمع GXE</span>
            <Users className="w-6 h-6 text-blue-400" />
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
            تواصل مباشرة مع المطورين، التقنيين، والمشاركين في المنصة عبر محادثات خاصة مشفرة.
          </p>
        </div>

        <span className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 shrink-0">
          {otherUsers.length} أعضاء مسجلين
        </span>
      </div>

      {/* Members Grid */}
      {otherUsers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {otherUsers.map((user) => {
            const isFollowing = currentUser.following?.includes(user.id) ?? false;

            return (
              <div
                key={user.id}
                className="lineup-card p-5 flex flex-col justify-between gap-4 group"
              >
                <div className="card-accent-bar" />

                {/* Top User Info */}
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/20 shadow-md group-hover:border-blue-400/60 transition-colors"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#08090C]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold text-white truncate">
                        {user.name}
                      </h3>
                      {user.verified && (
                        <span className="text-xs text-blue-400 font-black">✓</span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-400 block truncate" dir="ltr">
                      @{user.username}
                    </span>
                    {user.bio && (
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {user.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Real Stats */}
                <div className="flex items-center gap-4 py-2 border-y border-white/10 text-xs font-mono text-slate-400">
                  <div>
                    <span className="font-bold text-white ml-1">
                      {user.followersCount || user.followers?.length || 0}
                    </span>
                    <span>متابع</span>
                  </div>
                  <div>
                    <span className="font-bold text-white ml-1">
                      {user.followingCount || user.following?.length || 0}
                    </span>
                    <span>يتابع</span>
                  </div>
                </div>

                {/* Actions: Direct Chat & Follow */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectChatUser(user)}
                    className="flex-1 glass-btn-primary py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>محادثة خاصة</span>
                  </button>

                  <button
                    onClick={() => {
                      onToggleFollow(user);
                      if (onNotify) {
                        onNotify(
                          isFollowing ? `ألغيت متابعة ${user.name}` : `بدأت متابعة ${user.name} 🌟`,
                          'info'
                        );
                      }
                    }}
                    className={`px-3 py-2 rounded-full text-xs font-semibold border transition-all ${
                      isFollowing
                        ? 'bg-white/10 text-slate-300 border-white/20'
                        : 'glass-btn-secondary text-blue-400 border-blue-500/30'
                    }`}
                  >
                    {isFollowing ? (
                      <UserCheck className="w-3.5 h-3.5" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel p-10 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">أنت أول عضو متصل!</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            بمجرد انضمام مستخدمين آخرين إلى منصة GXE، ستظهر بطاقاتهم هنا للتواصل المباشر.
          </p>
        </div>
      )}
    </div>
  );
};
