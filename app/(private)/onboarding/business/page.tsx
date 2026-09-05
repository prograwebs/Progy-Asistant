import BusinessStep from "@/components/onboarding/steps/BusinessStep";
import { getSupabaseUser } from "@/lib/server/auth/supabase";
import { resolveUserRoute } from "@/lib/server/onboarding/routing";
import { redirect } from "next/navigation";

export default async function BusinessOnboardingPage() {
  const user = await getSupabaseUser();
  if (user) {
    const destination = await resolveUserRoute(user.id);
    if (destination.path !== "/onboarding/business") redirect(destination.path);
  }
  return <BusinessStep />;
}
