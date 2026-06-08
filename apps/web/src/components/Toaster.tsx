import { useToast, type Toast, type ToastVariant } from "../toast/ToastContext";

const ICONS: Record<ToastVariant, string> = {
  error: "!",
  success: "✓",
  info: "i",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div className={`toast toast--${toast.variant}`} role="alert" aria-live="assertive">
      <span className="toast-icon" aria-hidden="true">
        {ICONS[toast.variant]}
      </span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-dismiss"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toaster" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
}
