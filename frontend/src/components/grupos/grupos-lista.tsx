"use client";

import { useState, useEffect, useCallback } from "react";
import { UsersThree, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
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
import { api, type Grupo } from "@/lib/api";

const ETAPA_TONE: Record<string, "ok" | "warn" | "danger" | "neutral" | "accent"> = {
  INFANTIL: "warn",
  PRIMARIA: "accent",
  ESO: "ok",
  BACHILLERATO: "accent",
  FP: "warn",
  OTRO: "neutral",
};

export function GruposLista({ centro }: { centro: string }) {
  const t = useTranslations("grupos");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirmar = useConfirm();

  const ETAPAS = [
    { value: "INFANTIL",     label: t("etapas.INFANTIL") },
    { value: "PRIMARIA",     label: t("etapas.PRIMARIA") },
    { value: "ESO",          label: t("etapas.ESO") },
    { value: "BACHILLERATO", label: t("etapas.BACHILLERATO") },
    { value: "FP",           label: t("etapas.FP") },
    { value: "OTRO",         label: t("etapas.OTRO") },
  ];

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [grupoEditando, setGrupoEditando] = useState<Grupo | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      setGrupos(await api.grupos.listar(centro));
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
      await api.grupos.eliminar(centro, id);
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
    const nivelVal = (form.elements.namedItem("nivel") as HTMLInputElement).value;
    const datos = {
      nombre: (form.elements.namedItem("nombre") as HTMLInputElement).value.trim(),
      etapa: (form.elements.namedItem("etapa") as HTMLSelectElement).value,
      nivel: nivelVal ? parseInt(nivelVal) : undefined,
    };
    try {
      if (grupoEditando) {
        await api.grupos.actualizar(centro, grupoEditando.id, datos);
        setGrupoEditando(null);
      } else {
        await api.grupos.crear(centro, datos);
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
        subtitulo={cargando ? tc("cargando") : t("nGrupos", { n: grupos.length })}
      >
        <Button onClick={() => setModalAbierto(true)}>
          <Plus size={16} weight="bold" aria-hidden />
          {t("anadir").replace(/^\+\s*/, "")}
        </Button>
      </PageHeader>

      {error && <FieldError>{error}</FieldError>}

      {cargando && <TableSkeleton rows={6} />}

      {!cargando && grupos.length === 0 && !error && (
        <EmptyState icon={<UsersThree size={32} />} texto={t("sinGrupos")}>
          <Button variant="secondary" size="sm" onClick={() => setModalAbierto(true)}>
            {t("anadir").replace(/^\+\s*/, "")}
          </Button>
        </EmptyState>
      )}

      {!cargando && grupos.length > 0 && (
        <Table>
          <THead>
            <tr>
              <TH>{tc("nombre")}</TH>
              <TH>{t("etapa")}</TH>
              <TH>{t("nivel")}</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {grupos.map((g) => (
              <TR key={g.id}>
                <TD mono className="font-medium">{g.nombre}</TD>
                <TD>
                  <Badge tone={ETAPA_TONE[g.etapa] ?? "neutral"}>
                    {ETAPAS.find(et => et.value === g.etapa)?.label ?? g.etapa}
                  </Badge>
                </TD>
                <TD mono className="text-muted">{g.nivel ? `${g.nivel}º` : "—"}</TD>
                <TD>
                  <RowActions>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGrupoEditando(g)}
                      aria-label={`${tc("editar")} ${g.nombre}`}
                    >
                      <PencilSimple size={16} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminar(g.id, g.nombre)}
                      aria-label={`${tc("eliminar")} ${g.nombre}`}
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
        open={!!grupoEditando}
        titulo={tc("editar")}
        onClose={() => setGrupoEditando(null)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-nombre">{tc("nombre")} *</Label>
            <Input id="edit-nombre" name="nombre" required defaultValue={grupoEditando?.nombre} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-etapa">{t("etapa")} *</Label>
              <Select id="edit-etapa" name="etapa" required defaultValue={grupoEditando?.etapa}>
                {ETAPAS.map(et => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-nivel">{t("nivel")}</Label>
              <Input id="edit-nivel" name="nivel" type="number" min={1} max={6} className="font-mono tnum" defaultValue={grupoEditando?.nivel ?? ""} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setGrupoEditando(null)}>{tc("cancelar")}</Button>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre">{tc("nombre")} *</Label>
            <Input id="nombre" name="nombre" required placeholder="1ºA" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="etapa">{t("etapa")} *</Label>
              <Select id="etapa" name="etapa" required>
                {ETAPAS.map(et => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="nivel">{t("nivel")}</Label>
              <Input id="nivel" name="nivel" type="number" min={1} max={6} className="font-mono tnum" placeholder="1" />
            </div>
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
