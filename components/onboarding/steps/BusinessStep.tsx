"use client";

import { Info, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CategoryCard from "../CategoryCard";
import { getCategory, onboardingCategories } from "../data";
import OnboardingLoading from "./OnboardingLoading";
import { OnboardingProgress } from "../OnboardingProgress";
import { useOnboardingDraft } from "../useOnboardingDraft";
import styles from "../Onboarding.module.css";

export default function BusinessStep() {
  const router = useRouter();
  const { draft, ready, updateDraft } = useOnboardingDraft();
  const [error, setError] = useState("");
  const category = getCategory(draft.categoryCode);

  if (!ready) return <OnboardingLoading />;

  function selectCategory(code: string) {
    const nextCategory = getCategory(code);
    updateDraft({ categoryCode: code, scenarioId: nextCategory.code === "clinic" ? "clinic-availability" : "" });
    setError("");
  }

  function continueToDemo() {
    const name = draft.businessName.trim();
    if (!name) {
      setError("Escribe el nombre de tu negocio para continuar.");
      return;
    }
    updateDraft({ businessName: name });
    router.push("/onboarding/demo");
  }

  return <div className={styles.content}>
    <OnboardingProgress currentStep="business" />
    <section className={styles.panel}>
      <header className={styles.intro}>
        <div className={styles.eyebrow}>PRIMERA CONFIGURACIÓN</div>
        <h1>Vamos a crear tu Progy</h1>
        <p>Cuéntanos qué negocio tienes y prepararemos una primera versión para que puedas probarla.</p>
      </header>

      <label className={styles.field}>Nombre de tu negocio
        <input className={styles.input} value={draft.businessName} onChange={(event) => updateDraft({ businessName: event.target.value })} placeholder="Ej. Clínica San Gabriel" autoComplete="organization" />
      </label>

      <span className={styles.sectionLabel}>¿Qué tipo de negocio tienes?</span>
      <div className={styles.categoryGrid} role="group" aria-label="Tipo de negocio">
        {onboardingCategories.map((item) => <CategoryCard key={item.code} category={item} selected={item.code === draft.categoryCode} onSelect={() => selectCategory(item.code)} />)}
      </div>

      <div className={styles.infoBanner}><span className={styles.infoIcon}><Info size={17} /></span><span><strong>Progy podrá:</strong> {category.capabilities.join(" · ")}</span></div>
      <p className={styles.helper}><Info size={14} /> Podrás cambiar esta plantilla después. Por ahora usaremos información de ejemplo.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.formActions}><button type="button" className={styles.primaryButton} onClick={continueToDemo}>Crear mi Progy <ArrowRight size={17} /></button><button type="button" className={styles.textButton} onClick={() => router.push("/panel")}>Salir</button></div>
    </section>
  </div>;
}
