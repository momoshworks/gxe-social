/**
 * GXE High-Fidelity Sound & System Notification Service
 * - Plays user's custom notification sound (/notification.mp3)
 * - Native Android System Notifications via @capacitor/local-notifications
 * - Modern Web OS Notifications via Service Worker & Notification API
 * - In-app Heads-up Pop Notifications
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Cached Audio instance for 0ms latency sound playback
let notificationAudio: HTMLAudioElement | null = null;
let isChannelCreated = false;

function getNotificationAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!notificationAudio) {
    notificationAudio = new Audio('/notification.mp3');
    notificationAudio.preload = 'auto';
  }
  return notificationAudio;
}

// Pre-unlock audio on first user touch / click
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const audio = getNotificationAudio();
    if (audio) {
      audio.load();
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
}

/**
 * Initialize native Android notification channel with custom sound & high priority
 */
async function ensureAndroidChannel() {
  if (isChannelCreated || !Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: 'gxe_alerts',
      name: 'تنبيهات منصة GXE',
      description: 'إشعارات الرسائل والتفاعلات والأحداث الفورية',
      importance: 5, // High priority (heads-up notification)
      visibility: 1, // Public on lock screen
      sound: 'notification.mp3',
      vibration: true,
      lights: true,
      lightColor: '#70D6FF',
    });
    isChannelCreated = true;
  } catch (err) {
    console.warn('Could not create Android notification channel:', err);
  }
}

/**
 * Play user's authentic custom notification chime
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const audio = getNotificationAudio();
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 0.9;
      const promise = audio.play();
      if (promise) {
        promise.catch(() => {
          // Fallback if blocked
        });
      }
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Trigger device vibration
 */
export function vibrateDevice(pattern: number[] = [150, 75, 150]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

/**
 * Request notification permissions from OS / Browser
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Android Native Platform
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      if (status.display === 'granted') {
        await ensureAndroidChannel();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // 2. Web Browser
  if ('Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  return false;
}

export function isNotificationGranted(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) {
    return true; // We request permissions via LocalNotifications
  }
  return 'Notification' in window && Notification.permission === 'granted';
}

function getAppLogoUrl(): string {
  if (typeof window === 'undefined') return '/logo.png';
  return window.location.origin + '/logo.png';
}

export interface ShowNotificationOptions {
  body: string;
  icon?: string;
  image?: string;
  tag?: string;
  silent?: boolean;
  autoCloseMs?: number;
  data?: any;
}

export interface PopNotificationPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
  timestamp: number;
  data?: any;
}

type PopListener = (payload: PopNotificationPayload) => void;
const popListeners: Set<PopListener> = new Set();

export function subscribeToPopNotifications(callback: PopListener): () => void {
  popListeners.add(callback);
  return () => popListeners.delete(callback);
}

export function triggerInAppPop(payload: Omit<PopNotificationPayload, 'id'>) {
  const item: PopNotificationPayload = {
    ...payload,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
  };
  popListeners.forEach((fn) => fn(item));
}

/**
 * Display a Native System Notification (in OS Notification Tray / Heads-up)
 * plus the internal in-app floating banner
 */
export async function showBrowserNotification(
  title: string,
  optionsOrBody: string | ShowNotificationOptions
) {
  const options: ShowNotificationOptions =
    typeof optionsOrBody === 'string' ? { body: optionsOrBody } : optionsOrBody;

  // 1. Play custom notification sound
  if (!options.silent) {
    playNotificationSound();
  }

  // 2. Vibrate device
  vibrateDevice([150, 75, 150]);

  // 3. Trigger In-App Heads-up Floating Banner
  triggerInAppPop({
    title,
    body: options.body,
    icon: options.icon,
    data: options.data,
    timestamp: Date.now(),
  });

  // 4. Native Android System Notification via Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureAndroidChannel();
      const notifId = Math.floor(Math.random() * 2147483647);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body: options.body,
            channelId: 'gxe_alerts',
            smallIcon: 'ic_launcher_round',
            largeIcon: 'ic_launcher',
            sound: 'notification.mp3',
            extra: options.data,
          },
        ],
      });
      return;
    } catch (nativeErr) {
      console.warn('Native local notification dispatch error:', nativeErr);
    }
  }

  // 5. Web Browser OS Notification
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  // If permission is default, prompt user
  if (Notification.permission === 'default') {
    try {
      const p = await Notification.requestPermission();
      if (p !== 'granted') return;
    } catch {
      return;
    }
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const logoUrl = options.icon || getAppLogoUrl();
  const autoCloseMs = options.autoCloseMs ?? 5000;
  const tag = options.tag || 'gxe-' + Date.now();

  const notifOptions: any = {
    body: options.body,
    icon: logoUrl,
    badge: logoUrl,
    image: options.image,
    tag,
    renotify: true,
    vibrate: [150, 75, 150],
    data: options.data,
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.showNotification(title, notifOptions);
        setTimeout(async () => {
          try {
            const active = await registration.getNotifications({ tag });
            active.forEach((n) => n.close());
          } catch {}
        }, autoCloseMs);
      })
      .catch(() => {
        try {
          const n = new Notification(title, notifOptions);
          setTimeout(() => n.close(), autoCloseMs);
        } catch {}
      });
  } else {
    try {
      const n = new Notification(title, notifOptions);
      setTimeout(() => n.close(), autoCloseMs);
    } catch {}
  }
}
