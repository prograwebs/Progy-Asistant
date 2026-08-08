import PanelClient from "./PanelClient";
import { redirect } from "next/navigation";
import { getSupabaseUser, publicIntegrationStatus } from "../../lib/integrations";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const integrations = publicIntegrationStatus();
  const user = await getSupabaseUser();
  if (!user && process.env.NODE_ENV === "production") redirect("/acceso?mode=login");
  return <PanelClient user={user ?? { id: "preview-user", email: "preview@progy.local", name: "Harold Vega" }} integrations={integrations} />;
}
