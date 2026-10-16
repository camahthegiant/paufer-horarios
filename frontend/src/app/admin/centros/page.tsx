"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CaretRight } from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type Centro = { id: string; nombre: string; slug: string; activo: boolean };

export default function AdminCentrosPage() {
  const t = useTranslations("centros");
  const tc = useTranslations("common");
  const router = useRouter();
  const [centros, setCentros] = useState<Centro[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.centros.listar()
      .then(setCentros)
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="min-h-screen bg-canvas p-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader titulo={t("titulo")} subtitulo={cargando ? tc("cargando") : t("subtitulo")} />

        {cargando && <TableSkeleton rows={3} />}

        {centros.length > 0 && (
          <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
            {centros.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => router.push(`/${c.slug}`)}
                  className="group flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-canvas/70"
                >
                  <span>
                    <span className="block font-medium text-ink">{c.nombre}</span>
                    <span className="mt-0.5 block font-mono text-xs text-faint">{c.slug}</span>
                  </span>
                  <CaretRight size={16} className="text-faint group-hover:text-ink" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        {!cargando && centros.length === 0 && (
          <EmptyState icon={<CaretRight size={32} />} texto={t("sinCentros")} />
        )}
      </div>
    </div>
  );
}
