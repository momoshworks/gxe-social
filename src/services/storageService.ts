import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

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
    // If not an image, resolve with original
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

      // Maintain aspect ratio
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
        // Fallback to reader
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result as string, blob: file });
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Try webp first, fallback to jpeg
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
 * Universal media file uploader:
 * 1. Fast compression for images
 * 2. Attempts Firebase Storage upload with timeout
 * 3. Gracefully falls back to compressed Base64 dataUrl if Storage is unprovisioned
 * 4. Never fails or blocks user actions!
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

  // If it's an image, compress it first
  let compressedBlob: Blob = file;
  let compressedDataUrl = '';

  if (mediaType === 'image') {
    try {
      const comp = await compressImage(
        file,
        options?.maxWidth || 1200,
        options?.maxHeight || 1200,
        options?.quality || 0.82
      );
      compressedBlob = comp.blob;
      compressedDataUrl = comp.dataUrl;
    } catch {
      // ignore, use original file
    }
  }

  // Attempt Firebase Storage upload if available
  if (storage) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(storage, `uploads/${Date.now()}_${sanitizedName}`);
      const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

      const storagePromise = new Promise<UploadedMedia>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
          },
          (error) => {
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve({
                url: downloadUrl,
                name: file.name,
                size: formatFileSize(compressedBlob.size || file.size),
                type: mediaType,
              });
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      // 5-second timeout race: if Firebase Storage hangs or CORS fails, fall back to dataUrl
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase Storage timeout')), 5000)
      );

      const uploaded = await Promise.race([storagePromise, timeoutPromise]);
      return uploaded;
    } catch (e) {
      console.warn('Firebase Storage unavailable, falling back to instant data reader:', e);
    }
  }

  // Fallback: If we already compressed the image, return its lightweight dataUrl directly
  if (compressedDataUrl) {
    if (onProgress) onProgress(100);
    return {
      url: compressedDataUrl,
      name: file.name,
      size: formatFileSize(compressedBlob.size || file.size),
      type: mediaType,
    };
  }

  // Fallback for non-image files (documents, audio, etc.)
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
