"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDots } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { api, type Horario } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError } from "@/components/ui/field";

const ESTADO_TONO: Record<Horario["estado"], "warn" | "ok" | "neutral"> = {
  BORRADOR: "warn",
  PUBLICADO: "ok",
  ARCHIVADO: "neutral",
};

export function Dashboard({ centro }: { centro: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [counts, setCounts] = useState<Record<string, number | null>>({
    profesores: null, asignaturas: null, aulas: null, grupos: null,
  });
  const [horarios, setHorarios] = useState<Horario[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.profesores.listar(centro),
      api.asignaturas.listar(centro),
      api.aulas.listar(centro),
      api.grupos.listar(centro),
      api.horarios.listar(centro),
    ]).then(([profs, asigs, aulas, grupos, hors]) => {
      setCounts({ profesores: profs.length, asignaturas: asigs.length, aulas: aulas.length, grupos: grupos.length });
      setHorarios(hors);
    }).catch((e) => setError(e instanceof Error ? e.message : tc("errorGenerico")));
  }, [centro, tc]);

  const metricas = [
    { key: "profesores", label: t("profesores"), href: `/${centro}/profesores` },
    { key: "asignaturas", label: t("asignaturas"), href: `/${centro}/asignaturas` },
    { key: "aulas", label: t("aulas"), href: `/${centro}/aulas` },
    { key: "grupos", label: t("grupos"), href: `/${centro}/grupos` },
  ];

  const horarioActivo = horarios?.find((h) => h.estado === "PUBLICADO") ?? horarios?.[0] ?? null;

  return (
    <div>
      <PageHeader titulo={t("titulo")} subtitulo={centro} />

      {error && <div className="mb-6"><FieldError>{error}</FieldError></div>}

      {/* Métricas en una sola franja: números grandes en mono, separados por líneas */}
      <dl className="mb-12 grid grid-cols-2 border-y border-line lg:grid-cols-4">
        {metricas.map(({ key, label, href }, i) => (
          <Link
            key={key}
            href={href}
            className={`group px-1 py-6 transition-colors hover:bg-surface sm:px-6 lg:border-l lg:border-line ${i === 0 ? "lg:border-l-0 lg:pl-0" : ""} ${i % 2 === 1 ? "border-l border-line lg:border-l" : ""}`}
          >
            <dd className="font-mono text-[44px] leading-none font-medium tracking-tight text-ink tnum">
              {counts[key] === null ? <Skeleton className="h-11 w-16" /> : counts[key]}
            </dd>
            <dt className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              {label}
              <ArrowRight size={13} className="-translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
            </dt>
          </Link>
        ))}
      </dl>

      <section aria-labelledby="estado-horario">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="estado-horario" className="text-base font-semibold text-ink">{t("estadoHorario")}</h2>
          <Link href={`/${centro}/horarios`} className="flex items-center gap-1 text-[13px] font-medium text-navy hover:underline">
            {t("verTodos")} <ArrowRight size={12} aria-hidden />
          </Link>
        </div>

        {horarios === null && !error && <Skeleton className="h-16 w-full" />}

        {horarios !== null && horarios.length === 0 && (
          <p className="text-sm text-muted">
            {t("sinHorarioTexto")}{" "}
            <Link href={`/${centro}/horarios`} className="font-medium text-navy hover:underline">
              {t("sinHorarioLink")}
            </Link>
          </p>
        )}

        {horarioActivo && (
          <Link
            href={`/${centro}/horarios/${horarioActivo.id}`}
            className="group flex items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
          >
            <div className="flex items-center gap-3">
              <CalendarDots size={22} className="text-navy" aria-hidden />
              <div>
                <p className="text-sm font-medium text-ink">{horarioActivo.nombre}</p>
                <p className="text-xs text-muted tnum">
                  {t("creado")} {new Date(horarioActivo.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={ESTADO_TONO[horarioActivo.estado]}>{t(horarioActivo.estado)}</Badge>
              <ArrowRight size={14} className="text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
            </div>
          </Link>
        )}

        {horarios !== null && horarios.length > 1 && (
          <p className="mt-3 text-xs text-muted">
            {horarios.length - 1 > 1
              ? t("masHorariosPlural", { n: horarios.length - 1 })
              : t("masHorarios", { n: horarios.length - 1 })}
          </p>
        )}
      </section>
    </div>
  );
}
