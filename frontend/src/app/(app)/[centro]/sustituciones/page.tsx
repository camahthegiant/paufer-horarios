import { SustitucionesLista } from "@/components/sustituciones/sustituciones-lista";

export default async function SustitucionesPage({
  params,
}: {
  params: Promise<{ centro: string }>;
}) {
  const { centro } = await params;
  return <SustitucionesLista centro={centro} />;
}
