"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { PanelUser } from "@/lib/shared/types/workspace";
import PrivateSessionGuard from "../auth/PrivateSessionGuard";
import OnboardingSidebar from "./OnboardingSidebar";
import { OnboardingDraftProvider, useOnboardingDraft } from "@/hooks/onboarding/useOnboardingDraft";
import type { OnboardingDraft, OnboardingStep } from "@/lib/shared/types/onboarding";
import styles from "./Onboarding.module.css";

function currentStep(pathname: string): OnboardingStep {
  if (pathname.endsWith("/demo")) return "demo";
  if (pathname.endsWith("/connect")) return "connect";
  return "business";
}

export default function OnboardingLayout({ user, children, initialDraft }: { user: PanelUser; children: ReactNode; initialDraft?: OnboardingDraft }) {
  return <OnboardingDraftProvider initialDraft={initialDraft}><OnboardingFrame user={user}>{children}</OnboardingFrame></OnboardingDraftProvider>;
}

function OnboardingFrame({ user, children }: { user: PanelUser; children: ReactNode }) {
  const pathname = usePathname();
  const { draft } = useOnboardingDraft();
  const step = currentStep(pathname);

  return (
    <main className={styles.app}>
      <PrivateSessionGuard />
      <OnboardingSidebar user={user} draft={draft} currentStep={step} />
      <section className={styles.main}>
        <div className={styles.mobileBrand}><span><span className={styles.mobileBrandMark}><i /><i /><i /></span>Progy</span><small>Configuración inicial</small></div>
        {children}
      </section>
    </main>
  );
}
