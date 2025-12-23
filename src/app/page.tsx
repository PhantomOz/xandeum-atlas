import { AppShell } from "@/components/layout/AppShell";
import { PNodeDashboard } from "@/components/dashboard/PNodeDashboard";
import { getPnodeSnapshot } from "@/lib/pnodes";

export default async function Home() {
  const snapshot = await getPnodeSnapshot().catch((error) => {
    console.error("Failed to bootstrap pNodes", error);
    return null;
  });

  return (
    <AppShell>
      <PNodeDashboard initialSnapshot={snapshot} />
    </AppShell>
  );
}
