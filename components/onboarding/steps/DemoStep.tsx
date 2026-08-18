"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConversationPreview from "../ConversationPreview";
import { getScenario, getScenarios, onboardingVoices } from "../data";
import { OnboardingProgress } from "../OnboardingProgress";
import ScenarioButton from "../ScenarioButton";
import VoiceCard from "../VoiceCard";
import { useOnboardingDraft } from "../useOnboardingDraft";
import OnboardingLoading from "./OnboardingLoading";
import OnboardingRedirect from "./OnboardingRedirect";
import styles from "../Onboarding.module.css";

export default function DemoStep() {
  const router = useRouter();
  const { draft, ready, updateDraft } = useOnboardingDraft();
  const [playingVoice, setPlayingVoice] = useState("");
  const scenarios = getScenarios(draft.categoryCode);
  const scenario = getScenario(draft.categoryCode, draft.scenarioId);

  useEffect(() => {
    if (!playingVoice) return;
    const timer = window.setTimeout(() => setPlayingVoice(""), 1500);
    return () => window.clearTimeout(timer);
  }, [playingVoice]);

  if (!ready) return <OnboardingLoading />;
  if (!draft.businessName.trim()) return <OnboardingRedirect to="/onboarding/business" />;

  function selectScenario(id: string) {
    updateDraft({ scenarioId: id });
  }

  return <div className={styles.content}>
    <OnboardingProgress currentStep="demo" />
    <header className={styles.demoHeader}><div><div className={styles.eyebrow}>CONOCE A PROGY</div><h1>Así podría atender Progy en {draft.businessName}</h1><p>Escoge una voz y escucha cómo respondería a uno de tus clientes.</p></div></header>
    <div className={styles.demoGrid}>
      <div className={styles.demoPanel}>
        <div className={styles.demoPanelTitle}>1. Elige la voz de Progy<small>Selecciona el tono con el que hablará con tus clientes.</small></div>
        <div className={styles.voiceList}>{onboardingVoices.map((voice) => <VoiceCard key={voice.id} voice={voice} selected={draft.voiceId === voice.id} playing={playingVoice === voice.id} onSelect={() => updateDraft({ voiceId: voice.id })} onListen={() => { updateDraft({ voiceId: voice.id }); setPlayingVoice(voice.id); }} />)}</div>
        <div className={`${styles.demoPanelTitle} ${styles.scenarioTitle}`}>2. Prueba una situación<small>Elige una pregunta de ejemplo para ver cómo respondería.</small></div>
        <div className={styles.scenarioList}>{scenarios.map((item) => <ScenarioButton key={item.id} scenario={item} selected={item.id === scenario.id} onSelect={() => selectScenario(item.id)} />)}</div>
      </div>
      <div className={styles.demoPanel}><div className={styles.demoPanelTitle}>3. Vista previa de una conversación<small>Así es como Progy podría atender a tus clientes.</small></div><ConversationPreview businessName={draft.businessName} scenario={scenario} /></div>
    </div>
    <div className={styles.demoActions}><button type="button" className={styles.textButton} onClick={() => router.push("/onboarding/business")}><ArrowLeft size={15} /> Volver</button><button type="button" className={styles.primaryButton} onClick={() => router.push("/onboarding/connect")}>Continuar <ArrowRight size={16} /></button></div>
    <p className={styles.helper}><span className={styles.infoIcon}><span>i</span></span> Estás probando Progy con información de ejemplo.</p>
  </div>;
}
