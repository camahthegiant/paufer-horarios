"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";

type Toast = { id: number; tipo: "ok" | "error"; mensaje: string };
type Ctx = { ok: (m: string) => void; error: (m: string) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast fuera de ToastProvider");
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const quitar = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (tipo: Toast["tipo"], mensaje: string) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, tipo, mensaje }]);
      setTimeout(() => quitar(id), tipo === "error" ? 7000 : 3500);
    },
    [quitar],
  );

  const api: Ctx = {
    ok: (m) => push("ok", m),
    error: (m) => push("error", m),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tipo === "error" ? "alert" : "status"}
            className="animate-pop-in pointer-events-auto flex items-start gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-3.5 text-sm text-ink shadow-[var(--shadow-pop)]"
          >
            {t.tipo === "ok" ? (
              <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-ok" aria-hidden />
            ) : (
              <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-danger" aria-hidden />
            )}
            <p className="flex-1">{t.mensaje}</p>
            <button
              onClick={() => quitar(t.id)}
              aria-label="Cerrar"
              className="shrink-0 text-faint transition-colors hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
