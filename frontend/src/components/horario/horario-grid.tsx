"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  api,
  type Slot,
  type SlotCreate,
  type Periodo,
  type Grupo,
  type Profesor,
  type ProfesorAsignatura,
} from "@/lib/api";

type Vista = "grupo" | "profesor";
type ModalState = { periodo: Periodo; dia: string };

const CELDA_VACIA =
  "flex min-h-[52px] w-full items-center justify-center rounded-[var(--radius-control)] border border-dashed border-line-strong " +
  "text-faint transition-colors hover:border-teal-600 hover:bg-teal-soft hover:text-teal-600";

// Clase asignada: fondo suave + franja lateral con el color de la asignatura (el color es dato, no decoración)
function CeldaClase({
  color,
  titulo,
  detalle,
  onClick,
  etiqueta,
}: {
  color: string | null;
  titulo: string;
  detalle: string;
  onClick: () => void;
  etiqueta: string;
}) {
  const c = color ?? "var(--color-navy)";
  return (
    <button
      onClick={onClick}
      title={etiqueta}
      aria-label={`${titulo}, ${detalle}. ${etiqueta}`}
      className="min-h-[52px] w-full rounded-[var(--radius-control)] border-l-[3px] px-2.5 py-1.5 text-left transition-[filter] hover:brightness-95"
      style={{ borderLeftColor: c, backgroundColor: `color-mix(in srgb, ${c} 13%, white)` }}
    >
      <div className="text-xs leading-tight font-semibold text-ink">{titulo}</div>
      <div className="mt-0.5 text-xs leading-tight text-muted">{detalle}</div>
    </button>
  );
}

function CeldaEspecialProfesor({
  periodo,
  dia,
  slot,
  onAdd,
  onRemove,
  t,
}: {
  periodo: Periodo;
  dia: string;
  slot: Slot | undefined;
  onAdd: () => void;
  onRemove: (slot: Slot) => void;
  t: ReturnType<typeof useTranslations<"horario">>;
}) {
  if (periodo.nombre === "Recreo") {
    return slot ? (
      <button
        onClick={() => onRemove(slot)}
        className="min-h-[40px] w-full rounded-[var(--radius-control)] border-l-[3px] border-warn bg-warn-soft px-2.5 py-1.5 text-left transition-[filter] hover:brightness-95"
        title={t("quitarClase")}
      >
        <div className="text-xs font-semibold text-warn">{t("patio")}</div>
      </button>
    ) : (
      <button onClick={onAdd} className={clsx(CELDA_VACIA, "min-h-[40px]")} title={t("asignarPatio")} aria-label={t("asignarPatio")}>
        <Plus size={14} aria-hidden />
      </button>
    );
  }

  if (periodo.nombre === "Reuniones") {
    return (
      <div className="flex min-h-[40px] items-center justify-center">
        <span className={clsx("text-xs", dia === "VIERNES" ? "text-faint italic" : "font-medium text-muted")}>
          {dia === "VIERNES" ? t("libre") : t("reuniones")}
        </span>
      </div>
    );
  }

  if (periodo.nombre === "Formación" && dia === "MIERCOLES") {
    return (
      <div className="flex min-h-[40px] items-center justify-center">
        <span className="text-xs font-medium text-navy">{t("formacion")}</span>
      </div>
    );
  }

  return <div className="min-h-[40px]" />;
}

