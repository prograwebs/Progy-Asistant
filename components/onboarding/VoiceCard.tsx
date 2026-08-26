"use client";

import { Check, Play, Volume2 } from "lucide-react";
import type { OnboardingVoice } from "./types";
import styles from "./Onboarding.module.css";

function displayVoiceName(name: string) {
  return name.trim().split(/\s+(?:-|–|—|\|)\s+/)[0]?.trim() || "Voz de Progy";
}

export default function VoiceCard({ voice, selected, playing, onSelect, onListen }: { voice: OnboardingVoice; selected: boolean; playing: boolean; onSelect: () => void; onListen: () => void }) {
  const visibleName = displayVoiceName(voice.name);

  return (
    <article className={`${styles.voiceCard} ${selected ? styles.voiceCardSelected : ""}`}>
      <button type="button" className={styles.voiceSelect} aria-pressed={selected} onClick={onSelect}>
        <span className={styles.voiceOrb}><Volume2 size={19} /></span>
        <span className={styles.voiceName}>{visibleName}</span>
        {selected && <span className={styles.voiceCheck}><Check size={14} /></span>}
      </button>
      <button type="button" className={styles.listenButton} onClick={onListen} aria-label={`${playing ? "Detener" : "Escuchar"} voz de ${visibleName}`}>
        <Play size={12} fill="currentColor" /> {playing ? "Reproduciendo…" : "Escuchar voz"}
      </button>
    </article>
  );
}
