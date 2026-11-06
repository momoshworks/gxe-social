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
      showBrowserNotification('منصة GXE', 'تم تفعيل التنبيهات الفورية بنجاح على جهازك! 🔔');
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
        return <Heart className="w-5 h-5 text-[#f91880] fill-current" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-[#1d9bf0]" />;
      case 'repost':
        return <Repeat className="w-5 h-5 text-[#00ba7c]" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-[#1d9bf0]" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-[#00ba7c] fill-current" />;
    }
  };

  const getActionText = (type: AppNotification['type']) => {
    switch (type) {
      case 'like':
        return 'أعجب بمنشورك';
      case 'comment':
        return 'علق على منشورك:';
      case 'repost':
        return 'أعاد نشر منشورك';
      case 'follow':
        return 'بدأ بمتابعتك الآن';
      case 'message':
        return 'أرسل لك رسالة خاصة:';
    }
  };

  return (
    <main className="flex-1 min-h-screen border-x border-[#2f3336] max-w-2xl w-full bg-[#000000]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#000000]/80 backdrop-blur-md border-b border-[#2f3336] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#1d9bf0]" />
          <h1 className="font-bold text-lg text-[#e7e9ea]">الإشعارات</h1>
        </div>
        <div className="flex items-center gap-3">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs text-[#1d9bf0] hover:underline font-semibold"
            >
              <CheckCheck className="w-4 h-4" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}
        </div>
      </div>

      {/* Enable Browser Notification Banner if not granted */}
      {browserPermission !== 'granted' && (
        <div className="p-4 m-3 bg-[#16181c] border border-[#1d9bf0]/40 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-[#1d9bf0] shrink-0 animate-bounce" />
            <div>
              <p className="font-bold text-[#e7e9ea]">تفعيل التنبيهات الفورية على جهازك</p>
              <p className="text-[#71767b]">استقبل تنبيهاً فورياً عند وصول أي رسالة أو تفاعل حتى لو كان الموقع مغلقاً.</p>
            </div>
          </div>
          <button
            onClick={handleEnablePush}
            className="px-4 py-2 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full transition-colors shrink-0"
          >
            تفعيل الآن
          </button>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <div className="divide-y divide-[#2f3336]/60">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 flex gap-3 hover:bg-[#080808] transition-colors ${
                !notif.read ? 'bg-[#1d9bf0]/5' : ''
              }`}
            >
              <div className="pt-0.5">{getIcon(notif.type)}</div>
              <div className="flex-1 min-w-0 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={notif.sender.avatar}
                    alt={notif.sender.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-bold text-[#e7e9ea]">{notif.sender.name}</span>
                    <span className="text-[#71767b]">@{notif.sender.username}</span>
                    <span className="text-xs text-[#71767b]">· {getActionText(notif.type)}</span>
                  </div>
                </div>

                {notif.postContent && (
                  <p className="text-xs text-[#71767b] line-clamp-2 bg-[#16181c] p-2.5 rounded-xl border border-[#2f3336]/40 mt-1.5">
                    {notif.postContent}
                  </p>
                )}

                <span className="text-[10px] text-[#71767b] block mt-1">
                  {new Date(notif.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center text-[#71767b] flex flex-col items-center justify-center gap-3">
          <Bell className="w-14 h-14 text-[#2f3336]" />
          <h3 className="font-bold text-base text-[#e7e9ea]">لا توجد إشعارات جديدة</h3>
          <p className="text-xs max-w-xs">
            عندما يتفاعل أي شخص مع منشوراتك أو يرسل لك رسالة خاصة أو يتابعك، ستظهر إشعاراتك اللحظية هنا فوراً!
          </p>
        </div>
      )}
    </main>
  );
};
