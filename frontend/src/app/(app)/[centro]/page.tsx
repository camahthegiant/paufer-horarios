import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ centro: string }>;
}) {
  const { centro } = await params;
  return <Dashboard centro={centro} />;
}
