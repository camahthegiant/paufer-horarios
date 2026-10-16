"use client";

import { useState, useEffect, useCallback } from "react";
import { Door, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Table, THead, TH, TBody, TR, TD, RowActions } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { api, type Aula } from "@/lib/api";

const TIPO_TONE: Record<string, "ok" | "warn" | "danger" | "neutral" | "accent"> = {
  ORDINARIA: "neutral",
  LABORATORIO: "ok",
  INFORMATICA: "accent",
  GIMNASIO: "warn",
  MUSICA: "accent",
  BIBLIOTECA: "neutral",
  OTRO: "neutral",
};

export function AulasLista({ centro }: { centro: string }) {
  const t = useTranslations("aulas");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirmar = useConfirm();

  const TIPOS_AULA = [
    { value: "ORDINARIA",   label: t("tipos.ORDINARIA") },
    { value: "LABORATORIO", label: t("tipos.LABORATORIO") },
    { value: "INFORMATICA", label: t("tipos.INFORMATICA") },
    { value: "GIMNASIO",    label: t("tipos.GIMNASIO") },
    { value: "MUSICA",      label: t("tipos.MUSICA") },
    { value: "BIBLIOTECA",  label: t("tipos.BIBLIOTECA") },
    { value: "OTRO",        label: t("tipos.OTRO") },
  ];

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      setAulas(await api.aulas.listar(centro));
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("errorGenerico"));
    } finally {
      setCargando(false);
    }
  }, [centro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleEliminar(id: string, nombre: string) {
    if (!(await confirmar({ mensaje: t("confirmarEliminar", { nombre }) }))) return;
    try {
      await api.aulas.eliminar(centro, id);
      await cargar();
      toast.ok(tc("eliminado"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tc("errorEliminar"));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const form = e.currentTarget;
    const capacidadVal = (form.elements.namedItem("capacidad") as HTMLInputElement).value;
    const datos = {
      nombre: (form.elements.namedItem("nombre") as HTMLInputElement).value.trim(),
      codigo: (form.elements.namedItem("codigo") as HTMLInputElement).value.trim() || undefined,
      tipo: (form.elements.namedItem("tipo") as HTMLSelectElement).value,
      capacidad: capacidadVal ? parseInt(capacidadVal) : undefined,
    };
    try {
      if (aulaEditando) {
        await api.aulas.actualizar(centro, aulaEditando.id, datos);
        setAulaEditando(null);
      } else {
        await api.aulas.crear(centro, datos);
        setModalAbierto(false);
      }
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
        subtitulo={cargando ? tc("cargando") : t("nEspacios", { n: aulas.length })}
      >
        <Button onClick={() => setModalAbierto(true)}>
          <Plus size={16} weight="bold" aria-hidden />
          {t("anadir").replace(/^\+\s*/, "")}
        </Button>
      </PageHeader>

      {error && <FieldError>{error}</FieldError>}

      {cargando && <TableSkeleton rows={6} />}

      {!cargando && aulas.length === 0 && !error && (
        <EmptyState icon={<Door size={32} />} texto={t("sinAulas")}>
          <Button variant="secondary" size="sm" onClick={() => setModalAbierto(true)}>
            {t("anadir").replace(/^\+\s*/, "")}
          </Button>
        </EmptyState>
      )}

      {!cargando && aulas.length > 0 && (
        <Table>
          <THead>
            <tr>
              <TH>{tc("nombre")}</TH>
              <TH>{tc("codigo")}</TH>
              <TH>{tc("tipo")}</TH>
              <TH>{tc("capacidad")}</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {aulas.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium">{a.nombre}</TD>
                <TD mono className="text-muted">{a.codigo ?? "—"}</TD>
                <TD>
                  <Badge tone={TIPO_TONE[a.tipo] ?? "neutral"}>
                    {TIPOS_AULA.find(tp => tp.value === a.tipo)?.label ?? a.tipo}
                  </Badge>
                </TD>
                <TD mono className="text-muted">
                  {a.capacidad ? t("capacidadAlumnos", { n: a.capacidad }) : "—"}
                </TD>
                <TD>
                  <RowActions>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAulaEditando(a)}
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

      <Modal
        open={!!aulaEditando}
        titulo={tc("editar")}
        onClose={() => setAulaEditando(null)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-nombre">{tc("nombre")} *</Label>
              <Input id="edit-nombre" name="nombre" required defaultValue={aulaEditando?.nombre} />
            </div>
            <div>
              <Label htmlFor="edit-codigo">{tc("codigo")}</Label>
              <Input id="edit-codigo" name="codigo" className="font-mono" defaultValue={aulaEditando?.codigo ?? ""} />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-tipo">{tc("tipo")} *</Label>
            <Select id="edit-tipo" name="tipo" required defaultValue={aulaEditando?.tipo}>
              {TIPOS_AULA.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-capacidad">{tc("capacidad")}</Label>
            <Input id="edit-capacidad" name="capacidad" type="number" min={1} className="font-mono tnum" defaultValue={aulaEditando?.capacidad ?? ""} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAulaEditando(null)}>{tc("cancelar")}</Button>
            <Button type="submit" loading={guardando}>{guardando ? tc("guardando") : tc("guardar")}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modalAbierto}
        titulo={t("anadir").replace(/^\+\s*/, "")}
        onClose={() => setModalAbierto(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nombre">{tc("nombre")} *</Label>
              <Input id="nombre" name="nombre" required placeholder={t("placeholderNombre")} />
            </div>
            <div>
              <Label htmlFor="codigo">{tc("codigo")}</Label>
              <Input id="codigo" name="codigo" className="font-mono" placeholder={t("placeholderCodigo")} />
            </div>
          </div>
          <div>
            <Label htmlFor="tipo">{tc("tipo")} *</Label>
            <Select id="tipo" name="tipo" required>
              {TIPOS_AULA.map(tp => (
                <option key={tp.value} value={tp.value}>{tp.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="capacidad">{tc("capacidad")}</Label>
            <Input id="capacidad" name="capacidad" type="number" min={1} className="font-mono tnum" placeholder={t("placeholderCapacidad")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalAbierto(false)}>{tc("cancelar")}</Button>
            <Button type="submit" loading={guardando}>{guardando ? tc("guardando") : tc("guardar")}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
