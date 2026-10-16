import { getLocale } from "next-intl/server";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ centro: string }>;
}) {
  const { centro: centroSlug } = await params;
  const locale = await getLocale();

  return (
    <div className="flex min-h-[100dvh] bg-canvas">
      <Sidebar centro={centroSlug} locale={locale} />
      <main id="main" className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1200px] px-10 pt-10 pb-16">{children}</div>
      </main>
    </div>
  );
}
