import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import "./globals.css";

// `variable` crea --font-geist-sans / --font-geist-mono, que globals.css usa en @theme
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Paufer — Gestió d'horaris",
  description: "Gestió d'horaris per a centres educatius",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-control)] focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          {locale === "ca" ? "Anar al contingut" : "Saltar al contenido"}
        </a>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
