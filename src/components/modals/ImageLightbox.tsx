import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, Check, Sparkles } from 'lucide-react';
import { downloadFile } from '../../services/storageService';

interface ImageLightboxProps {
  imageUrl: string | null;
  imageName?: string;
  imageSize?: string;
  postContent?: string;
  onClose: () => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  imageName = 'x-image.jpg',
  imageSize,
  postContent,
  onClose,
  onNotify,
}) => {
  const [scale, setScale] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadFile(imageUrl, imageName);
      setDownloaded(true);
      if (onNotify) onNotify('تم بدء تنزيل الصورة بنجاح على جهازك! 📥', 'success');
      setTimeout(() => setDownloaded(false), 3000);
    } catch (e) {
      console.error('Download failed:', e);
      if (onNotify) onNotify('حدث خطأ أثناء تنزيل الملف', 'info');
    } finally {
      setDownloading(false);
    }
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in select-none">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 bg-gradient-to-b from-black/80 to-transparent z-10">
        {/* File info */}
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="font-medium text-white truncate max-w-xs">{imageName}</span>
          {imageSize && <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">{imageSize}</span>}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1">
            <button
              onClick={zoomOut}
              title="تصغير"
              className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              title="إعادة ضبط"
              className="px-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              title="تكبير"
              className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {scale !== 1 && (
              <button
                onClick={resetZoom}
                className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instant Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all duration-200 ${
              downloaded
                ? 'bg-emerald-600 text-white'
                : 'glass-btn-primary'
            }`}
            title="تحميل الصورة بجودتها الكاملة إلى جهازك"
          >
            {downloaded ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم التنزيل</span>
              </>
            ) : downloading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>جاري التحميل...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل مباشر</span>
              </>
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full glass-btn-secondary text-white transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div
        className="w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden cursor-zoom-out"
        onClick={onClose}
      >
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-150 ease-out cursor-default"
          style={{ transform: `scale(${scale})` }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={postContent || 'تكبير الصورة'}
            className="max-w-[90vw] max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/15 select-none"
          />
        </div>
      </div>

      {/* Optional bottom snippet */}
      {postContent && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none px-4">
          <div className="max-w-xl glass-panel px-5 py-3 text-sm text-white text-center shadow-2xl pointer-events-auto">
            {postContent}
          </div>
        </div>
      )}
    </div>
  );
};
