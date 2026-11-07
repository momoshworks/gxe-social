import React, { useState, useEffect } from 'react';
import { X, Cloud, Check, ExternalLink, RefreshCw, Zap, Server, Database } from 'lucide-react';
import { isCloudConnected, checkCloudHealth, CLOUDFLARE_WORKER_URL } from '../../services/cloudflare';

interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const isConnected = isCloudConnected();
  const [latency, setLatency] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);

  const testPing = async () => {
    try {
      setTesting(true);
      const start = performance.now();
      await checkCloudHealth();
      const end = performance.now();
      const ms = Math.round(end - start);
      setLatency(ms);
      if (onNotify) {
        onNotify(`تم الاتصال بسحابة Cloudflare D1 بنجاح! سرعة الاستجابة: ${ms}ms ⚡`, 'success');
      }
    } catch {
      if (onNotify) {
        onNotify('تعذر الوصول لخادم Cloudflare D1، جاري المحاولة من الكاش المحلي', 'info');
      }
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      testPing();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="w-full max-w-xl bg-[#000000] border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2f3336] bg-[#16181c]/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#f6821f]/10 text-[#f6821f] border border-[#f6821f]/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[#e7e9ea]">سحابة Cloudflare D1 العالمية</h2>
              <p className="text-xs text-[#71767b]">قاعدة البيانات والـ API السحابي لتطبيق GXE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-[#71767b] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status Badge */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
              <div>
                <p className="font-bold text-sm">
                  {isConnected
                    ? 'متصل بقاعدة بيانات Cloudflare D1 الحية (gxe-db)!'
                    : 'قيد الاتصال بسحابة Cloudflare D1'}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  خوادم الحافة (Edge Network) موزعة عالمياً وتضمن 0ms استجابة لحظية
                </p>
              </div>
            </div>
            <button
              onClick={testPing}
              disabled={testing}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs text-white font-medium flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{latency !== null ? `${latency} ms` : 'قياس السرعة'}</span>
            </button>
          </div>

          {/* Infrastructure Details */}
          <div className="space-y-3">
            <h3 className="font-bold text-[#e7e9ea] text-xs flex items-center gap-2">
              <Server className="w-4 h-4 text-[#f6821f]" />
              بيانات البنية التحتية السحابية:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#16181c] border border-[#2f3336]">
                <div className="text-[11px] text-[#71767b]">مزود السحابة</div>
                <div className="font-bold text-white mt-1 flex items-center gap-1.5">
                  <span className="text-[#f6821f]">Cloudflare Workers + D1</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#16181c] border border-[#2f3336]">
                <div className="text-[11px] text-[#71767b]">اسم قاعدة البيانات</div>
                <div className="font-bold text-white mt-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>gxe-db (WEUR Paris)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#16181c] border border-[#2f3336] sm:col-span-2">
                <div className="text-[11px] text-[#71767b]">رابط نقطة الـ API السحابية</div>
                <div className="font-mono text-xs text-emerald-400 mt-1 break-all flex items-center justify-between">
                  <span>{CLOUDFLARE_WORKER_URL}</span>
                  <a
                    href={`${CLOUDFLARE_WORKER_URL}/api/status`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-[#71767b] hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Speed & Optimization Metrics */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#16181c] to-[#0a0a0a] border border-[#2f3336] space-y-2.5">
            <h4 className="font-bold text-xs text-[#e7e9ea] flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              سرعة الاستجابة الفائقة (0ms Optimistic UI)
            </h4>
            <ul className="text-xs text-[#71767b] space-y-1.5 leading-relaxed">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>إضافة الهري (المنشورات) وحذفها يظهران فوراً في 0ms على الشاشة.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>التعليقات (الهاري) تُحفظ في الحافة وتُبث لجميع المستخدمين عالمياً.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>المزامنة التلقائية مع خوادم Cloudflare في باريس (CDG) بزمن استجابة أقل من 1ms في الـ SQL.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2f3336] bg-[#16181c]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-gray-200 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