export function HorarioGrid({ centro, horarioId }: { centro: string; horarioId: string }) {
  const t = useTranslations("horario");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirmar = useConfirm();

  const DIAS = [
    { key: "LUNES",     label: t("dias.LUNES") },
    { key: "MARTES",    label: t("dias.MARTES") },
    { key: "MIERCOLES", label: t("dias.MIERCOLES") },
    { key: "JUEVES",    label: t("dias.JUEVES") },
    { key: "VIERNES",   label: t("dias.VIERNES") },
  ];

  const [vista, setVista] = useState<Vista>("grupo");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [asignaciones, setAsignaciones] = useState<ProfesorAsignatura[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [grupoSel, setGrupoSel] = useState<Grupo | null>(null);
  const [profSel, setProfSel] = useState<Profesor | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    Promise.all([
      api.grupos.listar(centro),
      api.profesores.listar(centro),
      api.periodos.listar(centro),
      api.profesorAsignatura.listar(centro),
    ]).then(([grps, profs, pers, asigs]) => {
      setGrupos(grps);
      const activos = profs.filter((p) => p.activo);
      setProfesores(activos);
      setPeriodos(pers);
      setAsignaciones(asigs);
      if (grps.length > 0) setGrupoSel(grps[0]);
      if (activos.length > 0) setProfSel(activos[0]);
    });
  }, [centro]);

  const cargarSlots = useCallback(async () => {
    const filtro =
      vista === "grupo" && grupoSel
        ? { grupoId: grupoSel.id }
        : vista === "profesor" && profSel
        ? { profesorId: profSel.id }
        : undefined;
    if (!filtro) return;
    setCargando(true);
    const s = await api.horarios.listarSlots(centro, horarioId, filtro);
    setSlots(s);
    setCargando(false);
  }, [centro, horarioId, vista, grupoSel, profSel]);

  useEffect(() => { cargarSlots(); }, [cargarSlots]);

  function getSlot(periodoId: string, dia: string): Slot | undefined {
    return slots.find((s) => s.periodo_id === periodoId && s.dia_semana === dia);
  }

  const asignacionesGrupo = grupoSel
    ? asignaciones.filter((a) => a.grupo_id === grupoSel.id)
    : [];

  async function handleEliminar(slot: Slot) {
    if (!(await confirmar({ mensaje: t("confirmarQuitar") }))) return;
    await api.horarios.eliminarSlot(centro, horarioId, slot.id);
    await cargarSlots();
  }

  async function handleCrearPatio(periodo: Periodo, dia: string) {
    if (!profSel) return;
    const datos: SlotCreate = {
      profesor_id: profSel.id,
      periodo_id: periodo.id,
      dia_semana: dia,
      tipo: "RECREO",
    };
    try {
      await api.horarios.crearSlot(centro, horarioId, datos);
      await cargarSlots();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function handleCrearSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modalState || !grupoSel) return;
    setGuardando(true);
    const form = e.currentTarget;
    const asignacionId = (form.elements.namedItem("asignacion_id") as HTMLSelectElement).value;
    const asignacion = asignacionesGrupo.find((a) => a.id === asignacionId);
    if (!asignacion) { setGuardando(false); return; }

    const datos: SlotCreate = {
      profesor_id: asignacion.profesor_id,
      asignatura_id: asignacion.asignatura_id,
      grupo_id: grupoSel.id,
      periodo_id: modalState.periodo.id,
      dia_semana: modalState.dia,
      tipo: "CLASE",
    };
    try {
      await api.horarios.crearSlot(centro, horarioId, datos);
      setModalState(null);
      await cargarSlots();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  const periodosVisibles = vista === "grupo"
    ? periodos.filter((p) => p.es_lectivo || p.nombre === "Recreo")
    : periodos;

  const slotGrupo = (slot: Slot) => (
    <CeldaClase
      color={slot.asignatura_color}
      titulo={slot.asignatura_nombre ?? "—"}
      detalle={vista === "grupo" ? (slot.profesor_apellidos ?? slot.profesor_nombre ?? "") : (slot.grupo_nombre ?? "")}
      onClick={() => handleEliminar(slot)}
      etiqueta={t("quitarClase")}
    />
  );

  const BORDE = "border border-line";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-[var(--radius-control)] border border-line-strong bg-surface p-0.5 text-sm" role="group">
          {(["grupo", "profesor"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              aria-pressed={vista === v}
              className={clsx(
                "rounded-[4px] px-3 py-1.5 font-medium transition-colors",
                vista === v ? "bg-navy text-white" : "text-muted hover:text-ink",
              )}
            >
              {v === "grupo" ? t("porGrupo") : t("porProfesor")}
            </button>
          ))}
        </div>

        {vista === "grupo" ? (
          <Select
            value={grupoSel?.id ?? ""}
            onChange={(e) => setGrupoSel(grupos.find((g) => g.id === e.target.value) ?? null)}
            className="h-9 w-auto! min-w-48"
            aria-label={t("porGrupo")}
          >
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </Select>
        ) : (
          <Select
            value={profSel?.id ?? ""}
            onChange={(e) => setProfSel(profesores.find((p) => p.id === e.target.value) ?? null)}
            className="h-9 w-auto! min-w-64"
            aria-label={t("porProfesor")}
          >
            {profesores.map((p) => <option key={p.id} value={p.id}>{p.apellidos}, {p.nombre}</option>)}
          </Select>
        )}

        {cargando && <Skeleton className="h-4 w-10" />}
      </div>

      <div className={clsx("overflow-auto rounded-[var(--radius-panel)] bg-surface shadow-[var(--shadow-panel)]", BORDE)}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-canvas/70">
              <th scope="col" className={clsx(BORDE, "sticky left-0 z-10 w-28 bg-canvas px-3 py-2.5 text-left text-xs font-medium text-muted")}>
                {t("hora")}
              </th>
              {DIAS.map((d) => (
                <th scope="col" key={d.key} className={clsx(BORDE, "min-w-[130px] px-3 py-2.5 text-left text-xs font-medium text-muted")}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodosVisibles.map((periodo) => {
              const esRecreo = periodo.nombre === "Recreo";
              const esTarde = !periodo.es_lectivo && !esRecreo;
              return (
                <tr key={periodo.id} className={clsx(esRecreo && "bg-warn-soft/40", esTarde && "bg-canvas/60")}>
                  <th scope="row" className={clsx(BORDE, "sticky left-0 z-10 bg-surface px-3 py-2 text-left font-normal")}>
                    <div className="text-xs font-medium text-ink">{periodo.nombre}</div>
                    <div className="font-mono text-xs text-faint tnum">
                      {periodo.hora_inicio.slice(0, 5)}–{periodo.hora_fin.slice(0, 5)}
                    </div>
                  </th>

                  {DIAS.map((dia) => {
                    if (vista === "grupo") {
                      if (!periodo.es_lectivo) {
                        return (
                          <td key={dia.key} className={clsx(BORDE, "px-2 py-1")}>
                            <span className="text-xs font-medium text-warn">{t("recreo")}</span>
                          </td>
                        );
                      }
                      const slot = getSlot(periodo.id, dia.key);
                      return (
                        <td key={dia.key} className={clsx(BORDE, "p-1")}>
                          {slot ? slotGrupo(slot) : (
                            <button
                              onClick={() => setModalState({ periodo, dia: dia.key })}
                              className={CELDA_VACIA}
                              aria-label={`${t("anadir")} ${dia.label} ${periodo.nombre}`}
                            >
                              <Plus size={14} aria-hidden />
                            </button>
                          )}
                        </td>
                      );
                    }

                    if (!periodo.es_lectivo) {
                      return (
                        <td key={dia.key} className={clsx(BORDE, "p-1")}>
                          <CeldaEspecialProfesor
                            periodo={periodo}
                            dia={dia.key}
                            slot={getSlot(periodo.id, dia.key)}
                            onAdd={() => handleCrearPatio(periodo, dia.key)}
                            onRemove={handleEliminar}
                            t={t}
                          />
                        </td>
                      );
                    }

                    const slot = getSlot(periodo.id, dia.key);
                    return (
                      <td key={dia.key} className={clsx(BORDE, "p-1")}>
                        {slot ? slotGrupo(slot) : <div className="min-h-[52px]" />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!modalState}
        titulo={modalState && grupoSel
          ? `${grupoSel.nombre} · ${modalState.dia.charAt(0) + modalState.dia.slice(1).toLowerCase()} ${modalState.periodo.nombre}`
          : ""}
        onClose={() => setModalState(null)}
      >
        {asignacionesGrupo.length === 0 ? (
          <p className="text-sm text-muted">
            {t("sinAsignaciones", { grupo: grupoSel?.nombre ?? "" })}{" "}
            <a href={`/${centro}/asignaciones`} className="font-medium text-navy underline underline-offset-2">
              {t("irAsignaciones")}
            </a>.
          </p>
        ) : (
          <form onSubmit={handleCrearSlot} className="space-y-4">
            <div>
              <Label htmlFor="asignacion_id">{t("asignaturaProfesor")} *</Label>
              <Select id="asignacion_id" name="asignacion_id" required>
                <option value="">{t("selecciona")}</option>
                {asignacionesGrupo.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asignatura_nombre} — {a.profesor_apellidos}, {a.profesor_nombre}
                    {a.subgrupo ? ` (Subg. ${a.subgrupo})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setModalState(null)}>
                {tc("cancelar")}
              </Button>
              <Button type="submit" loading={guardando}>
                {t("anadir").replace(/^\+\s*/, "")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
