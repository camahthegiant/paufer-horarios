"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, XCircle, ClockCountdown, Trash, UserMinus } from "@phosphor-icons/react";
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
import { api, Sustitucion, Profesor } from "@/lib/api";

type Props = { centro: string };

const hoy = () => new Date().toISOString().split("T")[0];

const ESTADO_BADGE: Record<string, { tone: "warn" | "ok" | "danger"; icon: React.ReactNode }> = {
  PENDIENTE: { tone: "warn", icon: <ClockCountdown size={12} aria-hidden className="mr-1" /> },
  CUBIERTA: { tone: "ok", icon: <CheckCircle size={12} aria-hidden className="mr-1" /> },
  SIN_CUBRIR: { tone: "danger", icon: <XCircle size={12} aria-hidden className="mr-1" /> },
};

export function SustitucionesLista({ centro }: Props) {
  const t = useTranslations("sustituciones");
  const tc = useTranslations("common");
  const toast = useToast();
  const confirmar = useConfirm();

  const [fecha, setFecha] = useState(hoy());
  const [sustituciones, setSustituciones] = useState<Sustitucion[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal ausencia
  const [showAusencia, setShowAusencia] = useState(false);
  const [ausProfesorId, setAusProfesorId] = useState("");
  const [ausMotivo, setAusMotivo] = useState("");
  const [ausLoading, setAusLoading] = useState(false);

  // Asignar sustituto por fila
  const [asignando, setAsignando] = useState<Record<string, string>>({});

  useEffect(() => {
    api.profesores.listar(centro).then(setProfesores).catch(() => {});
  }, [centro]);

  useEffect(() => {
    cargar();
  }, [fecha, centro]);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.sustituciones.listar(centro, fecha);
      setSustituciones(data.sort((a, b) => (a.periodo_orden ?? 0) - (b.periodo_orden ?? 0)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tc("errorGenerico"));
    } finally {
      setLoading(false);
    }
  }

  async function registrarAusencia() {
    if (!ausProfesorId) return;
    setAusLoading(true);
    try {
      await api.sustituciones.registrarAusencia(centro, {
        profesor_ausente_id: ausProfesorId,
        fecha,
        motivo: ausMotivo || undefined,
      });
      setShowAusencia(false);
      setAusProfesorId("");
      setAusMotivo("");
      await cargar();
      toast.ok(tc("guardado"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : tc("errorGenerico"));
    } finally {
      setAusLoading(false);
    }
  }

  async function asignarSustituto(id: string) {
    const sustitutoId = asignando[id];
    if (!sustitutoId) return;
    try {
      await api.sustituciones.asignarSustituto(centro, id, {
        profesor_sustituto_id: sustitutoId,
      });
      setAsignando((prev) => { const n = { ...prev }; delete n[id]; return n; });
      await cargar();
      toast.ok(tc("guardado"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : tc("errorGenerico"));
    }
  }

  async function marcarSinCubrir(id: string) {
    try {
      await api.sustituciones.asignarSustituto(centro, id, { estado: "SIN_CUBRIR" });
      await cargar();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : tc("errorGenerico"));
    }
  }

  async function eliminar(id: string) {
    if (!(await confirmar({ mensaje: t("confirmarEliminar") }))) return;
    try {
      await api.sustituciones.eliminar(centro, id);
      await cargar();
      toast.ok(tc("eliminado"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : tc("errorEliminar"));
    }
  }

  const ausentesHoy = [...new Set(sustituciones.map((s) => s.profesor_ausente_id))];

  return (
    <>
      <PageHeader titulo={t("titulo")} subtitulo={t("subtitulo")}>
        <Input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          aria-label={t("fecha")}
          className="tnum w-auto"
        />
        <Button onClick={() => setShowAusencia(true)}>
          <UserMinus size={16} aria-hidden />
          {t("registrarAusencia")}
        </Button>
      </PageHeader>

      {ausentesHoy.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-muted">{t("ausentes")}:</span>
          {ausentesHoy.map((id) => {
            const s = sustituciones.find((x) => x.profesor_ausente_id === id);
            return (
              <Badge key={id} tone="danger">
                {s?.profesor_ausente_nombre} {s?.profesor_ausente_apellidos}
              </Badge>
            );
          })}
        </div>
      )}

      {loading && <TableSkeleton rows={5} />}

      {!loading && error && <FieldError>{error}</FieldError>}

      {!loading && !error && sustituciones.length === 0 && (
        <EmptyState icon={<CheckCircle size={32} />} texto={t("sinAusencias")}>
          <Button variant="secondary" size="sm" onClick={() => setShowAusencia(true)}>
            {t("registrarAusencia")}
          </Button>
        </EmptyState>
      )}

      {!loading && !error && sustituciones.length > 0 && (
        <Table>
          <THead>
            <tr>
              <TH>{t("hora")}</TH>
              <TH>{t("grupo")}</TH>
              <TH>{t("asignatura")}</TH>
              <TH>{t("ausente")}</TH>
              <TH>{t("sustituto")}</TH>
              <TH>{t("estado")}</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {sustituciones.map((s) => {
              const badge = ESTADO_BADGE[s.estado];
              return (
                <TR key={s.id}>
                  <TD mono className="whitespace-nowrap font-medium">
                    {s.periodo_hora_inicio && s.periodo_hora_fin
                      ? `${s.periodo_hora_inicio}–${s.periodo_hora_fin}`
                      : s.periodo_nombre ?? "—"}
                  </TD>
                  <TD className="text-muted">{s.grupo_nombre ?? "—"}</TD>
                  <TD className="text-muted">{s.asignatura_nombre ?? "—"}</TD>
                  <TD className="font-medium">
                    {s.profesor_ausente_nombre} {s.profesor_ausente_apellidos}
                  </TD>
                  <TD>
                    {s.estado === "PENDIENTE" ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={asignando[s.id] ?? ""}
                          onChange={(e) =>
                            setAsignando((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                          aria-label={t("sustituto")}
                          className="h-8 w-auto text-[13px]"
                        >
                          <option value="">{t("seleccionar")}</option>
                          {profesores
                            .filter((p) => p.id !== s.profesor_ausente_id && p.activo)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} {p.apellidos}
                              </option>
                            ))}
                        </Select>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => asignarSustituto(s.id)}
                          disabled={!asignando[s.id]}
                        >
                          {t("asignar")}
                        </Button>
                      </div>
                    ) : s.profesor_sustituto_nombre ? (
                      <span>
                        {s.profesor_sustituto_nombre} {s.profesor_sustituto_apellidos}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={badge.tone}>
                      {badge.icon}
                      {t(`estados.${s.estado}` as Parameters<typeof t>[0])}
                    </Badge>
                  </TD>
                  <TD>
                    <RowActions>
                      {s.estado === "PENDIENTE" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => marcarSinCubrir(s.id)}
                          title={t("marcarSinCubrir")}
                          aria-label={t("marcarSinCubrir")}
                        >
                          <XCircle size={16} aria-hidden />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminar(s.id)}
                        aria-label={tc("eliminar")}
                      >
                        <Trash size={16} aria-hidden />
                      </Button>
                    </RowActions>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <Modal
        open={showAusencia}
        titulo={t("registrarAusencia")}
        onClose={() => { setShowAusencia(false); setAusProfesorId(""); setAusMotivo(""); }}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("fecha")}</Label>
            <p className="font-mono tnum text-sm text-muted">{fecha}</p>
          </div>

          <div>
            <Label htmlFor="aus_profesor">{t("profesorAusente")} *</Label>
            <Select
              id="aus_profesor"
              value={ausProfesorId}
              onChange={(e) => setAusProfesorId(e.target.value)}
            >
              <option value="">{t("seleccionarProfesor")}</option>
              {profesores
                .filter((p) => p.activo)
                .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.apellidos}, {p.nombre}
                  </option>
                ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="aus_motivo">{t("motivo")}</Label>
            <Input
              id="aus_motivo"
              type="text"
              value={ausMotivo}
              onChange={(e) => setAusMotivo(e.target.value)}
              placeholder={t("placeholderMotivo")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setShowAusencia(false); setAusProfesorId(""); setAusMotivo(""); }}
            >
              {tc("cancelar")}
            </Button>
            <Button onClick={registrarAusencia} disabled={!ausProfesorId} loading={ausLoading}>
              {ausLoading ? t("registrando") : t("registrarAusencia")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
