import React, { useState } from 'react';
import { Heart, MessageCircle, Repeat, UserPlus, Bell, CheckCheck, BellRing } from 'lucide-react';
import type { AppNotification } from '../../types';
import { markNotificationsAsRead } from '../../services/dbService';
import { requestNotificationPermission, playNotificationSound, showBrowserNotification } from '../../services/notificationService';

interface NotificationsViewProps {
  notifications: AppNotification[];
  currentUserId: string;
  onSelectPost?: (postId: string) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  currentUserId,
  onNotify,
}) => {
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    if (typeof Notification !== 'undefined') {
      setBrowserPermission(Notification.permission);
    }
    if (granted) {
      playNotificationSound();
      showBrowserNotification('منصة GXE', { body: 'تم تفعيل التنبيهات الفورية بنجاح على جهازك! 🔔' });
      if (onNotify) onNotify('تم تفعيل إشعارات المتصفح بنجاح! 🔔', 'success');
    } else {
      if (onNotify) onNotify('لم يتم منح إذن الإشعارات', 'info');
    }
  };

  const handleMarkAllRead = async () => {
    await markNotificationsAsRead(currentUserId);
    if (onNotify) onNotify('تم تحديد جميع الإشعارات كمقروءة', 'success');
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-400 fill-current" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case 'repost':
        return <Repeat className="w-4 h-4 text-emerald-400" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-blue-400" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-emerald-400 fill-current" />;
    }
  };

  const getActionText = (type: AppNotification['type']) => {
    switch (type) {
      case 'like':
        return 'أعجب بحدثك';
      case 'comment':
        return 'علق على حدثك';
      case 'repost':
        return 'شارك حدثك';
      case 'follow':
        return 'بدأ بمتابعتك';
      case 'message':
        return 'أرسل لك رسالة خاصة';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 flex flex-col gap-6">
      {/* Header Panel */}
      <div className="glass-panel p-5 sm:p-7 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="card-accent-bar" />
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="card-num-badge">NOTIFICATIONS</span>
            <span className="text-xs font-mono text-gray-400">REAL-TIME</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>مركز التنبيهات</span>
            <Bell className="w-6 h-6 text-blue-400" />
          </h1>
          <p className="text-sm text-gray-300">
            تابع تفاعلات الأعضاء، الرسائل الجديدة، والتحديثات الفورية في حسابك.
          </p>
        </div>

        <div className="flex items-center gap-2 z-10">
          {browserPermission !== 'granted' && (
            <button
              onClick={handleEnablePush}
              className="glass-btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 text-blue-400"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>تفعيل التنبيهات</span>
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="glass-btn-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>تحديد كمقروء</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="glass-panel p-2 sm:p-4 divide-y divide-white/5">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3.5 sm:p-4 rounded-2xl flex items-start gap-3.5 transition-colors ${
                !notif.read ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/[0.03]'
              }`}
            >
              <div className="relative shrink-0 mt-0.5">
                <img
                  src={
                    notif.sender?.avatar ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
                      notif.sender?.username || notif.sender?.id || 'user'
                    )}`
                  }
                  alt={notif.sender?.name || 'عضو'}
                  className="w-10 h-10 rounded-2xl object-cover border border-white/20 bg-slate-800"
                />
                <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#08090C] border border-white/20">
                  {getIcon(notif.type)}
                </span>
              </div>

              <div className="flex-1 min-w-0 text-xs sm:text-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-white">{notif.sender?.name || 'عضو في GXE'}</span>
                    <span className="text-gray-400 font-mono text-xs">
                      @{notif.sender?.username || 'user'}
                    </span>
                    <span className="text-gray-300">{getActionText(notif.type)}</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 shrink-0 mr-2">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {notif.content && (
                  <p className="text-xs text-gray-300 leading-relaxed bg-white/[0.02] p-2 rounded-xl border border-white/5">
                    {notif.content}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-gray-400 space-y-2">
            <Bell className="w-8 h-8 text-gray-500 mx-auto stroke-[1.5]" />
            <p className="font-semibold text-white">لا توجد تنبيهات جديدة</p>
            <p className="text-gray-500">ستظهر هنا تفاعلات الأعضاء ورسائلهم الجديدة فور حدوثها.</p>
          </div>
        )}
      </div>
    </div>
  );
};
