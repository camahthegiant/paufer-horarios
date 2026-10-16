"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDots, Trash, GlobeHemisphereWest, ArrowCounterClockwise, MagicWand, Plus, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api, type Horario, type CursoEscolar } from "@/lib/api";

const ESTADO_TONE: Record<string, "warn" | "ok" | "neutral"> = {
  BORRADOR: "warn",
  PUBLICADO: "ok",
  ARCHIVADO: "neutral",
};

export default function HorariosPage() {
  const t = useTranslations("horarios");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirmar = useConfirm();
  const params = useParams<{ centro: string }>();
  const centro = params.centro;
  const router = useRouter();

  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cursos, setCursos] = useState<CursoEscolar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null);
  const [generando, setGenerando] = useState<string | null>(null);
  const [resultadoGeneracion, setResultadoGeneracion] = useState<{ id: string; slots: number } | null>(null);

  function fechaRelativa(iso: string): string {
    const d = new Date(iso);
    const ahora = new Date();
    const diff = ahora.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("modificadoAhora");
    if (mins < 60) return t("modificadoMins", { n: mins });
    const horas = Math.floor(mins / 60);
    if (horas < 24) return t("modificadoHoras", { n: horas });
    return t("modificadoDia", { fecha: d.toLocaleDateString() });
  }

  function cargar() {
    Promise.all([api.horarios.listar(centro), api.cursos.listar(centro)]).then(
      ([h, c]) => { setHorarios(h); setCursos(c); setCargando(false); }
    );
  }

  useEffect(() => { cargar(); }, [centro]);

  async function handleCrear() {
    if (cursos.length === 0) {
      toast.error(t("primeroCurso"));
      return;
    }
    setCreando(true);
    try {
      const h = await api.horarios.crear(centro, {
        nombre: t("nombreNuevo", { curso: cursos[0].nombre }),
        curso_escolar_id: cursos[0].id,
      });
      router.push(`/${centro}/horarios/${h.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("errorGenerico"));
      setCreando(false);
    }
  }

  async function handleCambiarEstado(e: React.MouseEvent, h: Horario, estado: "BORRADOR" | "PUBLICADO" | "ARCHIVADO") {
    e.stopPropagation();
    setCambiandoEstado(h.id);
    try {
      await api.horarios.cambiarEstado(centro, h.id, estado);
      cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("errorGenerico"));
    } finally {
      setCambiandoEstado(null);
    }
  }

  async function handleGenerar(e: React.MouseEvent, h: Horario) {
    e.stopPropagation();
    if (!(await confirmar({ mensaje: t("confirmarGenerar", { nombre: h.nombre }) }))) return;
    setGenerando(h.id);
    setResultadoGeneracion(null);
    try {
      const res = await api.horarios.generar(centro, h.id);
      setResultadoGeneracion({ id: h.id, slots: res.slots_creados });
      cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorGenerar"));
    } finally {
      setGenerando(null);
    }
  }

  async function handleEliminar(e: React.MouseEvent, h: Horario) {
    e.stopPropagation();
    if (!(await confirmar({ mensaje: t("confirmarEliminar", { nombre: h.nombre }) }))) return;
    setEliminando(h.id);
    try {
      await api.horarios.eliminar(centro, h.id);
      cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("errorEliminar"));
    } finally {
      setEliminando(null);
    }
  }

  return (
    <>
      <PageHeader
        titulo={t("titulo")}
        subtitulo={cargando ? tc("cargando") : t("nHorarios", { n: horarios.length })}
      >
        <Button onClick={handleCrear} loading={creando}>
          <Plus size={16} weight="bold" aria-hidden />
          {t("nuevo").replace(/^\+\s*/, "")}
        </Button>
      </PageHeader>

      {resultadoGeneracion && (
        <div className="mb-4 flex items-center justify-between rounded-[var(--radius-control)] bg-ok-soft px-3 py-2.5 text-sm text-ok">
          <span>{t("generadoOk", { n: resultadoGeneracion.slots })}</span>
          <button
            onClick={() => setResultadoGeneracion(null)}
            className="ml-4 text-ok hover:opacity-70"
            aria-label={tc("cerrar")}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      )}

      {cargando && <TableSkeleton rows={4} />}

      {!cargando && horarios.length === 0 && (
        <EmptyState icon={<CalendarDots size={32} />} texto={`${t("sinHorarios")}. ${t("sinHorariosHint")}`}>
          <Button variant="secondary" size="sm" onClick={handleCrear} loading={creando}>
            {t("nuevo").replace(/^\+\s*/, "")}
          </Button>
        </EmptyState>
      )}

      {horarios.length > 0 && (
        <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface shadow-[var(--shadow-panel)]">
          {horarios.map((h) => (
            <li
              key={h.id}
              onClick={() => router.push(`/${centro}/horarios/${h.id}`)}
              className="group flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-canvas/70"
            >
              <div className="min-w-0">
                <Link
                  href={`/${centro}/horarios/${h.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block truncate font-medium text-ink hover:underline"
                >
                  {h.nombre}
                </Link>
                <p className="mt-0.5 text-xs text-faint tnum">
                  {t("creado")} {new Date(h.created_at).toLocaleDateString()}
                  {" · "}
                  {t("modificado")} {fechaRelativa(h.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={ESTADO_TONE[h.estado]}>
                  {t(`estados.${h.estado}` as Parameters<typeof t>[0])}
                </Badge>
                {h.estado === "BORRADOR" && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => handleGenerar(e, h)}
                      loading={generando === h.id}
                      title={t("generarTitulo")}
                    >
                      {generando !== h.id && <MagicWand size={14} aria-hidden />}
                      {generando === h.id ? t("generando") : t("generar")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => handleCambiarEstado(e, h, "PUBLICADO")}
                      disabled={cambiandoEstado === h.id}
                      title={t("publicarTitulo")}
                    >
                      <GlobeHemisphereWest size={14} aria-hidden />
                      {t("publicar")}
                    </Button>
                  </>
                )}
                {h.estado === "PUBLICADO" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => handleCambiarEstado(e, h, "BORRADOR")}
                    disabled={cambiandoEstado === h.id}
                    title={t("borradorTitulo")}
                  >
                    <ArrowCounterClockwise size={14} aria-hidden />
                    {t("estados.BORRADOR")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleEliminar(e, h)}
                  disabled={eliminando === h.id}
                  aria-label={`${tc("eliminar")} ${h.nombre}`}
                >
                  <Trash size={16} aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
