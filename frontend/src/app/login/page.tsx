"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("login");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const { access_token } = await api.auth.login(email, password);
      localStorage.setItem("paufer_token", access_token);

      const user = await api.auth.me();
      if (user.rol === "SUPERADMIN") {
        router.push("/admin/centros");
        return;
      }
      if (!user.centro_slug) {
        setError(t("sinCentro"));
        return;
      }

      router.push(`/${user.centro_slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sinCentro"));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      {/* Panel de marca: rejilla de horario difuminada como textura */}
      <aside className="relative hidden overflow-hidden bg-navy-900 p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:96px_64px] [mask-image:linear-gradient(135deg,transparent_10%,#000_80%)]"
        />
        <div className="relative flex items-center gap-3">
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-[var(--radius-control)]" />
          <span className="text-lg font-semibold tracking-tight">Paufer</span>
        </div>
        <div className="relative max-w-[26ch]">
          <p className="text-[40px] leading-[1.1] font-semibold tracking-tight">{t("lema")}</p>
          <p className="mt-5 max-w-[44ch] text-[15px] text-white/60">{t("detalle")}</p>
        </div>
      </aside>

      <main id="main" className="flex items-center bg-canvas px-6 py-12 sm:px-14">
        <div className="mx-auto w-full max-w-sm lg:mx-0">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-[var(--radius-control)]" />
            <span className="text-lg font-semibold tracking-tight text-ink">Paufer</span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">{t("subtitulo")}</h1>
          <p className="mt-1 mb-8 text-sm text-muted">{t("titulo")}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder={t("placeholder_email")} />
            </div>
            <div>
              <Label htmlFor="password">{t("contrasena")}</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>

            {error && <FieldError>{error}</FieldError>}

            <Button type="submit" loading={cargando} className="w-full">
              {cargando ? t("entrando") : t("entrar")}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
