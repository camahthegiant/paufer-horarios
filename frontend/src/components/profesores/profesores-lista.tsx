"use client";

import { useState, useEffect, useCallback } from "react";
import { ChalkboardTeacher, CalendarDots, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Table, THead, TH, TBody, TR, TD, RowActions } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DisponibilidadGrid } from "./disponibilidad-grid";
import { api, type Profesor } from "@/lib/api";

const IDIOMAS = ["CASTELLANO", "VALENCIANO", "INGLES"] as const;
type Idioma = typeof IDIOMAS[number];

const IDIOMA_TONE: Record<Idioma, "ok" | "warn" | "danger" | "neutral" | "accent"> = {
  CASTELLANO: "warn",
  VALENCIANO: "ok",
  INGLES:     "accent",
};

function IdiomasChips({
  selected,
  onChange,
  t,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  function toggle(idioma: Idioma) {
    onChange(
      selected.includes(idioma)
        ? selected.filter((i) => i !== idioma)
        : [...selected, idioma]
    );
  }

  return (
    <div>
      <Label>{t("idiomas")}</Label>
      <div className="flex gap-2">
        {IDIOMAS.map((idioma) => {
          const active = selected.includes(idioma);
          return (
            <button
              key={idioma}
              type="button"
              onClick={() => toggle(idioma)}
              aria-pressed={active}
              className={`h-8 rounded-[var(--radius-control)] border px-3 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-navy text-white border-navy"
                  : "bg-surface text-muted border-line-strong hover:border-faint hover:text-ink"
              }`}
            >
              {t(`idiomasOpciones.${idioma}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProfesoresLista({ centro }: { centro: string }) {
  const t = useTranslations("profesores");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirmar = useConfirm();
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [profesorEditando, setProfesorEditando] = useState<Profesor | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [disponibilidadProfesor, setDisponibilidadProfesor] = useState<Profesor | null>(null);

  const [idiomasNuevo, setIdiomasNuevo] = useState<string[]>([]);
  const [idiomasEdit, setIdiomasEdit] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const datos = await api.profesores.listar(centro);
      setProfesores(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar profesores");
    } finally {
      setCargando(false);
    }
  }, [centro]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirEditar(p: Profesor) {
    setProfesorEditando(p);
    setIdiomasEdit(p.idiomas ?? []);
  }

  function abrirNuevo() {
    setIdiomasNuevo([]);
    setModalAbierto(true);
  }

  async function handleEliminar(id: string, nombre: string) {
    if (!(await confirmar({ mensaje: t("confirmarEliminar", { nombre }) }))) return;
    try {
      await api.profesores.eliminar(centro, id);
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
      apellidos: (form.elements.namedItem("apellidos") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      horas_lectivas_semana: parseInt(
        (form.elements.namedItem("horas") as HTMLInputElement).value
      ),
      idiomas: idiomasNuevo,
    };
    try {
      await api.profesores.crear(centro, datos);
      setModalAbierto(false);
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
    if (!profesorEditando) return;
    setGuardando(true);
    const form = e.currentTarget;
    const datos = {
      nombre: (form.elements.namedItem("nombre") as HTMLInputElement).value.trim(),
      apellidos: (form.elements.namedItem("apellidos") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      horas_lectivas_semana: parseInt(
        (form.elements.namedItem("horas") as HTMLInputElement).value
      ),
      idiomas: idiomasEdit,
    };
    try {
      await api.profesores.actualizar(centro, profesorEditando.id, datos);
      setProfesorEditando(null);
      await cargar();
      toast.ok(tc("guardado"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tc("errorGenerico"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <PageHeader
        titulo={t("titulo")}
        subtitulo={cargando ? tc("cargando") : t("nDocentes", { n: profesores.length })}
      >
        <Button onClick={abrirNuevo}>
          <Plus size={16} weight="bold" aria-hidden />
          {t("anadir").replace(/^\+\s*/, "")}
        </Button>
      </PageHeader>

      {error && <FieldError>{error}</FieldError>}

      {cargando && <TableSkeleton rows={6} />}

      {!cargando && profesores.length === 0 && !error && (
        <EmptyState icon={<ChalkboardTeacher size={32} />} texto={`${t("sinProfesores")} ${t("sinProfesoresHint")}`}>
          <Button variant="secondary" size="sm" onClick={abrirNuevo}>
            {t("anadir").replace(/^\+\s*/, "")}
          </Button>
        </EmptyState>
      )}

      {!cargando && profesores.length > 0 && (
        <Table>
          <THead>
            <tr>
              <TH>{t("apellidosNombre")}</TH>
              <TH>{t("email")}</TH>
              <TH>{t("horasSemana")}</TH>
              <TH>{t("idiomas")}</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {profesores.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">
                  {p.apellidos}, {p.nombre}
                </TD>
                <TD className="text-muted">{p.email}</TD>
                <TD mono className="text-muted">{p.horas_lectivas_semana}h</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {(p.idiomas ?? []).map((idioma) => (
                      <Badge key={idioma} tone={IDIOMA_TONE[idioma as Idioma] ?? "neutral"}>
                        {t(`idiomasOpciones.${idioma}`)}
                      </Badge>
                    ))}
                  </div>
                </TD>
                <TD>
                  <RowActions>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDisponibilidadProfesor(p)}
                      aria-label={`${t("disponibilidad")} ${p.nombre} ${p.apellidos}`}
                      title={t("disponibilidad")}
                    >
                      <CalendarDots size={16} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirEditar(p)}
                      aria-label={`${tc("editar")} ${p.nombre} ${p.apellidos}`}
                    >
                      <PencilSimple size={16} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminar(p.id, `${p.nombre} ${p.apellidos}`)}
                      aria-label={`${tc("eliminar")} ${p.nombre} ${p.apellidos}`}
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

      {/* Modal disponibilidad */}
      <Modal
        open={!!disponibilidadProfesor}
        titulo={`Disponibilidad — ${disponibilidadProfesor ? `${disponibilidadProfesor.apellidos}, ${disponibilidadProfesor.nombre}` : ""}`}
        onClose={() => setDisponibilidadProfesor(null)}
        className="max-w-2xl"
      >
        {disponibilidadProfesor && (
          <DisponibilidadGrid
            centro={centro}
            profesorId={disponibilidadProfesor.id}
            profesorNombre={`${disponibilidadProfesor.nombre} ${disponibilidadProfesor.apellidos}`}
          />
        )}
      </Modal>

      {/* Modal editar */}
      <Modal
        open={!!profesorEditando}
        titulo={tc("editar")}
        onClose={() => setProfesorEditando(null)}
      >
        <form onSubmit={handleSubmitEditar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nombre-edit">{tc("nombre")} *</Label>
              <Input id="nombre-edit" name="nombre" required defaultValue={profesorEditando?.nombre} />
            </div>
            <div>
              <Label htmlFor="apellidos-edit">{t("apellidos")} *</Label>
              <Input id="apellidos-edit" name="apellidos" required defaultValue={profesorEditando?.apellidos} />
            </div>
          </div>
          <div>
            <Label htmlFor="email-edit">{t("email")} *</Label>
            <Input id="email-edit" name="email" type="email" required defaultValue={profesorEditando?.email} />
          </div>
          <div>
            <Label htmlFor="horas-edit">{t("horas")} *</Label>
            <Input
              id="horas-edit"
              name="horas"
              type="number"
              min={1}
              max={40}
              required
              defaultValue={profesorEditando?.horas_lectivas_semana}
              className="font-mono tnum"
            />
          </div>
          <IdiomasChips selected={idiomasEdit} onChange={setIdiomasEdit} t={t} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setProfesorEditando(null)}>{tc("cancelar")}</Button>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nombre">{tc("nombre")} *</Label>
              <Input id="nombre" name="nombre" required placeholder={t("placeholderNombre")} />
            </div>
            <div>
              <Label htmlFor="apellidos">{t("apellidos")} *</Label>
              <Input id="apellidos" name="apellidos" required placeholder={t("placeholderApellidos")} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">{t("email")} *</Label>
            <Input id="email" name="email" type="email" required placeholder={t("placeholderEmail")} />
          </div>
          <div>
            <Label htmlFor="horas">{t("horas")} *</Label>
            <Input
              id="horas"
              name="horas"
              type="number"
              min={1}
              max={40}
              defaultValue={18}
              required
              className="font-mono tnum"
            />
          </div>
          <IdiomasChips selected={idiomasNuevo} onChange={setIdiomasNuevo} t={t} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalAbierto(false)}>{tc("cancelar")}</Button>
            <Button type="submit" loading={guardando}>{guardando ? tc("guardando") : tc("guardar")}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
