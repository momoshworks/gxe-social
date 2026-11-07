/**
 * Cloudflare Backend Configuration and API Client
 * Connects directly to Cloudflare Workers + D1 Global Edge Database
 */

// Base URL for Cloudflare Worker API
// When hosted on the worker itself, relative URL `/api` is used.
// For Android Capacitor, GitHub Pages, or local development, the full Workers URL is used.
export const CLOUDFLARE_WORKER_URL = 'https://gxe-social.momosh991.workers.dev';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('workers.dev')) {
      return '';
    }
  }
  return CLOUDFLARE_WORKER_URL;
}

export async function apiFetch<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const headers = new Headers(options?.headers || {});
  if (!headers.has('Content-Type') && options?.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error [${response.status}]: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

let cloudOnline = true;

export function isCloudConnected(): boolean {
  return cloudOnline;
}

export function setCloudConnected(status: boolean): void {
  cloudOnline = status;
}

export async function checkCloudHealth(): Promise<{ status: string; database: string }> {
  try {
    const res = await apiFetch<{ status: string; database: string }>('/api/status');
    cloudOnline = true;
    return res;
  } catch (e) {
    console.warn('Cloudflare health check failed:', e);
    cloudOnline = false;
    throw e;
  }
}
