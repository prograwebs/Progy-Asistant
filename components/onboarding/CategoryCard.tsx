"use client";

import { Check } from "lucide-react";
import { OnboardingIcon } from "./OnboardingIcon";
import type { OnboardingCategory } from "./types";
import styles from "./Onboarding.module.css";

export default function CategoryCard({ category, selected, onSelect }: { category: OnboardingCategory; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`${styles.categoryCard} ${selected ? styles.categoryCardSelected : ""}`} aria-pressed={selected} onClick={onSelect}>
      <span className={styles.categoryIcon}><OnboardingIcon name={category.icon} /></span>
      <span className={styles.categoryLabel}>{category.label}</span>
      <span className={styles.categoryDescription}>{category.description}</span>
      {selected && <span className={styles.selectedCheck}><Check size={15} strokeWidth={2.5} /></span>}
    </button>
  );
}
