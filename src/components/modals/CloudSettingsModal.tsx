import React, { useState } from 'react';
import { X, Cloud, Check, Copy, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { isCloudConnected, getSavedConfig, saveFirebaseConfig, clearFirebaseConfig } from '../../services/firebase';
import type { FirebaseConfig } from '../../types';

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
  const currentConfig = getSavedConfig();

  const [rawSnippet, setRawSnippet] = useState('');
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || 'project-442284585270');
  const [storageBucket, setStorageBucket] = useState(currentConfig?.storageBucket || 'project-442284585270.appspot.com');
  const [appId, setAppId] = useState(currentConfig?.appId || '');
  const [copiedRules, setCopiedRules] = useState(false);

  if (!isOpen) return null;

  // Auto-parse when user pastes standard firebaseConfig snippet
  const handleSnippetPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawSnippet(val);

    try {
      const apiKeyMatch = val.match(/apiKey:\s*["']([^"']+)["']/);
      const projectIdMatch = val.match(/projectId:\s*["']([^"']+)["']/);
      const storageBucketMatch = val.match(/storageBucket:\s*["']([^"']+)["']/);
      const appIdMatch = val.match(/appId:\s*["']([^"']+)["']/);

      if (apiKeyMatch) setApiKey(apiKeyMatch[1]);
      if (projectIdMatch) setProjectId(projectIdMatch[1]);
      if (storageBucketMatch) setStorageBucket(storageBucketMatch[1]);
      if (appIdMatch) setAppId(appIdMatch[1]);

      if (apiKeyMatch && projectIdMatch && onNotify) {
        onNotify('تم استخراج بيانات Firebase بنجاح تلقائياً!', 'success');
      }
    } catch (err) {
      console.warn('Parsing snippet error', err);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      if (onNotify) onNotify('يرجى ملء API Key و Project ID على الأقل', 'info');
      return;
    }

    const newConfig: FirebaseConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: '',
      appId: appId.trim(),
    };

    saveFirebaseConfig(newConfig);
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من رغبتك بالعودة للوضع التجريبي المحلي؟')) {
      clearFirebaseConfig();
    }
  };

  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // مناسب للبدء الفوري والتطوير
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(firestoreRulesText);
    setCopiedRules(true);
    if (onNotify) onNotify('تم نسخ قواعد الحماية للحافظة', 'success');
    setTimeout(() => setCopiedRules(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="w-full max-w-2xl bg-[#000000] border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f3336] bg-[#080808]">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-6 h-6 text-[#1d9bf0]" />
            <div>
              <h2 className="font-bold text-lg text-[#e7e9ea]">إعدادات قاعدة البيانات السحابية (Firebase)</h2>
              <p className="text-xs text-[#71767b]">سحابية مجانية 100% ⚡ تعمل دائماً بدون توقف مع Real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#71767b] hover:text-[#e7e9ea] hover:bg-[#181818] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Box */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isConnected
                ? 'bg-[#00ba7c]/10 border-[#00ba7c]/40 text-[#00ba7c]'
                : 'bg-[#ff9900]/10 border-[#ff9900]/40 text-[#ff9900]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-3.5 h-3.5 rounded-full animate-pulse ${isConnected ? 'bg-[#00ba7c]' : 'bg-[#ff9900]'}`} />
              <div>
                <p className="font-bold text-sm">
                  {isConnected
                    ? 'متصل بقاعدة بيانات Firebase السحابية الحية!'
                    : 'الوضع الحالي: تجريبي محلي فوري (مع مزامنة حية بين التبويبات)'}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {isConnected
                    ? `المشروع المرتبط: ${currentConfig?.projectId}`
                    : 'يمكنك استخدام التطبيق الآن مباشرة أو ربط حسابك في Firebase أدناه لتخزين منشوراتك سحابياً للأبد'}
                </p>
              </div>
            </div>

            {isConnected && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
              >
                فصل الاتصال
              </button>
            )}
          </div>

          {/* Quick Steps Guide */}
          <div className="bg-[#16181c] border border-[#2f3336] rounded-xl p-4 text-xs text-[#e7e9ea] space-y-2">
            <h4 className="font-bold text-[#1d9bf0] flex items-center gap-1.5 text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>كيف تحصل على إعدادات Firebase المجانية في دقيقة واحدة؟</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-[#71767b] leading-relaxed pr-2">
              <li>
                ادخل إلى{' '}
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1d9bf0] hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Firebase Console <ExternalLink className="w-3 h-3" />
                </a>{' '}
                وأنشئ مشروعاً جديداً (مجاني مدى الحياة بالكامل).
              </li>
              <li>
                من القائمة الجانبية: اختر <b className="text-white">Firestore Database</b> واضغط <b>Create Database</b>.
              </li>
              <li>
                اختر <b className="text-white">Storage</b> واضغط <b>Get Started</b> لتفعيل رفع وتخزين الصور.
              </li>
              <li>
                من إعدادات المشروع (Project Settings ⚙️) اختر علامة الويب <b className="text-white">&lt;/&gt;</b> وانسخ الكود والصقه في الحقل أدناه!
              </li>
            </ol>
          </div>

          {/* Paste Snippet Section */}
          <div>
            <label className="block text-xs font-semibold text-[#e7e9ea] mb-1.5">
              لصق سريع لكود إعدادات Firebase (Paste firebaseConfig snippet):
            </label>
            <textarea
              value={rawSnippet}
              onChange={handleSnippetPaste}
              placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "my-social-app",\n  storageBucket: "...",\n  appId: "..."\n};`}
              rows={3}
              className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl p-3 text-xs font-mono text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] outline-none"
            />
          </div>

          {/* Individual Fields */}
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-[#71767b] mb-1">API Key *</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  required
                  className="w-full bg-[#16181c] border border-[#2f3336] rounded-lg px-3 py-2 text-[#e7e9ea] outline-none focus:border-[#1d9bf0]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#71767b] mb-1">Project ID *</label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="x-social-app-123"
                  required
                  className="w-full bg-[#16181c] border border-[#2f3336] rounded-lg px-3 py-2 text-[#e7e9ea] outline-none focus:border-[#1d9bf0]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#71767b] mb-1">Storage Bucket</label>
                <input
                  type="text"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  placeholder="x-social-app-123.appspot.com"
                  className="w-full bg-[#16181c] border border-[#2f3336] rounded-lg px-3 py-2 text-[#e7e9ea] outline-none focus:border-[#1d9bf0]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#71767b] mb-1">App ID</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:123456789:web:abcdef"
                  className="w-full bg-[#16181c] border border-[#2f3336] rounded-lg px-3 py-2 text-[#e7e9ea] outline-none focus:border-[#1d9bf0]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold rounded-full text-sm shadow-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>حفظ وربط قاعدة البيانات فوراً</span>
              </button>
            </div>
          </form>

          {/* Firestore Security Rules helper */}
          <div className="pt-2 border-t border-[#2f3336]/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#71767b]">
                قواعد الحماية المقترحة لـ Firestore و Storage (Security Rules):
              </span>
              <button
                type="button"
                onClick={copyRules}
                className="flex items-center gap-1 text-xs text-[#1d9bf0] hover:underline"
              >
                {copiedRules ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRules ? 'تم النسخ!' : 'نسخ القواعد'}</span>
              </button>
            </div>
            <pre className="bg-[#0b0e14] border border-[#2f3336] p-3 rounded-lg text-[11px] font-mono text-[#00ba7c] overflow-x-auto">
              {firestoreRulesText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
