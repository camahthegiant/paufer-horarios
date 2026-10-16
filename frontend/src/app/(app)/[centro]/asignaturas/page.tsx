import { AsignaturasLista } from "@/components/asignaturas/asignaturas-lista";

export default async function AsignaturasPage({
  params,
}: {
  params: Promise<{ centro: string }>;
}) {
  const { centro } = await params;
  return <AsignaturasLista centro={centro} />;
}
