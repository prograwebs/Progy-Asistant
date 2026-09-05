import ConnectStep from "@/components/onboarding/steps/ConnectStep";
import { getSupabaseUser } from "@/lib/server/auth/supabase";
import { resolveUserRoute } from "@/lib/server/onboarding/routing";
import { redirect } from "next/navigation";

export default async function ConnectOnboardingPage() {
  const user = await getSupabaseUser();
  if (user) {
    const destination = await resolveUserRoute(user.id);
    if (destination.path !== "/onboarding/connect") redirect(destination.path);
  }
  return <ConnectStep />;
}
