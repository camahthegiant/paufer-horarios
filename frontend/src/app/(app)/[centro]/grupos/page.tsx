import { GruposLista } from "@/components/grupos/grupos-lista";

export default async function GruposPage({
  params,
}: {
  params: Promise<{ centro: string }>;
}) {
  const { centro } = await params;
  return <GruposLista centro={centro} />;
}
