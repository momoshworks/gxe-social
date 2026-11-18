import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, LogIn, Sparkles, UserPlus, Zap } from 'lucide-react';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  quickJoin,
  getCleanDefaultAvatar,
} from '../../services/authService';
import type { User } from '../../types';
import logoImg from '../../assets/logo.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  onOpenCloudSettings?: () => void;
  onNotify?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNotify,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'quick'>('login');
  const [identifier, setIdentifier] = useState(''); // username or email for login
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(getCleanDefaultAvatar('cyber_1'));
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Preset modern avatar seeds
  const avatarPresets = [
    getCleanDefaultAvatar('gxe_quantum'),
    getCleanDefaultAvatar('gxe_neon'),
    getCleanDefaultAvatar('gxe_aurora'),
    getCleanDefaultAvatar('gxe_zenith'),
    getCleanDefaultAvatar('gxe_matrix'),
    getCleanDefaultAvatar('gxe_pulse'),
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const user = await loginWithEmail(identifier.trim(), password);
      if (onNotify) onNotify(`أهلاً بعودتك يا ${user.name}! تم تسجيل الدخول بنجاح 👋`, 'success');
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'فشل تسجيل الدخول، تأكد من صحة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('يرجى كتابة اسمك');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setErrorMsg('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل (بالإنجليزية)');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صالح');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('كلمة المرور يجب أن لا تقل عن 6 خانات');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const finalAvatar = customAvatarUrl.trim() || selectedAvatar;
      const user = await registerWithEmail(
        email.trim(),
        password,
        displayName.trim(),
        username.trim(),
        finalAvatar
      );
      if (onNotify) onNotify(`تم إنشاء الحساب بنجاح يا ${user.name}! مرحباً بك في GXE 🚀`, 'success');
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('يرجى كتابة الاسم أو اللقب');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const finalAvatar = customAvatarUrl.trim() || selectedAvatar;
      const user = await quickJoin(displayName.trim(), finalAvatar);
      if (onNotify) onNotify(`تم الدخول بنجاح كـ ${user.name}! 🌟`, 'success');
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Quick join error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء الدخول السريع');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const user = await loginWithGoogle();
      if (onNotify) onNotify(`تم الدخول بحساب Google كـ ${user.name}! 🚀`, 'success');
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء تسجيل الدخول بـ Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fade-in select-none">
      <div
        className="w-full max-w-lg glass-panel p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col border border-white/15 border-t-white/30 bg-[#0A0E1A]/95 backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-accent-bar" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mt-1">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.08] border border-white/20 p-2 shadow-xl shadow-cyan-500/10 flex items-center justify-center mb-3">
            <img src={logoImg} alt="GXE Logo" className="w-full h-full object-contain drop-shadow" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            بوابة تسجيل الدخول <span className="text-cyan-400">GXE</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
            بياناتك تُحفظ سحابياً على Cloudflare D1 في بيئة مشفرة وسريعة للغاية.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 mt-5 rounded-2xl bg-white/[0.05] border border-white/10">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 border border-white/20'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30 border border-white/20'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>حساب جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('quick');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'quick'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30 border border-white/20'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>دخول سريع</span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <UserIcon className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="مثال: ahmed أو ahmed@gmail.com"
                  className="w-full bg-white/[0.06] border border-white/15 rounded-xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="w-full bg-white/[0.06] border border-white/15 rounded-xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول إلى حسابك</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="w-full bg-white/[0.06] border border-white/15 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  اسم المستخدم (@username)
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="ahmed_99"
                  className="w-full bg-white/[0.06] border border-white/15 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-white/[0.06] border border-white/15 rounded-xl py-2 pr-9 pl-3 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  كلمة المرور (6+ أحرف)
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.06] border border-white/15 rounded-xl py-2 pr-9 pl-3 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اختر صورتك الرمزية (أو أدخل رابط مخصص)
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {avatarPresets.map((avUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avUrl);
                      setCustomAvatarUrl('');
                    }}
                    className={`p-1 rounded-xl transition-all shrink-0 ${
                      selectedAvatar === avUrl && !customAvatarUrl
                        ? 'border-2 border-cyan-400 scale-105 bg-cyan-500/20 shadow-md shadow-cyan-500/30'
                        : 'border border-white/15 hover:border-white/40'
                    }`}
                  >
                    <img src={avUrl} alt="Avatar" className="w-8 h-8 rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>إنشاء حساب موثق في Cloudflare D1</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: QUICK JOIN */}
        {tab === 'quick' && (
          <form onSubmit={handleQuickJoin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اسمك المستعار أو اسم الشهرة
              </label>
              <div className="relative">
                <UserIcon className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: الفهد الأسود أو محمد"
                  className="w-full bg-white/[0.06] border border-white/15 rounded-xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-400 outline-none focus:border-purple-400 transition-colors"
                />
              </div>
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اختر الأيقونة المفضلة
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {avatarPresets.map((avUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avUrl);
                      setCustomAvatarUrl('');
                    }}
                    className={`p-1 rounded-xl transition-all shrink-0 ${
                      selectedAvatar === avUrl && !customAvatarUrl
                        ? 'border-2 border-purple-400 scale-105 bg-purple-500/20 shadow-md shadow-purple-500/30'
                        : 'border border-white/15 hover:border-white/40'
                    }`}
                  >
                    <img src={avUrl} alt="Avatar" className="w-8 h-8 rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>دخول فوري بدون كلمة مرور 🚀</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Separator & Google 1-Click Login */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2.5 active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>الدخول السريع بحساب Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
