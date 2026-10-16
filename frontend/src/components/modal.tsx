"use client";

import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";

type Props = {
  open: boolean;
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ open, titulo, onClose, children, className }: Props) {
  const tc = useTranslations("common");
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar con Escape (solo mientras está abierto)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Foco inicial dentro del diálogo; al cerrar, vuelve al elemento que lo abrió
  useEffect(() => {
    if (!open) return;
    const previo = document.activeElement as HTMLElement | null;
    const primero = panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-cerrar])");
    (primero ?? panelRef.current)?.focus();
    return () => previo?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-navy-900/45 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={clsx(
          "animate-pop-in flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-pop)] outline-none",
          className ?? "max-w-md",
        )}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{titulo}</h2>
          <button
            data-cerrar
            onClick={onClose}
            aria-label={tc("cerrar")}
            className="-mr-2 grid size-8 place-items-center rounded-[var(--radius-control)] text-faint transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pt-3 pb-6">{children}</div>
      </div>
    </div>
  );
}
