"use server";

import { cookies } from "next/headers";

export async function setLocale(locale: string) {
  (await cookies()).set("paufer_locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
