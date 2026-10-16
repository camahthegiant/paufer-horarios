export function EmptyState({
  icon,
  texto,
  children,
}: {
  icon: React.ReactNode;
  texto: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[var(--radius-panel)] border border-dashed border-line-strong px-8 py-12">
      <div className="text-faint" aria-hidden>{icon}</div>
      <p className="max-w-[48ch] text-sm text-muted">{texto}</p>
      {children}
    </div>
  );
}
