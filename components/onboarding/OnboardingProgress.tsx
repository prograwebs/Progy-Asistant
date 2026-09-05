import { Check, Circle } from "lucide-react";
import type { OnboardingStep } from "@/lib/shared/types/onboarding";
import styles from "./Onboarding.module.css";

const steps: Array<{ id: OnboardingStep; label: string }> = [
  { id: "business", label: "Crea tu Progy" },
  { id: "demo", label: "Conoce a Progy" },
  { id: "connect", label: "Conecta WhatsApp" },
];

const order: Record<OnboardingStep, number> = { business: 1, demo: 2, connect: 3 };

export function OnboardingProgress({ currentStep }: { currentStep: OnboardingStep }) {
  return (
    <div className={styles.progress} aria-label={`Paso ${order[currentStep]} de 3`}>
      <span className={styles.progressLabel}>Paso {order[currentStep]} de 3</span>
      <ol className={styles.progressTrack}>
        {steps.map((step) => {
          const state = order[step.id] < order[currentStep] ? "complete" : step.id === currentStep ? "active" : "pending";
          return (
            <li className={`${styles.progressItem} ${styles[state]}`} key={step.id}>
              <span className={styles.progressCircle}>{state === "complete" ? <Check size={14} /> : state === "active" ? order[step.id] : <Circle size={14} />}</span>
              <span className={styles.progressItemLabel}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
