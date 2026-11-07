/**
 * Ultra-Fast Sound & Apple iPhone-style Push Notifications Service for GXE
 * Features:
 * - Authentic Apple iPhone Tri-tone Chime synthesis via Web Audio API
 * - Auto-dismissing System Notifications in the OS Notification Bar (auto-closes after 5 seconds)
 * - In-App Floating Pop Notification event bus
 * - Custom Vibration Patterns
 */

function playIPhoneNote(ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number = 0.22) {
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Fundamental clear sine tone
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Subtle glassy harmonic for Apple's signature crystal marimba warmth
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    // Instant attack, smooth exponential bell decay
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(volume * 0.45, startTime + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  } catch {
    // ignore
  }
}

/**
 * Synthesizes the authentic Apple iPhone Tri-tone notification chime:
 * 1. G#5 (830.61 Hz)
 * 2. B5  (987.77 Hz)
 * 3. E6  (1318.51 Hz - iconic lingering crystal bell)
 */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Note 1: G#5
    playIPhoneNote(ctx, 830.61, now, 0.12, 0.22);
    // Note 2: B5
    playIPhoneNote(ctx, 987.77, now + 0.085, 0.12, 0.25);
    // Note 3: E6 (high bell resolution)
    playIPhoneNote(ctx, 1318.51, now + 0.17, 0.45, 0.28);
  } catch {
    // Audio autoplay restrictions before first user interaction
  }
}

/**
 * Trigger mobile device vibration
 */
export function vibrateDevice(pattern: number[] = [150, 75, 150]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

/**
 * Request notification permissions from browser/OS
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function isNotificationGranted(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Get absolute URL to app logo
 */
function getAppLogoUrl(): string {
  try {
    const base = import.meta.env.BASE_URL || '/';
    return new URL(base + 'logo.png', window.location.origin).href;
  } catch {
    return '/logo.png';
  }
}

export interface ShowNotificationOptions {
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  silent?: boolean;
  autoCloseMs?: number;
}

// In-app pop notification listeners
export interface PopNotificationPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
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
    id: 'pop_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
  };
  popListeners.forEach((cb) => {
    try {
      cb(item);
    } catch (e) {
      console.warn('Pop listener error:', e);
    }
  });
}

/**
 * Apple iOS-style Native System Notification (System Notification Bar & Drawer)
 * Automatically closes after autoCloseMs (default: 5000ms)
 */
export function showBrowserNotification(
  title: string,
  optionsOrBody: string | ShowNotificationOptions
) {
  const options: ShowNotificationOptions =
    typeof optionsOrBody === 'string' ? { body: optionsOrBody } : optionsOrBody;

  // 1. Play authentic iPhone chime
  if (!options.silent) {
    playNotificationSound();
  }

  // 2. Vibrate phone
  vibrateDevice([150, 75, 150]);

  // 3. Trigger In-App Dynamic Floating Notification Banner
  triggerInAppPop({
    title,
    body: options.body,
    icon: options.icon,
    data: options.data,
  });

  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
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

  // 4. Display via ServiceWorkerRegistration with auto-close after 5s
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.showNotification(title, notifOptions);
        setTimeout(async () => {
          try {
            const active = await registration.getNotifications({ tag });
            active.forEach((n) => n.close());
          } catch {
            // ignore
          }
        }, autoCloseMs);
      })
      .catch(() => {
        try {
          const n = new Notification(title, notifOptions);
          setTimeout(() => n.close(), autoCloseMs);
        } catch (e) {
          console.warn('Native notification fallback failed:', e);
        }
      });
  } else {
    try {
      const n = new Notification(title, notifOptions);
      setTimeout(() => n.close(), autoCloseMs);
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }
}
