import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const TYPES = {
  success: { icon: CheckCircle2, iconColor: 'text-emerald-600', bar: 'bg-emerald-500', ring: 'border-emerald-200' },
  error: { icon: XCircle, iconColor: 'text-rose-600', bar: 'bg-rose-500', ring: 'border-rose-200' },
  warning: { icon: AlertTriangle, iconColor: 'text-amber-600', bar: 'bg-amber-500', ring: 'border-amber-200' },
  info: { icon: Info, iconColor: 'text-brand-green-dark', bar: 'bg-brand-green-dark', ring: 'border-brand-green-light' },
};

const DEFAULT_DURATION = 4000;
const LEAVE_MS = 200;
const MAX_VISIBLE = 5;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, LEAVE_MS);
  }, []);

  const toast = useCallback(
    (message, type = 'info', duration = DEFAULT_DURATION) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, message, type, duration, leaving: false }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = {
    toast,
    success: (message, duration) => toast(message, 'success', duration),
    error: (message, duration) => toast(message, 'error', duration),
    warning: (message, duration) => toast(message, 'warning', duration),
    info: (message, duration) => toast(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col items-end gap-2">
        {toasts.map((t) => {
          const cfg = TYPES[t.type] || TYPES.info;
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border ${cfg.ring} bg-white p-3.5 pr-3 shadow-lift ${
                t.leaving ? 'toast-leave' : 'toast-enter'
              }`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.iconColor}`} />
              <p className="min-w-0 flex-1 text-sm font-medium text-slate-800">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
              <span
                className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar} toast-countdown`}
                style={{ animationDuration: `${t.duration}ms` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
