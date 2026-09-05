import { redirect } from "next/navigation";
import { getSupabaseUser } from "@/lib/server/auth/supabase";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";
import { getOnboardingResume } from "@/lib/server/onboarding/routing";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSupabaseUser();
  if (!user) redirect("/acceso?mode=login");
  const resume = await getOnboardingResume(user.id);

  return <OnboardingLayout user={user} initialDraft={resume?.draft}>{children}</OnboardingLayout>;
}
