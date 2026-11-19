/**
 * GXE Over-The-Air & GitHub Release Auto-Update Service
 * - Checks GitHub Releases API and Cloudflare Worker /api/version
 * - Detects new version on app startup
 * - Initiates automatic download & install for Android APK and Web PWA
 */

import { Capacitor } from '@capacitor/core';

// Current release version of the installed app
export const CURRENT_APP_VERSION = '1.0.5';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  title: string;
  releaseNotes: string;
  apkDownloadUrl: string;
  directCdnApkUrl: string;
  githubUrl: string;
  publishedAt?: string;
}

export const CLOUDFLARE_DIRECT_APK_URL = 'https://gxe-social.momosh991.workers.dev/api/download/apk';
export const GITHUB_RELEASE_APK_URL = 'https://github.com/momoshworks/gxe-social/releases/download/v1.0.5/GXE-Social.apk';
export const GITHUB_RELEASE_PAGE_URL = 'https://github.com/momoshworks/gxe-social/releases/tag/v1.0.5';

/**
 * Compare two semver strings (e.g. "1.0.6" vs "1.0.5")
 * Returns true ONLY if v2 > v1
 */
export function isNewerVersion(v1: string, v2: string): boolean {
  const clean1 = v1.replace(/^v/, '').trim();
  const clean2 = v2.replace(/^v/, '').trim();

  if (clean1 === clean2) return false;

  const parts1 = clean1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p2 > p1) return true;
    if (p2 < p1) return false;
  }
  return false;
}

export function dismissUpdate(version: string) {
  try {
    sessionStorage.setItem('gxe_dismissed_update_' + version, 'true');
  } catch {}
}

export function isUpdateDismissed(version: string): boolean {
  try {
    return sessionStorage.getItem('gxe_dismissed_update_' + version) === 'true';
  } catch {
    return false;
  }
}

/**
 * Check for updates from GitHub Releases API with fallback to Cloudflare /api/version
 */
export async function checkForAppUpdates(): Promise<AppUpdateInfo | null> {
  const defaultApkUrl =
    'https://github.com/momoshworks/gxe-social/releases/latest/download/GXE-Social.apk';
  const defaultGithubUrl = 'https://github.com/momoshworks/gxe-social/releases/latest';

  // 1. Try GitHub Releases API first
  try {
    const res = await fetch(
      'https://api.github.com/repos/momoshworks/gxe-social/releases/latest',
      {
        headers: { Accept: 'application/vnd.github.v3+json' },
      }
    );

    if (res.ok) {
      const release = await res.json();
      const tagName = release.tag_name || '';
      const apkAsset = (release.assets || []).find((a: any) =>
        a.name.toLowerCase().endsWith('.apk')
      );

      const apkDownloadUrl = apkAsset ? apkAsset.browser_download_url : defaultApkUrl;
      const latestVersion = tagName.replace(/^v/, '');
      const hasUpdate = isNewerVersion(CURRENT_APP_VERSION, latestVersion);

      // If user already dismissed this specific version in this session, don't nag them
      if (isUpdateDismissed(latestVersion)) {
        return null;
      }

      return {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion,
        title: release.name || `إصدار جديد ${tagName}`,
        releaseNotes: release.body || 'تحسينات عامة على الأداء وإصلاحات استقرار.',
        apkDownloadUrl,
        directCdnApkUrl: CLOUDFLARE_DIRECT_APK_URL,
        githubUrl: release.html_url || defaultGithubUrl,
        publishedAt: release.published_at,
      };
    }
  } catch (err) {
    console.warn('GitHub API check fallback:', err);
  }

  // 2. Fallback to Cloudflare Worker edge endpoint (/api/version)
  try {
    const edgeRes = await fetch('/api/version');
    if (edgeRes.ok) {
      const data = await edgeRes.json();
      const latestVersion = (data.version || '').replace(/^v/, '');
      const hasUpdate = isNewerVersion(CURRENT_APP_VERSION, latestVersion);

      if (isUpdateDismissed(latestVersion)) {
        return null;
      }

      return {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion,
        title: data.title || `إصدار جديد v${latestVersion}`,
        releaseNotes: data.releaseNotes || 'تحديثات جديدة وإصلاحات سريعة.',
        apkDownloadUrl: data.apkUrl || defaultApkUrl,
        directCdnApkUrl: CLOUDFLARE_DIRECT_APK_URL,
        githubUrl: data.githubReleaseUrl || defaultGithubUrl,
      };
    }
  } catch (edgeErr) {
    console.warn('Edge version check failed:', edgeErr);
  }

  return null;
}

/**
 * ⚡ Instant In-App Live Update (0 seconds / No APK download required)
 * Clears caches, service worker registrations, and immediately syncs the latest UI and code from Cloudflare Edge.
 */
export async function performInstantOtaUpdate(version?: string): Promise<void> {
  if (version) {
    dismissUpdate(version);
  }

  try {
    // 1. Purge CacheStorage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // 2. Unregister or update ServiceWorker registrations
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.update().catch(() => {});
      }
    }

    // 3. Purge cached dynamic app assets in sessionStorage
    try {
      sessionStorage.clear();
    } catch {}

    // 4. Force hard reload from Cloudflare Edge server
    window.location.reload();
  } catch (err) {
    console.error('Instant OTA Update error:', err);
    window.location.reload();
  }
}

/**
 * Download APK file with direct streaming from Cloudflare Edge (Bypasses GitHub browser redirect hangs)
 */
export function downloadApkFile(url?: string, version?: string) {
  if (version) {
    dismissUpdate(version);
  }

  const targetUrl = url || CLOUDFLARE_DIRECT_APK_URL;

  // Create an explicit anchor with download attribute
  const link = document.createElement('a');
  link.href = targetUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = 'GXE-Social.apk';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      document.body.removeChild(link);
    } catch {}
  }, 500);
}

/**
 * Trigger installation or download of update (Default backward-compatible trigger)
 */
export function triggerAppUpdate(update: AppUpdateInfo) {
  dismissUpdate(update.latestVersion);
  if (Capacitor.isNativePlatform()) {
    downloadApkFile(update.directCdnApkUrl || update.apkDownloadUrl, update.latestVersion);
  } else {
    performInstantOtaUpdate(update.latestVersion);
  }
}
