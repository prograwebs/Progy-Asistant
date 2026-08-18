"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getCategory } from "./data";
import type { ConnectionChoice, OnboardingDraft } from "./types";
import styles from "./Onboarding.module.css";

export default function OnboardingComplete({ draft, choice, onRestart }: { draft: OnboardingDraft; choice: ConnectionChoice; onRestart: () => void }) {
  const category = getCategory(draft.categoryCode);
  const connected = choice === "connected";

  return (
    <section className={styles.completeCard}>
      <span className={styles.completeIcon}><CheckCircle2 size={34} /></span>
      <div className={styles.eyebrow}>RECORRIDO COMPLETADO</div>
      <h1>Tu Progy está listo para el siguiente paso</h1>
      <p>{connected ? `Ya conociste cómo podría atender ${draft.businessName || "tu negocio"} con información de ejemplo.` : `Ya conociste cómo podría atender ${draft.businessName || "tu negocio"}. Puedes conectar WhatsApp cuando estés listo.`}</p>
      <div className={styles.completeSummary}><span>{category.label}</span><span>·</span><span>{draft.voiceId === "mateo" ? "Mateo" : "Valentina"}</span><span>·</span><span>{connected ? "Canal preparado" : "Canal pendiente"}</span></div>
      <button type="button" className={styles.primaryButton} onClick={onRestart}>Volver a comenzar <ArrowRight size={17} /></button>
    </section>
  );
}
