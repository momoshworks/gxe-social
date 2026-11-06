import React, { useState } from 'react';
import { X, Sparkles, Mail, Lock, User as UserIcon, LogIn } from 'lucide-react';
import { loginWithGoogle, loginWithEmail, registerWithEmail } from '../../services/authService';
import type { User } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  onNotify?: (text: string, type?: 'success' | 'info') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNotify,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const user = await loginWithGoogle();
      if (onNotify) onNotify(`مرحباً بك يا ${user.name}! تم تسجيل الدخول بنجاح وحفظ بياناتك سحابياً 🚀`, 'success');
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء الاتصال بحساب Google');
      if (onNotify) onNotify('يرجى التحقق من مفاتيح Firebase لتسجيل الدخول السحابي أو المتابعة كضيف', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setErrorMsg('');
      let user: User;
      if (isSignUp) {
        user = await registerWithEmail(email, password, displayName);
        if (onNotify) onNotify('تم إنشاء الحساب بنجاح! تم تسجيل بياناتك سحابياً 🎉', 'success');
      } else {
        user = await loginWithEmail(email, password);
        if (onNotify) onNotify(`أهلاً بعودتك يا ${user.name}! 👋`, 'success');
      }
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Email auth error:', err);
      setErrorMsg(err.message || 'فشل تسجيل الدخول بالبريد الإلكتروني');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div
        className="w-full max-w-md bg-[#000000] border border-[#2f3336] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full text-[#71767b] hover:text-[#e7e9ea] hover:bg-[#181818] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mt-2">
          <img src="/logo.png" alt="GXE Logo" className="w-14 h-14 object-contain mb-3 drop-shadow-md" />
          <h2 className="text-2xl font-black text-[#e7e9ea] tracking-tight">
            انضم إلى مجتمع <span className="text-[#1d9bf0]">GXE</span>
          </h2>
          <p className="text-xs text-[#71767b] mt-1 max-w-xs leading-relaxed">
            منصة التواصل الاجتماعي الحية — حسابك وبياناتك تُحفظ سحابياً وتتزامن تلقائياً بدون أي تدخل منك.
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* Google Sign-in Button */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-full bg-white hover:bg-gray-100 active:scale-98 text-black font-bold text-sm shadow-md transition-all border border-gray-200"
          >
            {/* Google Logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'جاري الاتصال السحابي...' : 'تسجيل الدخول بحساب Google'}</span>
          </button>

          <div className="flex items-center my-2">
            <div className="flex-1 border-t border-[#2f3336]" />
            <span className="px-3 text-xs text-[#71767b]">أو عبر البريد</span>
            <div className="flex-1 border-t border-[#2f3336]" />
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {isSignUp && (
            <div className="relative">
              <UserIcon className="absolute right-3.5 top-3 w-4 h-4 text-[#71767b]" />
              <input
                type="text"
                placeholder="الاسم الكامل"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required={isSignUp}
                className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl pr-10 pl-4 py-2.5 text-xs text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] outline-none"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute right-3.5 top-3 w-4 h-4 text-[#71767b]" />
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl pr-10 pl-4 py-2.5 text-xs text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] outline-none"
            />
          </div>

          <div className="relative">
            <Lock className="absolute right-3.5 top-3 w-4 h-4 text-[#71767b]" />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#16181c] border border-[#2f3336] rounded-xl pr-10 pl-4 py-2.5 text-xs text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] active:scale-98 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Sparkles className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{isSignUp ? 'إنشاء حساب جديد' : 'دخول'}</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Sign up / Login */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-[#1d9bf0] hover:underline"
          >
            {isSignUp
              ? 'لديك حساب بالفعل؟ تسجيل الدخول'
              : 'ليس لديك حساب؟ إنشاء حساب جديد في GXE'}
          </button>
        </div>
      </div>
    </div>
  );
};
