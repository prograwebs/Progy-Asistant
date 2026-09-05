import { Suspense } from "react";
import AccessClient from "@/components/auth/AccessClient";
import { AccessMotion } from "@/components/auth/AccessMotion";
import { getSupabaseUser } from "@/lib/server/auth/supabase";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccessPage() {

  if (await getSupabaseUser()) redirect("/panel");

  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#080a0c" }} />}>
      <AccessMotion><AccessClient /></AccessMotion>
    </Suspense>
  );
}
