"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getCategory } from "./data";
import type { ConnectionChoice, OnboardingDraft } from "@shared/types/onboarding";
import styles from "./Onboarding.module.css";

export default function OnboardingComplete({ draft, choice, onRestart, onContinue }: { draft: OnboardingDraft; choice: ConnectionChoice; onRestart: () => void; onContinue: () => void }) {
  const category = getCategory(draft.categoryCode);
  const connected = choice === "connected";

  return (
    <section className={styles.completeCard}>
      <span className={styles.completeIcon}><CheckCircle2 size={34} /></span>
      <div className={styles.eyebrow}>RECORRIDO COMPLETADO</div>
      <h1>Tu Progy está listo para el siguiente paso</h1>
      <p>{connected ? `Meta devolvió la autorización inicial para ${draft.businessName || "tu negocio"}. El canal quedará activo cuando termine la validación server-side.` : `Ya conociste cómo podría atender ${draft.businessName || "tu negocio"}. Puedes conectar WhatsApp cuando estés listo.`}</p>
      <div className={styles.completeSummary}><span>{category.label}</span><span>·</span><span>{draft.voiceId ? "Voz guardada" : "Voz pendiente"}</span><span>·</span><span>{connected ? "Canal en validación" : "Canal pendiente"}</span></div>
      <button type="button" className={styles.primaryButton} onClick={onContinue}>Ir a preparación <ArrowRight size={17} /></button>
      <button type="button" className={styles.textButton} onClick={onRestart}>Volver a comenzar</button>
    </section>
  );
}
