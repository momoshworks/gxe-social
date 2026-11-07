import { apiFetch } from './cloudflare';

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface UploadedMedia {
  url: string;
  name: string;
  size: string;
  type: 'image' | 'video' | 'file';
}

/**
 * Format bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Ultra-fast client-side image compressor using HTML5 Canvas
 * Compresses heavy photos (5MB - 10MB) to lightweight WebP/JPEG (~30KB - 80KB) in milliseconds!
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.82
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result as string, blob: file });
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result as string, blob: file });
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      let mimeType = 'image/webp';
      let dataUrl = canvas.toDataURL(mimeType, quality);

      if (!dataUrl.startsWith('data:image/webp')) {
        mimeType = 'image/jpeg';
        dataUrl = canvas.toDataURL(mimeType, quality);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ dataUrl, blob });
          } else {
            resolve({ dataUrl, blob: file });
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result as string, blob: file });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Universal media file uploader with Cloudflare integration
 */
export async function uploadMediaFile(
  file: File,
  onProgress?: UploadProgressCallback,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<UploadedMedia> {
  const mediaType: 'image' | 'video' | 'file' = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('video/')
    ? 'video'
    : 'file';

  const sizeFormatted = formatFileSize(file.size);

  let compressedBlob: Blob = file;
  let compressedDataUrl = '';

  if (mediaType === 'image') {
    try {
      if (onProgress) onProgress(30);
      const comp = await compressImage(
        file,
        options?.maxWidth || 1200,
        options?.maxHeight || 1200,
        options?.quality || 0.82
      );
      compressedBlob = comp.blob;
      compressedDataUrl = comp.dataUrl;
      if (onProgress) onProgress(70);
    } catch {
      // ignore
    }
  }

  // Attempt upload to Cloudflare Worker
  try {
    const payload = {
      dataUrl: compressedDataUrl,
      name: file.name,
      size: formatFileSize(compressedBlob.size || file.size),
      type: mediaType,
    };

    const res = await apiFetch<UploadedMedia>('/api/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (onProgress) onProgress(100);
    return {
      url: res.url || compressedDataUrl,
      name: file.name,
      size: formatFileSize(compressedBlob.size || file.size),
      type: mediaType,
    };
  } catch (e) {
    console.warn('Cloudflare upload notice, using optimized client media:', e);
  }

  if (compressedDataUrl) {
    if (onProgress) onProgress(100);
    return {
      url: compressedDataUrl,
      name: file.name,
      size: formatFileSize(compressedBlob.size || file.size),
      type: mediaType,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (onProgress) onProgress(100);
      resolve({
        url: reader.result as string,
        name: file.name,
        size: sizeFormatted,
        type: mediaType,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Downloads an image or file directly to the user's device
 */
export async function downloadFile(url: string, filename: string = 'gxe-media.png'): Promise<void> {
  try {
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn('Direct fetch download failed, opening in new tab:', err);
    window.open(url, '_blank');
  }
}
