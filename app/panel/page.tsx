import { redirect } from "next/navigation";
import ProgyDashboard from "../../components/dashboard/ProgyDashboard";
import { getSupabaseUser } from "@/lib/server/auth/supabase";
import { publicIntegrationStatus } from "@/lib/server/config/env";
import { resolveUserRoute } from "@/lib/server/onboarding/routing";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const integrations = publicIntegrationStatus();
  const user = await getSupabaseUser();
  if (!user) redirect("/acceso?mode=login");
  const destination = await resolveUserRoute(user.id);
  if (destination.path !== "/panel") redirect(destination.path);

  return (
    <ProgyDashboard
      user={user}
      integrations={integrations}
    />
  );
}
