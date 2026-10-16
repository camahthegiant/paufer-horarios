import { HorarioPageClient } from "@/components/horario/horario-page-client";

export default async function HorarioPage({
  params,
}: {
  params: Promise<{ centro: string; horarioId: string }>;
}) {
  const { centro, horarioId } = await params;
  return <HorarioPageClient centro={centro} horarioId={horarioId} />;
}
