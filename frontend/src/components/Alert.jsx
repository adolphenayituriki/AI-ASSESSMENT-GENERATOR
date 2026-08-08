import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Alert({ type = 'info', message, onClose }) {
  const styles = {
    success: { wrap: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> },
    error: { wrap: 'bg-rose-50 border-rose-200 text-rose-800', icon: <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" /> },
    info: { wrap: 'bg-sky-50 border-sky-200 text-sky-800', icon: <Info className="h-5 w-5 shrink-0 text-sky-500" /> },
  };
  const s = styles[type] || styles.info;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${s.wrap}`}>
      {s.icon}
      <p className="flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 transition hover:opacity-100" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
