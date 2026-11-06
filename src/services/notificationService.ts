/**
 * Ultra-Fast Sound & WhatsApp-style Push Notifications Service for GXE
 * Supports Native System Notifications, Service Worker Mobile Notifications,
 * Custom Vibration Patterns, and Web Audio API Chimes.
 */

// Synthesize a clean modern notification chime using Web Audio API
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // D5 -> A5 harmonious WhatsApp-like chime
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.38);
    osc2.stop(now + 0.38);
  } catch (e) {
    // Audio autoplay restrictions before first user interaction
  }
}

/**
 * Trigger mobile device vibration (WhatsApp double-buzz pattern)
 */
export function vibrateDevice(pattern: number[] = [200, 100, 200]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
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
  } catch (e) {
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
}

/**
 * WhatsApp-style Native System Notification (Phone lock screen & Windows/Mac notification shade)
 */
export function showBrowserNotification(
  title: string,
  optionsOrBody: string | ShowNotificationOptions
) {
  const options: ShowNotificationOptions =
    typeof optionsOrBody === 'string' ? { body: optionsOrBody } : optionsOrBody;

  // 1. Play sound
  if (!options.silent) {
    playNotificationSound();
  }

  // 2. Vibrate phone (WhatsApp double-buzz)
  vibrateDevice([180, 80, 180]);

  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const logoUrl = options.icon || getAppLogoUrl();

  const notifOptions: any = {
    body: options.body,
    icon: logoUrl,
    badge: logoUrl,
    image: options.image,
    tag: options.tag || 'gxe-' + Date.now(),
    renotify: true,
    vibrate: [200, 100, 200, 100, 250],
    data: options.data,
  };

  // 3. Try displaying via ServiceWorkerRegistration (Required on Android Chrome for WhatsApp-like background drawer notification!)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        return registration.showNotification(title, notifOptions);
      })
      .catch(() => {
        // Fallback to desktop window Notification
        try {
          new Notification(title, notifOptions);
        } catch (e) {
          console.warn('Native notification fallback failed:', e);
        }
      });
  } else {
    try {
      new Notification(title, notifOptions);
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }
}
