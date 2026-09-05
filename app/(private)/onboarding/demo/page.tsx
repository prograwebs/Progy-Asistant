import DemoStep from "@/components/onboarding/steps/DemoStep";
import { getSupabaseUser } from "@/lib/server/auth/supabase";
import { resolveUserRoute } from "@/lib/server/onboarding/routing";
import { redirect } from "next/navigation";

export default async function DemoOnboardingPage() {
  const user = await getSupabaseUser();
  if (user) {
    const destination = await resolveUserRoute(user.id);
    if (destination.path !== "/onboarding/demo") redirect(destination.path);
  }
  return <DemoStep />;
}
