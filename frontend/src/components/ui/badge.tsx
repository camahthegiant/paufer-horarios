import { clsx } from "clsx";

type Tone = "ok" | "warn" | "danger" | "neutral" | "accent";

const TONES: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-ink/5 text-muted",
  accent: "bg-teal-soft text-navy",
};

// Etiqueta cuadrada (no píldora): se lee como dato, no como botón
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-[var(--radius-tag)] px-1.5 py-0.5 text-xs font-medium leading-5",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
