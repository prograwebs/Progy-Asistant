"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { PanelUser } from "../dashboard/types";
import OnboardingSidebar from "./OnboardingSidebar";
import { useOnboardingDraft } from "./useOnboardingDraft";
import type { OnboardingStep } from "./types";
import styles from "./Onboarding.module.css";

function currentStep(pathname: string): OnboardingStep {
  if (pathname.endsWith("/demo")) return "demo";
  if (pathname.endsWith("/connect")) return "connect";
  return "business";
}

export default function OnboardingLayout({ user, children }: { user: PanelUser; children: ReactNode }) {
  const pathname = usePathname();
  const { draft } = useOnboardingDraft();
  const step = currentStep(pathname);

  return (
    <main className={styles.app}>
      <OnboardingSidebar user={user} draft={draft} currentStep={step} />
      <section className={styles.main}>
        <div className={styles.mobileBrand}><span><span className={styles.mobileBrandMark}><i /><i /><i /></span>Progy</span><small>Configuración inicial</small></div>
        {children}
      </section>
    </main>
  );
}
