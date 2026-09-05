"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { VoiceOption } from "@/lib/shared/types/workspace";
import ConversationPreview from "../ConversationPreview";
import { getScenario, getScenarios } from "../data";
import { OnboardingProgress } from "../OnboardingProgress";
import VoiceCard from "../VoiceCard";
import { useOnboardingDraft } from "../useOnboardingDraft";
import OnboardingLoading from "./OnboardingLoading";
import OnboardingRedirect from "./OnboardingRedirect";
import styles from "../Onboarding.module.css";

export default function DemoStep() {
  const router = useRouter();
  const { draft, ready, updateDraft } = useOnboardingDraft();
  const [playingVoice, setPlayingVoice] = useState("");
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(true);
  const [voiceError, setVoiceError] = useState("");
  const [voiceNotice, setVoiceNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scenarios = getScenarios(draft.categoryCode);
  const scenario = getScenario(draft.categoryCode, draft.scenarioId);

  useEffect(() => {
    if (!ready || !draft.businessName.trim()) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        setVoiceLoading(true);
        setVoiceError("");
        setVoiceNotice("");
        try {
          const response = await fetch("/api/elevenlabs/voices?onboarding=1", { cache: "no-store" });
          const result = await response.json().catch(() => ({})) as { voices?: VoiceOption[]; error?: string };
          if (!response.ok) throw new Error(result.error || "No pudimos cargar las voces disponibles.");
          const availableVoices = result.voices || [];
          const recommendedVoices = availableVoices.filter((voice) => voice.recommended);
          const visibleVoices = (recommendedVoices.length >= 2 ? recommendedVoices : availableVoices).slice(0, 2);
          setVoices(visibleVoices);
        } catch (cause) {
          setVoiceError(cause instanceof Error ? cause.message : "No pudimos cargar las voces disponibles.");
        } finally {
          setVoiceLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draft.businessName, ready]);

  useEffect(() => {
    if (!draft.voiceId && voices[0]) updateDraft({ voiceId: voices[0].id });
  }, [draft.voiceId, updateDraft, voices]);

  useEffect(() => {
    if (!playingVoice) return;
    const timer = window.setTimeout(() => setPlayingVoice(""), 1500);
    return () => window.clearTimeout(timer);
  }, [playingVoice]);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  if (!ready) return <OnboardingLoading />;
  if (!draft.businessName.trim() || !draft.businessId) return <OnboardingRedirect to="/onboarding/business" />;

  async function previewVoice(voice: VoiceOption) {
    setPlayingVoice(voice.id);
    setVoiceError("");
    setVoiceNotice("");
    audioRef.current?.pause();
    try {
      const response = await fetch("/api/elevenlabs/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: voice.id, mode: "greeting", text: `Hola, gracias por comunicarte con ${draft.businessName}. Soy Progy, ¿en qué puedo ayudarte?` }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (response.status === 503 && voice.previewUrl) {
          const audio = new Audio(voice.previewUrl);
          audioRef.current = audio;
          audio.onended = () => setPlayingVoice("");
          audio.onerror = () => setPlayingVoice("");
          await audio.play();
          setVoiceNotice("ElevenLabs no permite generar una muestra nueva con el plan actual. Reprodujimos la muestra disponible de esta voz.");
          return;
        }
        throw new Error(result.error || "No pudimos reproducir esta voz.");
      }
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setPlayingVoice(""); };
      audio.onerror = () => { URL.revokeObjectURL(url); setPlayingVoice(""); };
      await audio.play();
      setVoiceNotice("");
    } catch (cause) {
      setPlayingVoice("");
      setVoiceError(cause instanceof Error ? cause.message : "No pudimos reproducir esta voz.");
    }
  }

  async function continueToConnect() {
    if (!draft.businessId) {
      router.push("/onboarding/business");
      return;
    }
    if (!draft.voiceId) {
      setVoiceError("Elige una voz disponible para continuar.");
      return;
    }
    setBusy(true);
    setVoiceError("");
    try {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveDemo", businessId: draft.businessId, voiceId: draft.voiceId, scenarioId: scenario.id }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos guardar la prueba.");
      router.push("/onboarding/connect");
    } catch (cause) {
      setVoiceError(cause instanceof Error ? cause.message : "No pudimos guardar la prueba.");
    } finally {
      setBusy(false);
    }
  }

  const displayedVoices = voices.length ? voices : [];

  function selectScenario(id: string) {
    updateDraft({ scenarioId: id });
  }

  return <div className={styles.content}>
    <OnboardingProgress currentStep="demo" />
    <header className={styles.demoHeader}><div><div className={styles.eyebrow}>CONOCE A PROGY</div><h1>Así podría atender Progy en {draft.businessName}</h1><p>Elige una voz, escribe o habla con Progy y descubre cómo atendería a tus clientes.</p></div></header>
    <div className={styles.demoGrid}>
      <div className={styles.demoPanel}>
        <div className={styles.demoPanelTitle}>1. Elige la voz de Progy<small>Selecciona el tono con el que hablará con tus clientes.</small></div>
        {voiceLoading ? <div className={styles.voiceStatus}>Cargando voces disponibles…</div> : displayedVoices.length ? <div className={styles.voiceList}>{displayedVoices.map((voice) => <VoiceCard key={voice.id} voice={voice} selected={draft.voiceId === voice.id} playing={playingVoice === voice.id} onSelect={() => updateDraft({ voiceId: voice.id })} onListen={() => { updateDraft({ voiceId: voice.id }); void previewVoice(voice); }} />)}</div> : <div className={styles.voiceStatus} role="alert">{voiceError || "No hay voces disponibles en este momento."}</div>}
        <div id="onboarding-demo-suggestions" className={styles.leftSuggestionArea} />
      </div>
      <div className={`${styles.demoPanel} ${styles.demoConversationPanel}`}><div className={styles.demoPanelTitle}>2. Prueba la demo<small>Elige una pregunta, escribe o pulsa el micrófono. Usa información de ejemplo.</small></div><ConversationPreview key={draft.businessId} businessId={draft.businessId} businessName={draft.businessName} voiceId={draft.voiceId} scenario={scenario} suggestions={scenarios.map((item) => ({ id: item.id, text: item.prompt }))} suggestionsTargetId="onboarding-demo-suggestions" onScenarioSelect={selectScenario} /></div>
    </div>
    {voiceNotice && <p className={styles.voiceNotice} role="status">{voiceNotice}</p>}
    {voiceError && displayedVoices.length > 0 && <p className={styles.error} role="alert">{voiceError}</p>}
    <div className={styles.demoActions}><button type="button" className={styles.textButton} onClick={() => router.push("/onboarding/business")}><ArrowLeft size={15} /> Volver</button><button type="button" className={styles.primaryButton} disabled={busy || voiceLoading || !draft.voiceId} onClick={() => void continueToConnect()}>{busy ? "Guardando…" : "Continuar"} {!busy && <ArrowRight size={16} />}</button></div>
    <p className={styles.helper}><span className={styles.infoIcon}><span>i</span></span> Estás probando Progy con información de ejemplo.</p>
  </div>;
}
