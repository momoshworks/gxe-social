import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadProgressCallback {
  (progress: number): void;
}

export async function uploadMediaFile(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; name: string; size: string; type: 'image' | 'video' | 'file' }> {
  const mediaType: 'image' | 'video' | 'file' = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('video/')
    ? 'video'
    : 'file';

  const sizeFormatted = formatFileSize(file.size);

  // If Firebase Storage is initialized and available
  if (storage) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(storage, `uploads/${Date.now()}_${sanitizedName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
          },
          (error) => {
            console.error('Firebase Storage upload error:', error);
            reject(error);
          },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              url: downloadUrl,
              name: file.name,
              size: sizeFormatted,
              type: mediaType,
            });
          }
        );
      });
    } catch (e) {
      console.warn('Fallback to local data reader due to storage issue:', e);
    }
  }

  // Fallback for Local mode (Base64 data URL)
  return new Promise((resolve, reject) => {
    let simulatedProgress = 0;
    const interval = setInterval(() => {
      simulatedProgress += 25;
      if (onProgress) onProgress(Math.min(simulatedProgress, 95));
      if (simulatedProgress >= 100) {
        clearInterval(interval);
      }
    }, 50);

    const reader = new FileReader();
    reader.onload = () => {
      clearInterval(interval);
      if (onProgress) onProgress(100);
      resolve({
        url: reader.result as string,
        name: file.name,
        size: sizeFormatted,
        type: mediaType,
      });
    };
    reader.onerror = (error) => {
      clearInterval(interval);
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Downloads an image or file directly to the user's device
 */
export async function downloadFile(url: string, filename: string = 'x-media.png'): Promise<void> {
  try {
    // If it's a data url or blob url
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Remote URL: fetch blob to bypass CORS/cross-origin download restrictions
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.warn('Direct fetch failed, falling back to window.open or link:', error);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
