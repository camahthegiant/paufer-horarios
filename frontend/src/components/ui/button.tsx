import { clsx } from "clsx";
import { CircleNotch } from "@phosphor-icons/react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-canvas hover:border-faint",
  ghost: "text-muted hover:text-ink hover:bg-ink/5",
  danger: "bg-danger text-white hover:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, disabled, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium whitespace-nowrap",
        "transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading && <CircleNotch size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
