import { clsx } from "clsx";

const CONTROL =
  "w-full h-10 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-sm text-ink " +
  "placeholder:text-faint transition-colors hover:border-faint " +
  "focus-visible:outline-none focus-visible:border-teal-600 focus-visible:ring-2 focus-visible:ring-teal/40";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink">
      {children}
    </label>
  );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={clsx(CONTROL, rest.type === "time" && "tnum", className)} />;
}

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={clsx(CONTROL, "pr-8", className)} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={clsx(CONTROL, "h-auto min-h-20 py-2", className)} />;
}

export function Checkbox({ id, children, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
      <input
        {...rest}
        id={id}
        type="checkbox"
        className="size-4 rounded-[3px] border-line-strong accent-navy"
      />
      {children}
    </label>
  );
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5 text-sm text-danger">
      {children}
    </div>
  );
}
