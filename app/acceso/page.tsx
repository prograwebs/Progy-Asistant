import { Suspense } from "react";
import AccessClient from "./AccessClient";
import { AccessMotion } from "@/components/public/AccessMotion";
import { getSupabaseUser } from "@/lib/auth/supabase";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  if (await getSupabaseUser()) redirect("/panel");
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#080a0c" }} />}>
      <AccessMotion><AccessClient /></AccessMotion>
    </Suspense>
  );
}
