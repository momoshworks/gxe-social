/**
 * GXE Over-The-Air & GitHub Release Auto-Update Service
 * - Checks GitHub Releases API and Cloudflare Worker /api/version
 * - Detects new version on app startup
 * - Initiates automatic download & install for Android APK and Web PWA
 */

import { Capacitor } from '@capacitor/core';

export const CURRENT_APP_VERSION = '1.0.4';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  title: string;
  releaseNotes: string;
  apkDownloadUrl: string;
  githubUrl: string;
  publishedAt?: string;
}

/**
 * Compare two semver strings (e.g. "1.0.5" vs "1.0.4")
 * Returns true if v2 > v1
 */
function isNewerVersion(v1: string, v2: string): boolean {
  const clean1 = v1.replace(/^v/, '').trim();
  const clean2 = v2.replace(/^v/, '').trim();

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

      return {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion,
        title: release.name || `إصدار جديد ${tagName}`,
        releaseNotes: release.body || 'تحسينات عامة على الأداء وإصلاحات استقرار.',
        apkDownloadUrl,
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

      return {
        hasUpdate,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion,
        title: data.title || `إصدار جديد v${latestVersion}`,
        releaseNotes: data.releaseNotes || 'تحديثات جديدة وإصلاحات سريعة.',
        apkDownloadUrl: data.apkUrl || defaultApkUrl,
        githubUrl: data.githubReleaseUrl || defaultGithubUrl,
      };
    }
  } catch (edgeErr) {
    console.warn('Edge version check failed:', edgeErr);
  }

  return null;
}

/**
 * Trigger installation or download of update
 */
export function triggerAppUpdate(update: AppUpdateInfo) {
  if (Capacitor.isNativePlatform()) {
    // On native Android: Open direct download link which launches Android package installer
    window.location.href = update.apkDownloadUrl;
  } else {
    // On Web / PWA: Clear SW caches and reload with new assets
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch {}
    window.location.reload();
  }
}
