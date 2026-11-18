import React, { useState } from 'react';
import { DownloadCloud, Sparkles, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { type AppUpdateInfo, triggerAppUpdate } from '../../services/updateService';
import { Capacitor } from '@capacitor/core';
import logoImg from '../../assets/logo.png';

interface UpdateModalProps {
  update: AppUpdateInfo;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ update, onClose }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const handleUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => {
      triggerAppUpdate(update);
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      style={{ direction: 'rtl' }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-[#070913]/95 border border-white/20 shadow-2xl shadow-cyan-500/20 backdrop-blur-3xl overflow-hidden p-6 sm:p-7 flex flex-col gap-5 text-right">
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center p-2.5 shadow-lg shadow-cyan-500/20">
              <img src={logoImg} alt="GXE" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold">
                  v{update.latestVersion}
                </span>
                <span className="text-[11px] text-slate-400">الإصدار الأخير</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                تحديث جديد متوفر للتطبيق 🚀
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Release Notes Card */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ما الجديد في هذا التحديث:</span>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto pr-1">
            {update.releaseNotes}
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 text-[11px] text-emerald-400/90 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>تحديث رسمي وموقع رقمياً من مستودع GitHub الرسمي</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 border border-white/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري بدء التحديث...</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                <span>{isNative ? 'تنزيل وتثبيت التحديث الآن ⚡' : 'تحديث المنصة الآن ⚡'}</span>
              </>
            )}
          </button>

          <a
            href={update.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
};
