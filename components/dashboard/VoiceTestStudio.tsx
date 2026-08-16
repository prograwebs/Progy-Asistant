"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { exceedsPayloadLimit, MAX_PAYLOAD_MB } from "../../lib/config/limits";
import type { SelectedWorkspace } from "./types";
import { DashboardIcon } from "./LineIcon";
import styles from "./VoiceTestStudio.module.css";

type Turn = { role: "user" | "assistant"; text: string };
type AssistantTurnResponse = {
  userText?: string;
  reply?: string;
  error?: string;
  code?: string;
  upgradeRequired?: boolean;
  action?: { type?: "none" | "order" | "booking"; executed?: boolean; id?: string; total?: number; message?: string };
  audio?: { base64?: string; contentType?: string; voiceId?: string } | null;
  audioWarning?: { code?: string; message?: string } | null;
  limits?: { maxSessionSeconds?: number; sessionsRemaining?: number; testingMode?: boolean };
};

type SessionResponse = {
  conversation?: { id?: string };
  error?: string;
  code?: string;
  limits?: { maxSessionSeconds?: number; sessionsRemaining?: number; testingMode?: boolean };
};

function preferredMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function base64AudioUrl(base64: string, contentType = "audio/mpeg") {
  return `data:${contentType};base64,${base64}`;
}

function appendTranscript(current: Turn[], userText: string, reply: string): Turn[] {
  const next: Turn[] = [
    ...current,
    { role: "user", text: userText },
    { role: "assistant", text: reply },
  ];
  return next.slice(-20);
}

