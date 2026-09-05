import { redirect } from "next/navigation";

import { getSupabaseUser } from "@/lib/server/auth/supabase";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSupabaseUser();
  if (!user) redirect("/acceso?mode=login");

  return children;
}
