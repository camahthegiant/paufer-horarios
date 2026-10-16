import { clsx } from "clsx";

// Tabla sin tarjeta pesada: un borde fino y filas separadas por líneas
export function Table({
  children,
  className,
  cols,
}: {
  children: React.ReactNode;
  className?: string;
  /** Anchos de columna (clases w-*): fija el layout para que varias tablas seguidas alineen sus columnas */
  cols?: string[];
}) {
  return (
    <div className={clsx("overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]", className)}>
      <table className={clsx("w-full text-sm", cols && "table-fixed")}>
        {cols && (
          <colgroup>
            {cols.map((w, i) => <col key={i} className={w} />)}
          </colgroup>
        )}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-line bg-canvas/60 text-left text-xs font-medium text-muted">
      {children}
    </thead>
  );
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={clsx("px-4 py-2.5 font-medium", className)}>{children}</th>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={clsx("group transition-colors hover:bg-canvas/70", className)}>{children}</tr>;
}

export function TD({ children, className, mono }: { children?: React.ReactNode; className?: string; mono?: boolean }) {
  return <td className={clsx("px-4 py-3 text-ink", mono && "font-mono tnum", className)}>{children}</td>;
}

// Acciones de fila: discretas, visibles al pasar el ratón o al enfocar con teclado
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      {children}
    </div>
  );
}