export default function VoiceTestStudio({ workspace, onRefresh }: { workspace: SelectedWorkspace; onRefresh: () => Promise<void> | void }) {
  const [status, setStatus] = useState<"idle" | "recording" | "thinking" | "speaking">("idle");
  const [sessionActive, setSessionActive] = useState(false);
  const [testingMode, setTestingMode] = useState(process.env.NODE_ENV !== "production");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [maxSeconds, setMaxSeconds] = useState(workspace.plan?.plan_code === "trial" ? 120 : 300);
  const [lastAction, setLastAction] = useState<AssistantTurnResponse["action"] | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const conversationRef = useRef<{ id: string; startedAt: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const finishSession = useCallback(async (resultStatus: "completed" | "failed" = "completed") => {
    stopTimer();
    audioRef.current?.pause();
    audioRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseMicrophone();

    const current = conversationRef.current;
    conversationRef.current = null;
    setSessionActive(false);
    setStatus("idle");

    if (current) {
      try {
        await fetch("/api/assistant/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "end",
            businessId: workspace.business.id,
            conversationId: current.id,
            durationSeconds: Math.max(1, Math.round((Date.now() - current.startedAt) / 1000)),
            status: resultStatus,
          }),
        });
        await onRefresh();
      } catch (cause) {
        console.error("Progy voice session close failed", cause);
      }
    }
  }, [onRefresh, releaseMicrophone, stopTimer, workspace.business.id]);

  useEffect(() => () => {
    stopTimer();
    audioRef.current?.pause();
    releaseMicrophone();
  }, [releaseMicrophone, stopTimer]);

  useEffect(() => {
    if (!sessionActive || status === "idle") {
      stopTimer();
      return;
    }
    if (timerRef.current !== null) return;
    timerRef.current = window.setInterval(() => {
      const current = conversationRef.current;
      if (!current) return;
      const next = Math.max(0, Math.round((Date.now() - current.startedAt) / 1000));
      setElapsed(next);
      if (next >= maxSeconds) {
        setInfo("La prueba llegó a su límite de duración. Guardamos la conversación para que puedas revisar el consumo.");
        void finishSession("completed");
      }
    }, 1000);
    return stopTimer;
  }, [finishSession, maxSeconds, sessionActive, status, stopTimer]);

  async function ensureSession() {
    if (conversationRef.current) return conversationRef.current;
    const response = await fetch("/api/assistant/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", businessId: workspace.business.id, scenario: "Prueba guiada de voz" }),
    });
    const result = await response.json().catch(() => ({})) as SessionResponse;
    if (!response.ok) {
      if (result.code === "voice_trial_limit_reached") setInfo(result.error || "La prueba incluida ya fue utilizada.");
      throw new Error(result.error || "No pudimos preparar la prueba.");
    }
    if (!result.conversation?.id) throw new Error("No pudimos preparar la prueba.");
    if (result.limits?.maxSessionSeconds) setMaxSeconds(result.limits.maxSessionSeconds);
    if (typeof result.limits?.testingMode === "boolean") setTestingMode(result.limits.testingMode);
    const session = { id: result.conversation.id, startedAt: Date.now() };
    conversationRef.current = session;
    setSessionActive(true);
    setElapsed(0);
    return session;
  }

  async function beginRecording() {
    setError("");
    setInfo("");
    setLastAction(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Tu navegador no permite grabar audio para esta prueba.");
      return;
    }

    try {
      await ensureSession();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("El micrófono dejó de responder. Intenta nuevamente.");
        releaseMicrophone();
        setStatus("idle");
      };
      recorder.start(250);
      setStatus("recording");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos acceder al micrófono.");
      releaseMicrophone();
      setStatus("idle");
    }
  }

  async function stopAndSend() {
    const recorder = recorderRef.current;
    const session = conversationRef.current;
    if (!recorder || !session || recorder.state !== "recording") return;

    setStatus("thinking");
    setError("");
    setInfo("");

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
        resolve(new Blob(chunksRef.current, { type }));
      };
      recorder.stop();
    });
    releaseMicrophone();

    if (!blob.size) {
      setStatus("idle");
      setError("No recibimos audio. Intenta hablar durante un par de segundos.");
      return;
    }
    if (exceedsPayloadLimit(blob.size)) {
      setStatus("idle");
      setError(`El audio supera el límite de ${MAX_PAYLOAD_MB} MB. Graba un turno más corto.`);
      return;
    }

    try {
      const form = new FormData();
      const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      form.set("businessId", workspace.business.id);
      form.set("conversationId", session.id);
      form.set("history", JSON.stringify(turns.slice(-8)));
      form.set("includeAudio", "1");
      form.set("audio", new File([blob], `progy-turn.${extension}`, { type: blob.type || "audio/webm" }));

      const response = await fetch("/api/assistant/turn", { method: "POST", body: form });
      const result = await response.json().catch(() => ({})) as AssistantTurnResponse;
      if (!response.ok) {
        if (result.code === "voice_trial_limit_reached") {
          setInfo(result.error || "La prueba gratuita ya fue utilizada.");
          await finishSession("completed");
          return;
        }
        throw new Error(result.error || "No pudimos completar este turno.");
      }

      const userText = result.userText?.trim() || "Audio recibido";
      const reply = result.reply?.trim() || "No pude preparar una respuesta.";
      setTurns((current) => appendTranscript(current, userText, reply));
      setLastAction(result.action || null);
      if (result.limits?.maxSessionSeconds) setMaxSeconds(result.limits.maxSessionSeconds);
      if (typeof result.limits?.testingMode === "boolean") setTestingMode(result.limits.testingMode);

      if (result.action?.executed) await onRefresh();

      if (result.audio?.base64) {
        setStatus("speaking");
        const audio = new Audio(base64AudioUrl(result.audio.base64, result.audio.contentType));
        audioRef.current = audio;
        audio.onended = () => {
          audioRef.current = null;
          if (conversationRef.current) setStatus("idle");
        };
        audio.onerror = () => {
          audioRef.current = null;
          setStatus("idle");
          setInfo("La respuesta quedó escrita en pantalla, aunque el audio no pudo reproducirse.");
        };
        await audio.play();
      } else {
        setStatus("idle");
        if (result.audioWarning?.message) {
          setInfo(`${result.audioWarning.message} La respuesta de Progy quedó disponible en la conversación.`);
        }
      }
    } catch (cause) {
      setStatus("idle");
      setError(cause instanceof Error ? cause.message : "No pudimos completar la conversación.");
    }
  }

  const ready = Boolean(workspace.agent?.voice_id) && workspace.catalogItems.length > 0 && workspace.hours.length > 0;
  const secondsLeft = Math.max(0, maxSeconds - elapsed);
  const title = status === "recording" ? "Te escucho" : status === "thinking" ? "Preparando la respuesta" : status === "speaking" ? "Progy está respondiendo" : sessionActive ? "Continúa la conversación" : `Prueba a Progy para ${workspace.business.name}`;

  return <div className={styles.studio}>
    <section className={styles.callCard}>
      <div className={styles.badge}><i /> {testingMode ? "Modo de pruebas habilitado" : "Prueba privada desde tu navegador"}</div>
      <div className={styles.avatar}><span /></div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{ready ? "Habla en turnos cortos. Progy responderá con la voz que elegiste y con la información real de tu negocio." : "Antes de comenzar, elige una voz y agrega al menos un producto o servicio con su precio."}</p>
      <div className={styles.wave} aria-hidden="true">{[20,46,30,68,38,78,44,28,62,35,72,27,52,34,60,24,45].map((height, index) => <i key={index} style={{ height: `${status === "idle" ? 8 : height}%` }} />)}</div>
      <div className={styles.controls}>
        {status === "recording" ? <button className={styles.primary} onClick={() => void stopAndSend()}>Detener y enviar</button> : status === "thinking" ? <button className={styles.primary} disabled>Progy está pensando…</button> : status === "speaking" ? <button className={styles.primary} disabled>Escucha la respuesta…</button> : <button className={styles.primary} onClick={() => void beginRecording()} disabled={!ready || secondsLeft <= 0}>{sessionActive ? "Hablar de nuevo" : "Iniciar prueba por voz"}</button>}
        {sessionActive && status !== "recording" && status !== "thinking" && <button className={styles.secondary} onClick={() => void finishSession("completed")}>Finalizar prueba</button>}
      </div>
      <div className={styles.timer}>{sessionActive ? `${secondsLeft}s disponibles en esta conversación` : testingMode ? "Puedes iniciar varias conversaciones mientras validamos consumo y comportamiento." : workspace.plan?.plan_code === "trial" ? "Tu plan incluye una prueba de voz" : "Prueba controlada para evitar consumo innecesario"}</div>
      {error && <div className={styles.error}>{error}</div>}
      {info && <div className={styles.info}>{info}</div>}
    </section>

    <aside className={styles.sideCard}>
      <h3>Conversación</h3><p>El historial corto ayuda a Progy a mantener el contexto sin enviar conversaciones completas en cada turno.</p>
      <div className={styles.transcript}>{turns.length ? turns.map((turn, index) => <div className={`${styles.turn} ${turn.role === "user" ? styles.user : styles.assistant}`} key={`${turn.role}-${index}`}><small>{turn.role === "user" ? "Tú" : "Progy"}</small>{turn.text}</div>) : <div className={styles.empty}>La transcripción de esta prueba aparecerá aquí.</div>}</div>
      {lastAction?.executed && <div className={styles.action}><DashboardIcon name="check" size={16} />{lastAction.type === "order" ? "Pedido registrado" : "Reserva registrada"}{lastAction.total !== undefined ? ` · $${Number(lastAction.total).toFixed(2)}` : ""}</div>}
    </aside>
  </div>;
}
