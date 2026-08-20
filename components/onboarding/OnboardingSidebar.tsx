"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PanelUser } from "../dashboard/types";
import { getCategory } from "./data";
import { OnboardingIcon, ProgyMark } from "./OnboardingIcon";
import type { OnboardingDraft, OnboardingStep } from "./types";
import styles from "./Onboarding.module.css";

const steps: Array<{ id: OnboardingStep; label: string }> = [
  { id: "business", label: "Paso 1" },
  { id: "demo", label: "Paso 2" },
  { id: "connect", label: "Paso 3" },
];

const order: Record<OnboardingStep, number> = { business: 1, demo: 2, connect: 3 };

export default function OnboardingSidebar({ user, draft, currentStep }: { user: PanelUser; draft: OnboardingDraft; currentStep: OnboardingStep }) {
  const router = useRouter();
  const category = getCategory(draft.categoryCode);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/acceso?mode=login");
  }

  return (
    <aside className={styles.sidebar}>
      <Link href="/onboarding/business" className={styles.brand} aria-label="Volver al inicio del onboarding">
        <ProgyMark />
        <span>Progy</span>
      </Link>

      <div className={styles.businessCard}>
        <span className={styles.businessAvatar}><OnboardingIcon name={category.icon} size={18} /></span>
        <div className={styles.businessCopy}>
          <strong>{draft.businessName || "Tu negocio"}</strong>
          <small>{category.label}</small>
        </div>
      </div>

      <div className={styles.sidebarSectionLabel}>ONBOARDING</div>
      <nav className={styles.sidebarSteps} aria-label="Pasos del onboarding">
        {steps.map((step) => {
          const isCurrent = currentStep === step.id;
          const isAvailable = order[step.id] <= order[currentStep];
          const className = `${styles.sidebarStep} ${isCurrent ? styles.sidebarStepActive : ""} ${!isAvailable ? styles.sidebarStepPending : ""}`;
          return isAvailable ? (
            <Link href={`/onboarding/${step.id}`} className={className} aria-current={isCurrent ? "step" : undefined} key={step.id}>
              <span className={styles.sidebarStepDot}>{isCurrent ? <i /> : <span />}</span>
              <span>{step.label}</span>
            </Link>
          ) : (
            <span className={className} aria-disabled="true" key={step.id}>
              <span className={styles.sidebarStepDot}><span /></span>
              <span>{step.label}</span>
            </span>
          );
        })}
      </nav>

      <div className={styles.sidebarUser}>
        <span className={styles.userAvatar}>{user.name.slice(0, 1).toUpperCase()}</span>
        <div className={styles.businessCopy}>
          <strong>{user.name}</strong>
          <small>Admin · Propietario</small>
        </div>
        <button type="button" className={styles.sidebarLogout} onClick={() => void logout()} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={15} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
