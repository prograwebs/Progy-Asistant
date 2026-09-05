"use client";

import type { SelectedWorkspace, WorkspaceAction } from "@/shared/types/workspace";
import AgentSection from "./AgentSection";
import VoiceSection from "./VoiceSection";
import styles from "../ProgyDashboard.module.css";

export type ProgyTab = "personalidad" | "voz";

export default function ProgySection({ workspace, action, tab, onTabChange }: {
  workspace: SelectedWorkspace;
  action: WorkspaceAction;
  tab: ProgyTab;
  onTabChange: (tab: ProgyTab) => void;
}) {
  return <>
    <div className={styles.sectionTabs} role="tablist" aria-label="Configuración de Progy">
      <button type="button" role="tab" aria-selected={tab === "personalidad"} aria-controls="progy-personalidad-panel" className={tab === "personalidad" ? styles.active : ""} onClick={() => onTabChange("personalidad")}>Personalidad</button>
      <button type="button" role="tab" aria-selected={tab === "voz"} aria-controls="progy-voz-panel" className={tab === "voz" ? styles.active : ""} onClick={() => onTabChange("voz")}>Voz</button>
    </div>
    {tab === "personalidad" ? <div id="progy-personalidad-panel" role="tabpanel" aria-label="Personalidad de Progy"><AgentSection key={`agent-${workspace.business.id}`} workspace={workspace} action={action} /></div> : <div id="progy-voz-panel" role="tabpanel" aria-label="Voz de Progy"><VoiceSection key={`voice-${workspace.business.id}`} workspace={workspace} action={action} /></div>}
  </>;
}
