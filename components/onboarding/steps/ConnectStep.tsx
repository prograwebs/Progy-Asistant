"use client";

import { ArrowLeft, ArrowRight, Bot, MessageCircle, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BenefitList, { SecureConnectionNote } from "../BenefitList";
import OnboardingComplete from "../OnboardingComplete";
import { OnboardingProgress } from "../OnboardingProgress";
import { useOnboardingDraft } from "../useOnboardingDraft";
import OnboardingLoading from "./OnboardingLoading";
import OnboardingRedirect from "./OnboardingRedirect";
import styles from "../Onboarding.module.css";

export default function ConnectStep() {
  const router = useRouter();
  const { draft, ready, updateDraft, resetDraft } = useOnboardingDraft();
  const [completed, setCompleted] = useState(false);

  if (!ready) return <OnboardingLoading />;
  if (!draft.businessName.trim()) return <OnboardingRedirect to="/onboarding/business" />;

  if (completed || draft.connectionChoice) {
    return <div className={styles.content}><OnboardingComplete draft={draft} choice={draft.connectionChoice ?? "skipped"} onRestart={() => { resetDraft(); setCompleted(false); router.push("/onboarding/business"); }} /></div>;
  }

  function finish(choice: "connected" | "skipped") {
    updateDraft({ connectionChoice: choice });
    setCompleted(true);
  }

  return <div className={styles.content}>
    <OnboardingProgress currentStep="connect" />
    <div className={styles.connectLayout}>
      <section className={styles.connectCard}>
        <div className={styles.eyebrow}>PASO FINAL</div>
        <h1>Pon a Progy donde ya están tus clientes ✨</h1>
        <p>Conecta el WhatsApp Business de tu negocio para que Progy pueda atender las conversaciones desde el mismo canal que ya utilizas.</p>
        <div className={styles.channelDiagram} aria-label="Tus clientes se comunican con Progy a través de WhatsApp">
          <div className={styles.channelNode}><span className={styles.channelNodeIcon}><UsersRound size={25} /></span><strong>Tus clientes</strong><small>Te escriben como siempre</small></div>
          <div className={styles.channelConnectors}><span>↔</span></div>
          <div className={`${styles.channelNode} ${styles.channelNodeCenter}`}><span className={styles.channelNodeIcon}><Bot size={29} /></span><strong>Progy</strong><small>Responde y califica</small></div>
          <div className={styles.channelConnectors}><span>↔</span></div>
          <div className={styles.channelNode}><span className={styles.channelNodeIcon}><MessageCircle size={25} /></span><strong>WhatsApp Business</strong><small>Tu número actual</small></div>
        </div>
        <div className={styles.connectActions}><button type="button" className={styles.primaryButton} onClick={() => finish("connected")}><MessageCircle size={16} /> Conectar WhatsApp <ArrowRight size={16} /></button><button type="button" className={styles.secondaryButton} onClick={() => finish("skipped")}>Lo haré después</button></div>
        <SecureConnectionNote />
      </section>
      <aside className={styles.benefitsCard}><h2>Todo listo para atender mejor</h2><BenefitList /><div className={styles.helper}>La información mostrada durante este recorrido es de ejemplo.</div></aside>
    </div>
    <button type="button" className={styles.textButton} onClick={() => router.push("/onboarding/demo")}><ArrowLeft size={15} /> Volver</button>
  </div>;
}
