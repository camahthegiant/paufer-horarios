"use client";

import { useState, useEffect, useCallback } from "react";
import { Books, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Checkbox, FieldError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Table, THead, TH, TBody, TR, TD, RowActions } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api, type Asignatura } from "@/lib/api";

const COLORES_PRESET = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
];

export function AsignaturasLista({ centro }: { centro: string }) {
  const t = useTranslations("asignaturas");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirmar = useConfirm();
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [asignaturaEditando, setAsignaturaEditando] = useState<Asignatura | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [colorNuevo, setColorNuevo] = useState(COLORES_PRESET[0]);
  const [colorEdit, setColorEdit] = useState(COLORES_PRESET[0]);
  const [troncalNuevo, setTroncalNuevo] = useState(false);
  const [troncalEdit, setTroncalEdit] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      setAsignaturas(await api.asignaturas.listar(centro));
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("errorGenerico"));
    } finally {
      setCargando(false);
    }
  }, [centro]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirEditar(a: Asignatura) {
    setAsignaturaEditando(a);
    setColorEdit(a.color);
    setTroncalEdit(a.troncal);
  }

  async function handleEliminar(id: string, nombre: string) {
    if (!(await confirmar({ mensaje: t("confirmarEliminar", { nombre }) }))) return;
    try {
      await api.asignaturas.eliminar(centro, id);
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
    const datos = {
      nombre: (form.elements.namedItem("nombre") as HTMLInputElement).value.trim(),
      codigo: (form.elements.namedItem("codigo") as HTMLInputElement).value.trim() || undefined,
      horas_semana: parseInt((form.elements.namedItem("horas") as HTMLInputElement).value),
      color: colorNuevo,
    };
    try {
      await api.asignaturas.crear(centro, { ...datos, troncal: troncalNuevo });
      setModalAbierto(false);
      setColorNuevo(COLORES_PRESET[0]);
      setTroncalNuevo(false);
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
    if (!asignaturaEditando) return;
    setGuardando(true);
    const form = e.currentTarget;
    const datos = {
      nombre: (form.elements.namedItem("nombre") as HTMLInputElement).value.trim(),
      codigo: (form.elements.namedItem("codigo") as HTMLInputElement).value.trim() || undefined,
      horas_semana: parseInt((form.elements.namedItem("horas") as HTMLInputElement).value),
      color: colorEdit,
    };
    try {
      await api.asignaturas.actualizar(centro, asignaturaEditando.id, { ...datos, troncal: troncalEdit });
      setAsignaturaEditando(null);
      await cargar();
      toast.ok(tc("guardado"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tc("errorGenerico"));
    } finally {
      setGuardando(false);
    }
  }

  function ColorPicker({ selected, onChange }: { selected: string; onChange: (c: string) => void }) {
    return (
      <div>
        <Label>{t("colorHorario")}</Label>
        <div className="flex flex-wrap gap-2">
          {COLORES_PRESET.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={c}
              aria-pressed={selected === c}
              className={clsx(
                "size-7 rounded-full transition-transform hover:scale-110",
                selected === c && "ring-2 ring-navy ring-offset-2 ring-offset-surface",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        titulo={t("titulo")}
        subtitulo={cargando ? tc("cargando") : t("nAsignaturas", { n: asignaturas.length })}
      >
        <Button onClick={() => setModalAbierto(true)}>
          <Plus size={16} weight="bold" aria-hidden />
          {t("anadir").replace(/^\+\s*/, "")}
        </Button>
      </PageHeader>

      {error && <FieldError>{error}</FieldError>}

      {cargando && <TableSkeleton rows={6} />}

      {!cargando && asignaturas.length === 0 && !error && (
        <EmptyState icon={<Books size={32} />} texto={t("sinAsignaturas")}>
          <Button variant="secondary" size="sm" onClick={() => setModalAbierto(true)}>
            {t("anadir").replace(/^\+\s*/, "")}
          </Button>
        </EmptyState>
      )}

      {!cargando && asignaturas.length > 0 && (
        <Table>
          <THead>
            <tr>
              <TH>{tc("nombre")}</TH>
              <TH>{tc("codigo")}</TH>
              <TH>{tc("horasSemana")}</TH>
              <TH />
              <TH />
            </tr>
          </THead>
          <TBody>
            {asignaturas.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium">
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: a.color }}
                    />
                    {a.nombre}
                  </span>
                </TD>
                <TD mono className="text-muted">{a.codigo ?? "—"}</TD>
                <TD mono className="text-muted">{a.horas_semana}h</TD>
                <TD>{a.troncal && <Badge tone="accent">{t("troncal")}</Badge>}</TD>
                <TD>
                  <RowActions>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirEditar(a)}
                      aria-label={`${tc("editar")} ${a.nombre}`}
                    >
                      <PencilSimple size={16} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminar(a.id, a.nombre)}
                      aria-label={`${tc("eliminar")} ${a.nombre}`}
                    >
                      <Trash size={16} aria-hidden />
                    </Button>
                  </RowActions>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* Modal editar */}
      <Modal
        open={!!asignaturaEditando}
        titulo={tc("editar")}
        onClose={() => setAsignaturaEditando(null)}
      >
        <form onSubmit={handleSubmitEditar} className="space-y-4">
          <div>
            <Label htmlFor="edit-nombre">{tc("nombre")} *</Label>
            <Input id="edit-nombre" name="nombre" required defaultValue={asignaturaEditando?.nombre} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-codigo">{tc("codigo")}</Label>
              <Input id="edit-codigo" name="codigo" className="font-mono" defaultValue={asignaturaEditando?.codigo ?? ""} />
            </div>
            <div>
              <Label htmlFor="edit-horas">{tc("horasSemana")} *</Label>
              <Input
                id="edit-horas"
                name="horas"
                type="number"
                min={1}
                max={30}
                required
                className="font-mono tnum"
                defaultValue={asignaturaEditando?.horas_semana}
              />
            </div>
          </div>
          <ColorPicker selected={colorEdit} onChange={setColorEdit} />
          <Checkbox
            id="edit-troncal"
            checked={troncalEdit}
            onChange={(e) => setTroncalEdit(e.target.checked)}
          >
            <span className="font-medium">{t("troncal")}</span>
            <span className="text-xs text-faint">{t("troncalHint")}</span>
          </Checkbox>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAsignaturaEditando(null)}>{tc("cancelar")}</Button>
            <Button type="submit" loading={guardando}>{guardando ? tc("guardando") : tc("guardar")}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal añadir */}
      <Modal
        open={modalAbierto}
        titulo={t("anadir").replace(/^\+\s*/, "")}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmitNuevo} className="space-y-4">
          <div>
            <Label htmlFor="nombre">{tc("nombre")} *</Label>
            <Input id="nombre" name="nombre" required placeholder={t("placeholderNombre")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="codigo">{tc("codigo")}</Label>
              <Input id="codigo" name="codigo" className="font-mono" placeholder={t("placeholderCodigo")} />
            </div>
            <div>
              <Label htmlFor="horas">{tc("horasSemana")} *</Label>
              <Input
                id="horas"
                name="horas"
                type="number"
                min={1}
                max={30}
                defaultValue={3}
                required
                className="font-mono tnum"
              />
            </div>
          </div>
          <ColorPicker selected={colorNuevo} onChange={setColorNuevo} />
          <Checkbox
            id="troncal"
            checked={troncalNuevo}
            onChange={(e) => setTroncalNuevo(e.target.checked)}
          >
            <span className="font-medium">{t("troncal")}</span>
            <span className="text-xs text-faint">{t("troncalHint")}</span>
          </Checkbox>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalAbierto(false)}>{tc("cancelar")}</Button>
            <Button type="submit" loading={guardando}>{guardando ? tc("guardando") : tc("guardar")}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
