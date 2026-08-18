import { redirect } from "next/navigation";
import { getSupabaseUser } from "../../lib/integrations";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSupabaseUser();
  if (!user && process.env.NODE_ENV === "production") redirect("/acceso?mode=login");

  return <OnboardingLayout user={user ?? { id: "preview-user", email: "preview@progy.local", name: "Harold Vega" }}>{children}</OnboardingLayout>;
}
