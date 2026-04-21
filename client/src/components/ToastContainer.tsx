import { useToast } from '../contexts/ToastContext';

const STYLES = {
  success: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
  error: 'bg-red-50 border border-red-200 text-red-700',
  info: 'bg-blue-50 border border-blue-200 text-blue-700',
};

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg pointer-events-auto
            animate-toast-in ${STYLES[toast.type]}`}
        >
          <span className="text-sm font-medium shrink-0">{ICONS[toast.type]}</span>
          <span className="text-sm flex-1">{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0 text-base leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
