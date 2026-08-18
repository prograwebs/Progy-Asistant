"use client";

import { Check, Play, Volume2 } from "lucide-react";
import type { OnboardingVoice } from "./types";
import styles from "./Onboarding.module.css";

export default function VoiceCard({ voice, selected, playing, onSelect, onListen }: { voice: OnboardingVoice; selected: boolean; playing: boolean; onSelect: () => void; onListen: () => void }) {
  return (
    <article className={`${styles.voiceCard} ${selected ? styles.voiceCardSelected : ""}`}>
      <button type="button" className={styles.voiceSelect} aria-pressed={selected} onClick={onSelect}>
        <span className={styles.voiceOrb}><Volume2 size={19} /></span>
        <span className={styles.voiceName}>{voice.name}</span>
        <span className={styles.voiceDescription}>{voice.description}</span>
        <span className={styles.voiceTone}>{voice.tone}</span>
        {selected && <span className={styles.voiceCheck}><Check size={14} /></span>}
      </button>
      <button type="button" className={styles.listenButton} onClick={onListen} aria-label={`${playing ? "Detener" : "Escuchar"} voz de ${voice.name}`}>
        <Play size={12} fill="currentColor" /> {playing ? "Reproduciendo…" : "Escuchar voz"}
      </button>
    </article>
  );
}
