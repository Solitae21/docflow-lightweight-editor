import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "error" | "success" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  persistent: boolean;
}

interface ToastHelpers {
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: ToastHelpers;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 4;
const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = crypto.randomUUID();
      const persistent = variant === "error";
      const item: Toast = { id, variant, message, persistent };

      setToasts((prev) => {
        const next = prev.length >= MAX_TOASTS ? prev.slice(1) : prev;
        return [...next, item];
      });

      if (!persistent) {
        const timer = setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
        timers.current.set(id, timer);
      }
    },
    [removeToast]
  );

  const toast = useMemo<ToastHelpers>(
    () => ({
      error: (message) => addToast(message, "error"),
      success: (message) => addToast(message, "success"),
      info: (message) => addToast(message, "info"),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
