"use client";

import { useState } from "react";
import { MagicWand, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api, type ResultadoGeneracion } from "@/lib/api";
import { HorarioGrid } from "./horario-grid";

export function HorarioPageClient({
  centro,
  horarioId,
}: {
  centro: string;
  horarioId: string;
}) {
  const t = useTranslations("horario");
  const tc = useTranslations("common");
  const confirmar = useConfirm();
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoGeneracion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gridKey, setGridKey] = useState(0);

  async function handleGenerar() {
    if (!(await confirmar({ mensaje: t("confirmarGenerar") }))) return;

    setGenerando(true);
    setError(null);
    setResultado(null);

    try {
      const r = await api.horarios.generar(centro, horarioId);
      setResultado(r);
      setGridKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("generando"));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <PageHeader titulo={t("titulo")} subtitulo={t("subtitulo")}>
        <Button onClick={handleGenerar} loading={generando}>
          {!generando && <MagicWand size={16} aria-hidden />}
          {generando ? t("generando") : t("generar")}
        </Button>
      </PageHeader>

      {resultado && (
        <div className="mb-4 flex items-center justify-between rounded-[var(--radius-control)] bg-ok-soft px-3 py-2.5">
          <p className="text-sm text-ok tnum">
            {t("generadoOk", {
              n: resultado.slots_creados,
              calidad: resultado.estado_solver === "OPTIMO" ? t("optimo") : t("factible"),
              tiempo: resultado.tiempo_segundos,
            })}
          </p>
          <button
            onClick={() => setResultado(null)}
            className="ml-4 text-ok hover:opacity-70"
            aria-label={tc("cerrar")}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5"
        >
          <p className="text-sm text-danger">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-4 text-danger hover:opacity-70"
            aria-label={tc("cerrar")}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      )}

      <HorarioGrid key={gridKey} centro={centro} horarioId={horarioId} />
    </div>
  );
}
