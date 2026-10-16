"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Minus, Star, DotsThree } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { api, type Restriccion, type TipoRestriccion, type Periodo } from "@/lib/api";

const CICLO: (TipoRestriccion | null)[] = [null, "NO_DISPONIBLE", "PREFERENCIA_EVITAR", "PREFERENCIA"];

const ESTILOS: Record<string, string> = {
  libre:              "bg-surface hover:bg-canvas border-line text-faint",
  NO_DISPONIBLE:      "bg-danger-soft hover:brightness-95 border-line text-danger",
  PREFERENCIA_EVITAR: "bg-warn-soft hover:brightness-95 border-line text-warn",
  PREFERENCIA:        "bg-teal-soft hover:brightness-95 border-line text-navy",
};

function IconoTipo({ tipo, size = 18 }: { tipo: string; size?: number }) {
  if (tipo === "NO_DISPONIBLE") return <X size={size} weight="bold" aria-hidden />;
  if (tipo === "PREFERENCIA_EVITAR") return <Minus size={size} weight="bold" aria-hidden />;
  return <Star size={size} weight="fill" aria-hidden />;
}

export function DisponibilidadGrid({
  centro,
  profesorId,
  profesorNombre,
}: {
  centro: string;
  profesorId: string;
  profesorNombre: string;
}) {
  const t = useTranslations("disponibilidad");
  const toast = useToast();

  const DIAS = [
    { key: "LUNES",     label: "Lun" },
    { key: "MARTES",    label: "Mar" },
    { key: "MIERCOLES", label: "Mié" },
    { key: "JUEVES",    label: "Jue" },
    { key: "VIERNES",   label: "Vie" },
  ];

  const LEYENDA = [
    { tipo: "NO_DISPONIBLE",      label: t("noDisponible") },
    { tipo: "PREFERENCIA_EVITAR", label: t("preferenciaEvitar") },
    { tipo: "PREFERENCIA",        label: t("preferencia") },
  ];
  const [restricciones, setRestricciones] = useState<Restriccion[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [guardando, setGuardando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [r, p] = await Promise.all([
      api.restricciones.listar(centro, profesorId),
      api.periodos.listar(centro),
    ]);
    setRestricciones(r);
    setPeriodos(p.filter((p) => p.es_lectivo)); // solo lectivos en disponibilidad
  }, [centro, profesorId]);

  useEffect(() => { cargar(); }, [cargar]);

  function getRestriccion(dia: string, periodoId: string): Restriccion | undefined {
    return restricciones.find(
      (r) => r.dia_semana === dia && r.periodo_id === periodoId
    );
  }

  async function handleClic(dia: string, periodoId: string) {
    const key = `${dia}-${periodoId}`;
    setGuardando(key);
    const actual = getRestriccion(dia, periodoId);
    const tipoActual = actual?.tipo ?? null;
    const idx = CICLO.indexOf(tipoActual);
    const siguiente = CICLO[(idx + 1) % CICLO.length];

    try {
      if (siguiente === null) {
        // Quitar restricción
        if (actual) await api.restricciones.eliminar(centro, profesorId, actual.id);
      } else {
        // Crear o actualizar (el backend hace upsert)
        await api.restricciones.crear(centro, profesorId, {
          dia_semana: dia,
          periodo_id: periodoId,
          tipo: siguiente,
        });
      }
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {t("descripcion", { nombre: profesorNombre })}
      </p>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block size-5 rounded-[var(--radius-tag)] border border-line bg-surface" />
          {t("libre")}
        </div>
        {LEYENDA.map((l) => (
          <div key={l.tipo} className="flex items-center gap-1.5 text-xs text-muted">
            <span className={`inline-flex size-5 items-center justify-center rounded-[var(--radius-tag)] border border-line ${ESTILOS[l.tipo]}`}>
              <IconoTipo tipo={l.tipo} size={12} />
            </span>
            {l.label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-24 px-3 py-2 text-left font-medium text-muted">{t("periodo")}</th>
              {DIAS.map((d) => (
                <th key={d.key} className="w-16 px-3 py-2 text-center font-medium text-ink">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {periodos.map((periodo) => (
              <tr key={periodo.id}>
                <td className="px-3 py-1.5">
                  <div className="font-medium text-ink">{periodo.nombre}</div>
                  <div className="font-mono tnum text-faint">{periodo.hora_inicio.slice(0,5)}</div>
                </td>
                {DIAS.map((dia) => {
                  const r = getRestriccion(dia.key, periodo.id);
                  const tipo = r?.tipo ?? null;
                  const key = `${dia.key}-${periodo.id}`;
                  const cargandoEste = guardando === key;
                  const estilo = ESTILOS[tipo ?? "libre"];
                  const etiqueta = tipo ? tipo.replace(/_/g, " ") : "Libre";
                  return (
                    <td key={dia.key} className="px-1.5 py-1 text-center">
                      <button
                        onClick={() => handleClic(dia.key, periodo.id)}
                        disabled={cargandoEste}
                        className={`inline-flex size-10 items-center justify-center rounded-[var(--radius-control)] border transition-colors disabled:opacity-50 ${estilo}`}
                        title={tipo ? `${tipo.replace(/_/g, " ")} · clic para cambiar` : "Libre · clic para marcar"}
                        aria-label={`${dia.label} ${periodo.nombre}: ${etiqueta}`}
                      >
                        {cargandoEste ? (
                          <DotsThree size={18} weight="bold" aria-hidden />
                        ) : tipo ? (
                          <IconoTipo tipo={tipo} />
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
