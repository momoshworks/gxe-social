import React, { useState } from 'react';
import { DownloadCloud, Sparkles, X, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import {
  type AppUpdateInfo,
  performInstantOtaUpdate,
  downloadApkFile,
  dismissUpdate,
} from '../../services/updateService';
import logoImg from '../../assets/logo.png';

interface UpdateModalProps {
  update: AppUpdateInfo;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ update, onClose }) => {
  const [isUpdatingInstant, setIsUpdatingInstant] = useState(false);
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [showCertDetails, setShowCertDetails] = useState(false);

  const handleDismiss = () => {
    dismissUpdate(update.latestVersion);
    onClose();
  };

  const handleInstantUpdate = async () => {
    setIsUpdatingInstant(true);
    await performInstantOtaUpdate(update.latestVersion);
  };

  const handleApkDownload = () => {
    setIsDownloadingApk(true);
    downloadApkFile(update.directCdnApkUrl || update.apkDownloadUrl, update.latestVersion);
    setTimeout(() => {
      setIsDownloadingApk(false);
    }, 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none overflow-y-auto"
      style={{ direction: 'rtl' }}
    >
      <div className="relative w-full max-w-md my-auto rounded-3xl bg-[#070913]/95 border border-white/20 shadow-2xl shadow-cyan-500/20 backdrop-blur-3xl overflow-hidden p-5 sm:p-7 flex flex-col gap-4 text-right">
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center p-2.5 shadow-lg shadow-cyan-500/20 shrink-0">
              <img src={logoImg} alt="GXE" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold">
                  v{update.latestVersion}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  متاح الآن
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                تحديث جديد متوفر للتطبيق 🚀
              </h2>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Release Notes Card */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ما الجديد في هذا التحديث:</span>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto pr-1">
            {update.releaseNotes}
          </div>
        </div>

        {/* Official Security Certificate Badge */}
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3 flex flex-col gap-1.5 text-right">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>شهادة أمان رقمية رسمية معتمدة (RSA 2048-bit)</span>
            </div>
            <button
              onClick={() => setShowCertDetails(!showCertDetails)}
              className="text-[10px] text-emerald-300/80 hover:text-white underline"
            >
              {showCertDetails ? 'إخفاء التفاصيل' : 'عرض الشهادة'}
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">
            ملف التحديث موقع برمجياً وموثق برقم بصمة رسمي لحماية جهازك من أي رسائل تحذير في أندرويد.
          </p>

          {showCertDetails && (
            <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[10px] font-mono text-slate-400 space-y-1">
              <div><strong className="text-emerald-400">Issuer:</strong> CN=GXE Social Official, OU=Engineering, C=EG</div>
              <div><strong className="text-emerald-400">Validity:</strong> حتى أبريل 2054 (10,000 يوم)</div>
              <div><strong className="text-emerald-400">SHA-256:</strong> 8D:6D:C5:A7:58:F9:42:B7:21:B6:7E:FF:30:64...</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          {/* Option 1: Instant In-App Live Update (Recommended / 0s) */}
          <button
            onClick={handleInstantUpdate}
            disabled={isUpdatingInstant || isDownloadingApk}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-cyan-500/30 border border-cyan-300/30 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isUpdatingInstant ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري المزامنة والتحديث اللحظي...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span>تحديث لحظي فوري (الأسرع - ثانية واحدة) ⚡</span>
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-slate-400 -mt-1">
            ✨ يحدّث التطبيق والميزات مباشرة دون الحاجة لتنزيل أي ملف خارجي
          </p>

          <div className="flex items-center gap-2 my-0.5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-slate-500">أو تنزيل ملف APK</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Option 2: Direct High-Speed Cloudflare Edge CDN APK Download */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleApkDownload}
              disabled={isUpdatingInstant || isDownloadingApk}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/15 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {isDownloadingApk ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  <span>بدأ التحميل المباشر...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4 text-cyan-400" />
                  <span>تحميل مباشر سريع لملف APK</span>
                </>
              )}
            </button>

            {/* Option 3: GitHub Repo */}
            <a
              href={update.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
