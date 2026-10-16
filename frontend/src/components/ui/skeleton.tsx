import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded-[var(--radius-control)] bg-ink/8", className)} />;
}

// Esqueleto con la forma de una tabla, para no saltar de layout al cargar
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-4" role="status" aria-busy="true">
      <Skeleton className="mb-4 h-4 w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
