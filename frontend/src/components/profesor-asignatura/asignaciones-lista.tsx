"use client";

import { useState, useEffect, useCallback } from "react";
import { Books, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Checkbox, FieldError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Table, TBody, TR, TD, RowActions } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  api,
  type ProfesorAsignatura,
  type Profesor,
  type Asignatura,
  type Grupo,
} from "@/lib/api";

export function AsignacionesLista({ centro }: { centro: string }) {
  const t = useTranslations("asignaciones");
  const tc = useTranslations("common");
  const ta = useTranslations("asignaturas");
  const toast = useToast();
  const confirmar = useConfirm();

  const [asignaciones, setAsignaciones] = useState<ProfesorAsignatura[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<ProfesorAsignatura | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarSubgrupo, setMostrarSubgrupo] = useState(false);
  const [mostrarSubgrupoEdit, setMostrarSubgrupoEdit] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const [asig, profs, asigns, grps] = await Promise.all([
        api.profesorAsignatura.listar(centro),
        api.profesores.listar(centro),
        api.asignaturas.listar(centro),
        api.grupos.listar(centro),
      ]);
      setAsignaciones(asig);
      setProfesores(profs.filter((p) => p.activo));
      setAsignaturas(asigns);
      setGrupos(grps);
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("errorGenerico"));
    } finally {
      setCargando(false);
    }
  }, [centro]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirEditar(a: ProfesorAsignatura) {
    setEditando(a);
    setMostrarSubgrupoEdit(!!a.subgrupo);
  }

  async function handleEliminar(id: string, descripcion: string) {
    if (!(await confirmar({ mensaje: t("confirmarEliminar", { nombre: descripcion }) }))) return;
    try {
      await api.profesorAsignatura.eliminar(centro, id);
      await cargar();
      toast.ok(tc("eliminado"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tc("errorEliminar"));
    }
  }

  async function handleSubmitNuevo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const form = e.currentTarget;
    const subgrupoVal = (form.elements.namedItem("subgrupo") as HTMLInputElement)?.value.trim();
    const datos = {
      profesor_id: (form.elements.namedItem("profesor_id") as HTMLSelectElement).value,
      asignatura_id: (form.elements.namedItem("asignatura_id") as HTMLSelectElement).value,
      grupo_id: (form.elements.namedItem("grupo_id") as HTMLSelectElement).value,
      horas_semana: parseInt((form.elements.namedItem("horas_semana") as HTMLInputElement).value),
      subgrupo: subgrupoVal || undefined,
    };
    try {
      await api.profesorAsignatura.crear(centro, datos);
      setModalAbierto(false);
      setMostrarSubgrupo(false);
      await cargar();
      toast.ok(tc("guardado"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tc("errorGenerico"));
    } finally {
      setGuardando(false);
    }
  }

  async function handleSubmitEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    setGuardando(true);
    const form = e.currentTarget;
    const subgrupoVal = mostrarSubgrupoEdit
      ? (form.elements.namedItem("subgrupo") as HTMLInputElement)?.value.trim() || null
      : null;
    const datos = {
      horas_semana: parseInt((form.elements.namedItem("horas_semana") as HTMLInputElement).value),
      subgrupo: subgrupoVal,
    };
    try {
      await api.profesorAsignatura.actualizar(centro, editando.id, datos);
      setEditando(null);
      await cargar();
      toast.ok(tc("guardado"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tc("errorGenerico"));
    } finally {
      setGuardando(false);
    }
  }

  // Mapa asignatura_id → troncal
  const troncalMap = Object.fromEntries(asignaturas.map((a) => [a.id, a.troncal]));

  const porGrupo = grupos.reduce<Record<string, ProfesorAsignatura[]>>((acc, g) => {
    acc[g.nombre] = asignaciones.filter((a) => a.grupo_id === g.id);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        titulo={t("titulo")}
        subtitulo={cargando ? tc("cargando") : t("nAsignaciones", { n: asignaciones.length })}
      >
        <Button onClick={() => setModalAbierto(true)}>
          <Plus size={16} weight="bold" aria-hidden />
          {t("anadir").replace(/^\+\s*/, "")}
        </Button>
      </PageHeader>

      {error && <FieldError>{error}</FieldError>}

      {cargando && <TableSkeleton rows={6} />}

      {!cargando && asignaciones.length === 0 && !error && (
        <EmptyState icon={<Books size={32} />} texto={`${t("sinAsignaciones")} ${t("sinAsignacionesHint")}`}>
          <Button variant="secondary" size="sm" onClick={() => setModalAbierto(true)}>
            {t("anadir").replace(/^\+\s*/, "")}
          </Button>
        </EmptyState>
      )}

      {!cargando && asignaciones.length > 0 && (
        <div className="space-y-4">
          {grupos
            .filter((g) => (porGrupo[g.nombre]?.length ?? 0) > 0)
            .map((grupo) => (
              <div key={grupo.id}>
                <h2 className="mb-2 text-xs font-medium text-muted">{grupo.nombre}</h2>
                <Table cols={["w-[36%]", "w-[32%]", "w-[18%]", "w-[14%]"]}>
                  <TBody>
                    {(porGrupo[grupo.nombre] ?? []).map((a) => (
                      <TR key={a.id}>
                        <TD>
                          <div className="flex items-center gap-2">
                            {a.asignatura_color && (
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: a.asignatura_color }}
                                aria-hidden
                              />
                            )}
                            <span className="font-medium">{a.asignatura_nombre}</span>
                            {troncalMap[a.asignatura_id] && (
                              <Badge tone="accent">{ta("troncal")}</Badge>
                            )}
                            {a.subgrupo && (
                              <Badge tone="neutral">
                                {t("subgrupo")} <span className="ml-1 font-mono tnum">{a.subgrupo}</span>
                              </Badge>
                            )}
                          </div>
                        </TD>
                        <TD className="text-muted">
                          {a.profesor_nombre} {a.profesor_apellidos}
                        </TD>
                        <TD mono className="text-xs text-muted">
                          {a.horas_semana}h/sem
                        </TD>
                        <TD>
                          <RowActions>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirEditar(a)}
                              aria-label={`${tc("editar")} ${a.asignatura_nombre}`}
                            >
                              <PencilSimple size={16} aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleEliminar(
                                  a.id,
                                  `${a.asignatura_nombre} → ${a.profesor_nombre}`
                                )
                              }
                              aria-label={`${tc("eliminar")} ${a.asignatura_nombre}`}
                            >
                              <Trash size={16} aria-hidden />
                            </Button>
                          </RowActions>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            ))}
        </div>
      )}

      {/* Modal editar — solo horas y subgrupo */}
      <Modal
        open={!!editando}
        titulo={tc("editar")}
        onClose={() => setEditando(null)}
      >
        {editando && (
          <form onSubmit={handleSubmitEditar} className="space-y-4">
            <div className="space-y-1 rounded-[var(--radius-control)] bg-canvas px-3 py-2.5 text-sm">
              <p className="mb-1.5 text-xs font-medium text-muted">{t("asignacion")}</p>
              <p className="font-medium text-ink">{editando.asignatura_nombre}</p>
              <p className="text-muted">{editando.profesor_nombre} {editando.profesor_apellidos}</p>
              <p className="text-xs text-faint">{editando.grupo_nombre}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="horas_semana-edit">{t("horasSemana")} *</Label>
                <Input
                  id="horas_semana-edit"
                  name="horas_semana"
                  type="number"
                  min={1}
                  max={30}
                  required
                  defaultValue={editando.horas_semana}
                  className="font-mono tnum"
                />
              </div>
              <div className="space-y-2">
                <Checkbox
                  id="subgrupo-check-edit"
                  checked={mostrarSubgrupoEdit}
                  onChange={(e) => setMostrarSubgrupoEdit(e.target.checked)}
                >
                  {t("grupoPart")}
                </Checkbox>
                {mostrarSubgrupoEdit && (
                  <Input
                    name="subgrupo"
                    maxLength={10}
                    defaultValue={editando.subgrupo ?? ""}
                    placeholder="A o B"
                    aria-label={t("subgrupo")}
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditando(null)}>{tc("cancelar")}</Button>
              <Button type="submit" loading={guardando}>{guardando ? tc("guardando") : tc("guardar")}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal añadir */}
      <Modal
        open={modalAbierto}
        titulo={t("anadir").replace(/^\+\s*/, "")}
        onClose={() => { setModalAbierto(false); setMostrarSubgrupo(false); }}
      >
        <form onSubmit={handleSubmitNuevo} className="space-y-4">
          <div>
            <Label htmlFor="profesor_id">{t("profesor")} *</Label>
            <Select id="profesor_id" name="profesor_id" required>
              <option value="">{t("seleccionaProfesor")}</option>
              {profesores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellidos}, {p.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="asignatura_id">{t("asignatura")} *</Label>
            <Select id="asignatura_id" name="asignatura_id" required>
              <option value="">{t("seleccionaAsignatura")}</option>
              {asignaturas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}{a.troncal ? " ★" : ""}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="grupo_id">{t("grupo")} *</Label>
            <Select id="grupo_id" name="grupo_id" required>
              <option value="">{t("seleccionaGrupo")}</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="horas_semana">{t("horasSemana")} *</Label>
              <Input
                id="horas_semana"
                name="horas_semana"
                type="number"
                min={1}
                max={30}
                required
                defaultValue={3}
                className="font-mono tnum"
              />
            </div>
            <div className="space-y-2">
              <Checkbox
                id="subgrupo-check"
                checked={mostrarSubgrupo}
                onChange={(e) => setMostrarSubgrupo(e.target.checked)}
              >
                {t("grupoPart")}
              </Checkbox>
              {mostrarSubgrupo && (
                <Input
                  name="subgrupo"
                  maxLength={10}
                  placeholder="A o B"
                  aria-label={t("subgrupo")}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setModalAbierto(false); setMostrarSubgrupo(false); }}
            >
              {tc("cancelar")}
            </Button>
            <Button type="submit" loading={guardando}>{guardando ? tc("guardando") : tc("guardar")}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
