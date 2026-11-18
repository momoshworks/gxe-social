import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GXE Uncaught Exception:', error, errorInfo);
  }

  private handleHardReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((r) => r.unregister());
        });
      }
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-[#06080F] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 sm:p-8 flex flex-col items-center text-center gap-4 border border-white/15 bg-[#0A0E1A]/95 backdrop-blur-3xl shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">تحديث الواجهة والذاكرة المؤقتة</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                تم رصد بيانات مؤقتة قديمة في المتصفح. اضغط على الزر أدناه لتنظيف الذاكرة المؤقتة وإعادة فتح المنصة مباشرة.
              </p>
            </div>
            {this.state.error && (
              <div className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 text-[11px] font-mono text-right overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center gap-2.5 w-full pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 glass-btn-primary py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة التحميل</span>
              </button>
              <button
                onClick={this.handleHardReset}
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-rose-500/20 border border-white/15 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="مسح الكاش المحلي"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح الكاش</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
