import { AsignacionesLista } from "@/components/profesor-asignatura/asignaciones-lista";

export default async function AsignacionesPage({
  params,
}: {
  params: Promise<{ centro: string }>;
}) {
  const { centro } = await params;
  return <AsignacionesLista centro={centro} />;
}
