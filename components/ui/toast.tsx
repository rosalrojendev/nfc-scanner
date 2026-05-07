"use client";

import * as React from "react";

type ToastTone = "default" | "success" | "error";

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  const notify = React.useCallback(
    (message: string, tone: ToastTone = "default") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2400);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 items-center"
        style={{ bottom: "calc(96px + env(safe-area-inset-bottom))" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto rounded-[14px] px-4 py-3 text-[0.9rem] shadow-[var(--shadow-lg)] text-center w-[min(90vw,360px)]"
            style={{
              animation: "toastIn 220ms ease-out",
              background:
                t.tone === "error"
                  ? "var(--color-error)"
                  : t.tone === "success"
                    ? "var(--color-success)"
                    : "var(--color-text)",
              color: "var(--color-text-inverse)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
