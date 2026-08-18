"use client";

import type { DemoScenario } from "./types";
import styles from "./Onboarding.module.css";

export default function ScenarioButton({ scenario, selected, onSelect }: { scenario: DemoScenario; selected: boolean; onSelect: () => void }) {
  return <button type="button" className={`${styles.scenarioButton} ${selected ? styles.scenarioButtonSelected : ""}`} aria-pressed={selected} onClick={onSelect}>{scenario.prompt}</button>;
}
