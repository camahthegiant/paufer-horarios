"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import {
  SquaresFour,
  ChalkboardTeacher,
  Books,
  Door,
  UsersThree,
  ClockCountdown,
  LinkSimple,
  CalendarDots,
  ArrowsClockwise,
  SignOut,
} from "@phosphor-icons/react";
import { setLocale } from "@/actions/locale";

export function Sidebar({ centro, locale }: { centro: string; locale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const tc = useTranslations("common");

  const navItems = [
    { href: "", label: t("dashboard"), icon: SquaresFour },
    { href: "profesores", label: t("profesores"), icon: ChalkboardTeacher },
    { href: "asignaturas", label: t("asignaturas"), icon: Books },
    { href: "aulas", label: t("aulas"), icon: Door },
    { href: "grupos", label: t("grupos"), icon: UsersThree },
    { href: "periodos", label: t("periodos"), icon: ClockCountdown },
    { href: "asignaciones", label: t("asignaciones"), icon: LinkSimple },
    { href: "horarios", label: t("horarios"), icon: CalendarDots },
    { href: "sustituciones", label: t("sustituciones"), icon: ArrowsClockwise },
  ];

  async function handleLocale(newLocale: string) {
    await setLocale(newLocale);
    router.refresh();
  }

  function handleLogout() {
    localStorage.removeItem("paufer_token");
    router.push("/login");
  }

  return (
    <aside className="sticky top-0 flex h-[100dvh] w-60 shrink-0 flex-col self-start overflow-y-auto bg-navy-900 text-white/70">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <Image src="/logo.png" alt="" width={32} height={32} className="rounded-[var(--radius-control)]" />
        <div className="min-w-0">
          <p className="text-[15px] leading-tight font-semibold tracking-tight text-white">Paufer</p>
          <p className="truncate text-xs leading-tight text-white/50">{centro}</p>
        </div>
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-px px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const fullHref = href ? `/${centro}/${href}` : `/${centro}`;
          const active = href
            ? pathname === fullHref || pathname.startsWith(`${fullHref}/`)
            : pathname === `/${centro}` || pathname === `/${centro}/`;
          return (
            <Link
              key={label}
              href={fullHref}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-white/8 text-white" : "hover:bg-white/5 hover:text-white",
              )}
            >
              {active && <span className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-r bg-teal" />}
              <Icon size={18} weight={active ? "fill" : "regular"} className={active ? "text-teal" : "text-white/45"} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/8 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-white/30">v0.1.0</span>
          <div className="flex rounded-[var(--radius-control)] bg-white/6 p-0.5" role="group" aria-label="Idioma">
            {["es", "ca"].map((loc) => (
              <button
                key={loc}
                onClick={() => handleLocale(loc)}
                aria-pressed={locale === loc}
                className={clsx(
                  "rounded-[4px] px-2 py-1 text-xs font-medium uppercase transition-colors",
                  locale === loc ? "bg-teal text-navy-900" : "text-white/50 hover:text-white",
                )}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-white"
        >
          <SignOut size={18} aria-hidden />
          {tc("cerrarSesion")}
        </button>
      </div>
    </aside>
  );
}
