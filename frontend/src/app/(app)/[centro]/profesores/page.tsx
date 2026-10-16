import { ProfesoresLista } from "@/components/profesores/profesores-lista";

export default async function ProfesoresPage({
  params,
}: {
  params: Promise<{ centro: string }>;
}) {
  const { centro } = await params;
  return <ProfesoresLista centro={centro} />;
}
