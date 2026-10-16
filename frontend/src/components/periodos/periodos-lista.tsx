"use client";

import { useState, useEffect, useCallback } from "react";
import { ClockCountdown, Plus, Trash } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
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
import { api, type Periodo } from "@/lib/api";

function formatHora(h: string) {
  return h.slice(0, 5);
}

export function PeriodosLista({ centro }: { centro: string }) {
  const t = useTranslations("periodos");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirmar = useConfirm();

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      setPeriodos(await api.periodos.listar(centro));
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
      await api.periodos.eliminar(centro, id);
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
    const datos = {
      nombre: (form.elements.namedItem("nombre") as HTMLInputElement).value.trim(),
      hora_inicio: (form.elements.namedItem("hora_inicio") as HTMLInputElement).value,
      hora_fin: (form.elements.namedItem("hora_fin") as HTMLInputElement).value,
      orden: periodos.length + 1,
      es_lectivo: (form.elements.namedItem("es_lectivo") as HTMLInputElement).checked,
    };
    try {
      await api.periodos.crear(centro, datos);
      setModalAbierto(false);
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
        subtitulo={cargando ? tc("cargando") : t("nPeriodos", { n: periodos.length })}
      >
        <Button onClick={() => setModalAbierto(true)}>
          <Plus size={16} weight="bold" aria-hidden />
          {t("anadir").replace(/^\+\s*/, "")}
        </Button>
      </PageHeader>

      {error && <FieldError>{error}</FieldError>}

      {cargando && <TableSkeleton rows={6} />}

      {!cargando && periodos.length === 0 && !error && (
        <EmptyState icon={<ClockCountdown size={32} />} texto={t("sinPeriodos")}>
          <Button variant="secondary" size="sm" onClick={() => setModalAbierto(true)}>
            {t("anadir").replace(/^\+\s*/, "")}
          </Button>
        </EmptyState>
      )}

      {!cargando && periodos.length > 0 && (
        <Table>
          <THead>
            <tr>
              <TH className="w-12">#</TH>
              <TH>{tc("nombre")}</TH>
              <TH>{tc("inicio")}</TH>
              <TH>{tc("fin")}</TH>
              <TH>{tc("tipo")}</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {periodos.map((p) => (
              <TR key={p.id}>
                <TD mono className="text-faint">{p.orden}</TD>
                <TD className="font-medium">{p.nombre}</TD>
                <TD mono>{formatHora(p.hora_inicio)}</TD>
                <TD mono>{formatHora(p.hora_fin)}</TD>
                <TD>
                  <Badge tone={p.es_lectivo ? "ok" : "warn"}>
                    {p.es_lectivo ? t("lectivo") : t("noLectivo")}
                  </Badge>
                </TD>
                <TD>
                  <RowActions>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminar(p.id, p.nombre)}
                      aria-label={`${tc("eliminar")} ${p.nombre}`}
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

      <Modal open={modalAbierto} titulo={t("anadir").replace(/^\+\s*/, "")} onClose={() => setModalAbierto(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre">{tc("nombre")} *</Label>
            <Input id="nombre" name="nombre" required placeholder={t("placeholderNombre")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="hora_inicio">{tc("inicio")} *</Label>
              <Input id="hora_inicio" name="hora_inicio" type="time" required />
            </div>
            <div>
              <Label htmlFor="hora_fin">{tc("fin")} *</Label>
              <Input id="hora_fin" name="hora_fin" type="time" required />
            </div>
          </div>
          <Checkbox id="es_lectivo" name="es_lectivo" defaultChecked>{t("esLectivo")}</Checkbox>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalAbierto(false)}>{tc("cancelar")}</Button>
            <Button type="submit" loading={guardando}>{guardando ? tc("guardando") : tc("guardar")}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
