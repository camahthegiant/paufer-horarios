import { PeriodosLista } from "@/components/periodos/periodos-lista";

export default async function PeriodosPage({
  params,
}: {
  params: Promise<{ centro: string }>;
}) {
  const { centro } = await params;
  return <PeriodosLista centro={centro} />;
}
