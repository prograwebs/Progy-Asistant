"use client";

import { ArrowLeft, ArrowRight, MessageCircle, UsersRound } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { launchWhatsAppSignup } from "../../dashboard/metaSignup";
import BenefitList, { SecureConnectionNote } from "../BenefitList";
import OnboardingComplete from "../OnboardingComplete";
import { OnboardingProgress } from "../OnboardingProgress";
import { useOnboardingDraft } from "../useOnboardingDraft";
import OnboardingLoading from "./OnboardingLoading";
import OnboardingRedirect from "./OnboardingRedirect";
import styles from "../Onboarding.module.css";

gsap.registerPlugin(useGSAP);

export default function ConnectStep() {
  const router = useRouter();
  const animationRoot = useRef<HTMLDivElement>(null);
  const { draft, ready, updateDraft, resetDraft } = useOnboardingDraft();
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const appId = process.env.NEXT_PUBLIC_META_APP_ID || "";
  const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID || "";
  const available = process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true" && Boolean(appId && configId);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
    entrance
      .from(`.${styles.connectIntro} h1`, { y: 16, opacity: 0, duration: 0.45 })
      .from(`.${styles.connectIntro} p`, { y: 10, opacity: 0, duration: 0.3 }, "-=0.25")
      .from(`.${styles.connectCard}`, { y: 18, opacity: 0, duration: 0.45 }, "-=0.08")
      .from(`.${styles.benefitsCard}`, { y: 18, opacity: 0, duration: 0.4 }, "-=0.3")
      .from(`.${styles.channelNode}`, { y: 12, scale: 0.9, opacity: 0, duration: 0.38, stagger: 0.1 }, "-=0.15")
      .from(`.${styles.channelConnectors}`, { scaleX: 0, opacity: 0, transformOrigin: "center center", duration: 0.28, stagger: 0.08 }, "-=0.3")
      .from(`.${styles.connectActions}`, { y: 8, opacity: 0, duration: 0.28 }, "-=0.1")
      .from(`.${styles.secureNote}`, { y: 8, opacity: 0, duration: 0.25 }, "-=0.12")
      .from(`.${styles.benefit}`, { x: 10, opacity: 0, duration: 0.25, stagger: 0.06 }, "-=0.35");

    gsap.to(`.${styles.progyIconMark} i`, {
      scaleY: 0.52,
      duration: 0.36,
      ease: "sine.inOut",
      transformOrigin: "center center",
      stagger: { each: 0.1, from: "center", repeat: -1, yoyo: true },
    });
    gsap.to(`.${styles.channelNodeCenter} .${styles.channelNodeIcon}`, {
      scale: 1.035,
      duration: 1.2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
    gsap.to(`.${styles.whatsappNodeIcon}`, {
      scale: 1.045,
      duration: 1.5,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }, { scope: animationRoot, dependencies: [ready, completed, draft.businessId, draft.connectionChoice], revertOnUpdate: true });

  if (!ready) return <OnboardingLoading />;
  if (!draft.businessName.trim() || !draft.businessId) return <OnboardingRedirect to="/onboarding/business" />;

  if (completed || draft.connectionChoice) {
    return <div className={styles.content}><OnboardingComplete draft={draft} choice={draft.connectionChoice ?? "skipped"} onContinue={() => router.push("/panel")} onRestart={() => { resetDraft(); setCompleted(false); router.push("/onboarding/business"); }} /></div>;
  }

  async function finish(choice: "connected" | "skipped") {
    setBusy(true);
    setError("");
    try {
      if (choice === "skipped") {
        const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "channelSkipped", businessId: draft.businessId }) });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || "No pudimos guardar este paso.");
      } else {
        if (!available) {
          setError("WhatsApp todavía no está disponible en este entorno. Puedes continuar y conectarlo después.");
          return;
        }
        const signup = await launchWhatsAppSignup(appId, configId);
        const response = await fetch("/api/whatsapp/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: signup.code, wabaId: signup.wabaId, phoneNumberId: signup.phoneNumberId, businessId: signup.businessId, progyBusinessId: draft.businessId }) });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || "No pudimos terminar la conexión de WhatsApp.");
        const onboardingResponse = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "channelConnected", businessId: draft.businessId }) });
        const onboardingResult = await onboardingResponse.json().catch(() => ({})) as { error?: string };
        if (!onboardingResponse.ok) throw new Error(onboardingResult.error || "No pudimos guardar el estado de conexión.");
      }
      updateDraft({ connectionChoice: choice });
      setCompleted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos completar este paso.");
    } finally {
      setBusy(false);
    }
  }

  return <div ref={animationRoot} className={styles.content}>
    <OnboardingProgress currentStep="connect" />
    <header className={styles.connectIntro}>
      <h1>Pon a Progy donde ya están tus clientes ✨</h1>
      <p>Conecta el WhatsApp Business de tu negocio para que Progy pueda atender las conversaciones desde el mismo canal que ya utilizas.</p>
    </header>
    <div className={styles.connectLayout}>
      <section className={styles.connectColumn}>
        <div className={styles.connectCard}>
          <div className={styles.connectCardHeading}>
            <h2>Conecta tu WhatsApp Business</h2>
            <p>En pocos pasos y sin complicaciones.</p>
          </div>
        <div className={styles.channelDiagram} aria-label="Tus clientes se comunican con Progy a través de WhatsApp">
          <div className={styles.channelNode}><span className={styles.channelNodeIcon}><UsersRound size={24} /></span><strong>Tus clientes</strong><small>Te escriben como<br />siempre lo hacen</small></div>
          <div className={styles.channelConnectors}><span>↔</span></div>
          <div className={`${styles.channelNode} ${styles.channelNodeCenter}`}><span className={styles.channelNodeIcon}><span className={styles.progyIconMark} aria-hidden="true"><i /><i /><i /></span></span><strong>Progy</strong><small>Responde, califica<br />y hace seguimiento</small></div>
          <div className={styles.channelConnectors}><span>↔</span></div>
          <div className={styles.channelNode}><span className={`${styles.channelNodeIcon} ${styles.whatsappNodeIcon}`}><MessageCircle size={25} /></span><strong>WhatsApp Business</strong><small>Tu número y conversaciones<br />siempre sincronizados</small></div>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.connectActions}><button type="button" className={styles.primaryButton} disabled={busy || !available} onClick={() => void finish("connected")}><MessageCircle size={16} /> {busy ? "Abriendo WhatsApp…" : available ? "Conectar WhatsApp" : "WhatsApp no disponible"} {available && !busy && <ArrowRight size={16} />}</button><button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void finish("skipped")}>Lo haré después</button></div>
        </div>
        <SecureConnectionNote />
      </section>
      <aside className={styles.benefitsCard}><h2>Todo listo para atender mejor</h2><BenefitList /><div className={styles.helper}>La información mostrada durante este recorrido es de ejemplo.</div></aside>
    </div>
    <button type="button" className={styles.textButton} onClick={() => router.push("/onboarding/demo")}><ArrowLeft size={15} /> Volver</button>
  </div>;
}
