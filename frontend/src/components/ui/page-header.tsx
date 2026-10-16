export function PageHeader({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-muted tnum">{subtitulo}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
