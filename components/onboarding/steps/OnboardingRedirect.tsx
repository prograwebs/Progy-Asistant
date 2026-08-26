"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingLoading from "./OnboardingLoading";

export default function OnboardingRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(to); }, [router, to]);
  return <OnboardingLoading />;
}
