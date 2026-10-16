import { AulasLista } from "@/components/aulas/aulas-lista";

export default async function AulasPage({
  params,
}: {
  params: Promise<{ centro: string }>;
}) {
  const { centro } = await params;
  return <AulasLista centro={centro} />;
}
