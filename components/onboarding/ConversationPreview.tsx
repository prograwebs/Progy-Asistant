"use client";

import { Bot, Mic, Pause, Play, Send, Sparkles, Square, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { DemoScenario } from "./types";
import styles from "./Onboarding.module.css";

type Turn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  audioUrl?: string;
};

type AssistantResponse = {
  userText?: string;
  reply?: string;
  error?: string;
  code?: string;
  audio?: { base64?: string; contentType?: string } | null;
  audioWarning?: { message?: string } | null;
};

type SessionResponse = {
  conversation?: { id?: string };
  error?: string;
  code?: string;
  limits?: { maxSessionSeconds?: number };
};

type Suggestion = { id: string; text: string };

type ConversationPreviewProps = {
  businessId: string;
  businessName: string;
  voiceId: string;
  scenario: DemoScenario;
  suggestions: Suggestion[];
  onScenarioSelect: (id: string) => void;
};

type Status = "idle" | "recording" | "thinking" | "speaking";

function preferredMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function audioUrlFromBase64(base64: string, contentType = "audio/mpeg") {
  const binary = window.atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: contentType }));
}

function historyFromTurns(turns: Turn[]) {
  return turns
    .filter((turn) => turn.id !== "welcome")
    .filter((turn) => !/demostraci[oó]n|no se registrar[aá]|solo se simula|no crear[eé]/i.test(turn.text))
    .slice(-8)
    .map(({ role, text }) => ({ role, text }));
}

function statusCopy(status: Status, sessionActive: boolean) {
  if (status === "recording") return "Te escucho";
  if (status === "thinking") return "Progy está preparando una respuesta";
  if (status === "speaking") return "Progy está hablando";
  return sessionActive ? "Continúa la conversación" : "Prueba a Progy en vivo";
}

function timestamp() {
  return Date.now();
}

export default function ConversationPreview({ businessId, businessName, voiceId, scenario, suggestions, onScenarioSelect }: ConversationPreviewProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState<Turn[]>(() => [{ id: "welcome", role: "assistant", text: `Hola, gracias por comunicarte con ${businessName}. Soy Progy, ¿en qué puedo ayudarte?` }]);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [maxSeconds, setMaxSeconds] = useState(120);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const conversationRef = useRef<{ id: string; startedAt: number } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<Set<string>>(new Set());

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setActiveAudioId("");
    setStatus((current) => current === "speaking" ? "idle" : current);
  }, []);

  const finishSession = useCallback(async (resultStatus: "completed" | "failed" = "completed") => {
    releaseMicrophone();
    stopAudio();
    const current = conversationRef.current;
    conversationRef.current = null;
    setSessionActive(false);
    setStatus("idle");
    if (!current) return;

    try {
      await fetch("/api/assistant/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end",
          businessId,
          conversationId: current.id,
          durationSeconds: Math.max(1, Math.round((timestamp() - current.startedAt) / 1000)),
          status: resultStatus,
        }),
      });
    } catch (cause) {
      console.error("Progy onboarding demo session close failed", cause);
    }
  }, [businessId, releaseMicrophone, stopAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.pause();
    audioRef.current = null;
    const timer = window.setTimeout(() => {
      setActiveAudioId("");
      setStatus((current) => current === "speaking" ? "idle" : current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [voiceId]);

  useEffect(() => {
    if (!sessionActive) return undefined;
    const timer = window.setInterval(() => {
      const current = conversationRef.current;
      if (!current) return;
      const next = Math.round((timestamp() - current.startedAt) / 1000);
      setElapsed(next);
      if (next >= maxSeconds) {
        setNotice("La prueba llegó a su límite de duración. Puedes continuar configurando tu negocio.");
        void finishSession("completed");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finishSession, maxSeconds, sessionActive]);

  useEffect(() => () => {
    void finishSession("completed");
    audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    audioUrlsRef.current.clear();
  }, [finishSession]);

  async function ensureSession() {
    if (conversationRef.current) return conversationRef.current;

    const response = await fetch("/api/assistant/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", businessId, voiceId, demoMode: true, scenario: `Onboarding · ${scenario.id}` }),
    });
    const result = await response.json().catch(() => ({})) as SessionResponse;
    if (!response.ok) throw new Error(result.error || "No pudimos preparar la demo.");
    if (!result.conversation?.id) throw new Error("No pudimos preparar la demo.");

    if (result.limits?.maxSessionSeconds) setMaxSeconds(result.limits.maxSessionSeconds);
    const session = { id: result.conversation.id, startedAt: timestamp() };
    conversationRef.current = session;
    setSessionActive(true);
    setElapsed(0);
    return session;
  }

  async function playTurn(turnId: string, url: string) {
    stopAudio();
    const audio = new Audio(url);
    audioRef.current = audio;
    setActiveAudioId(turnId);
    setStatus("speaking");
    audio.onended = () => {
      audioRef.current = null;
      setActiveAudioId("");
      setStatus("idle");
    };
    audio.onerror = () => {
      audioRef.current = null;
      setActiveAudioId("");
      setStatus("idle");
      setNotice("La respuesta quedó escrita, aunque el audio no pudo reproducirse.");
    };

    try {
      await audio.play();
    } catch {
      setActiveAudioId("");
      setStatus("idle");
      setNotice("Tu navegador bloqueó la reproducción automática. Pulsa “Escuchar” en la respuesta.");
    }
  }

  async function handleResponse(response: Response, fallbackUserText: string) {
    const result = await response.json().catch(() => ({})) as AssistantResponse;
    if (!response.ok) {
      if (result.code === "voice_trial_limit_reached") void finishSession("completed");
      throw new Error(result.error || "No pudimos completar esta respuesta.");
    }

    const userText = result.userText?.trim() || fallbackUserText;
    const reply = result.reply?.trim() || "No pude preparar una respuesta.";
    const userTurn: Turn = { id: `user-${timestamp()}`, role: "user", text: userText };
    const assistantTurn: Turn = { id: `assistant-${timestamp()}`, role: "assistant", text: reply };

    if (result.audio?.base64) {
      const url = audioUrlFromBase64(result.audio.base64, result.audio.contentType);
      audioUrlsRef.current.add(url);
      assistantTurn.audioUrl = url;
    }

    setTurns((current) => [...current, userTurn, assistantTurn].slice(-20));
    if (result.audio?.base64 && !muted) {
      await playTurn(assistantTurn.id, assistantTurn.audioUrl as string);
    } else {
      setStatus("idle");
      if (result.audioWarning?.message) setNotice(`${result.audioWarning.message} Puedes continuar por escrito.`);
    }
  }

  async function sendText(rawText: string) {
    const text = rawText.trim().slice(0, 2000);
    if (!text || status !== "idle" || !voiceId) return;
    setInput("");
    setError("");
    setNotice("");
    setStatus("thinking");

    try {
      const session = await ensureSession();
      const response = await fetch("/api/assistant/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          conversationId: session.id,
          voiceId,
          demoMode: true,
          text,
          history: historyFromTurns(turns),
          includeAudio: true,
        }),
      });
      await handleResponse(response, text);
    } catch (cause) {
      setStatus("idle");
      setError(cause instanceof Error ? cause.message : "No pudimos completar esta respuesta.");
    }
  }

  async function beginRecording() {
    setError("");
    setNotice("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Tu navegador no permite grabar audio. Puedes escribir tu pregunta abajo.");
      return;
    }

    try {
      await ensureSession();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        releaseMicrophone();
        setStatus("idle");
        setError("El micrófono dejó de responder. Intenta nuevamente.");
      };
      recorder.start(250);
      setStatus("recording");
    } catch (cause) {
      releaseMicrophone();
      setStatus("idle");
      setError(cause instanceof Error ? cause.message : "No pudimos acceder al micrófono.");
    }
  }

  async function stopAndSendRecording() {
    const recorder = recorderRef.current;
    const session = conversationRef.current;
    if (!recorder || !session || recorder.state !== "recording") return;

    setStatus("thinking");
    setError("");
    setNotice("");
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      recorder.stop();
    });
    releaseMicrophone();

    if (!blob.size) {
      setStatus("idle");
      setError("No recibimos audio. Habla durante un par de segundos e inténtalo nuevamente.");
      return;
    }

    try {
      const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      const form = new FormData();
      form.set("businessId", businessId);
      form.set("conversationId", session.id);
      form.set("voiceId", voiceId);
      form.set("demoMode", "1");
      form.set("history", JSON.stringify(historyFromTurns(turns)));
      form.set("includeAudio", "1");
      form.set("audio", new File([blob], `progy-onboarding.${extension}`, { type: blob.type || "audio/webm" }));
      const response = await fetch("/api/assistant/turn", { method: "POST", body: form });
      await handleResponse(response, "Audio recibido");
    } catch (cause) {
      setStatus("idle");
      setError(cause instanceof Error ? cause.message : "No pudimos completar esta respuesta.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendText(input);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendText(input);
    }
  }

  function toggleAudio(turn: Turn) {
    if (!turn.audioUrl) return;
    if (activeAudioId === turn.id) {
      stopAudio();
      return;
    }
    void playTurn(turn.id, turn.audioUrl);
  }

  const secondsLeft = Math.max(0, maxSeconds - elapsed);
  const canRecord = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

  return <div className={styles.conversationShell}>
    <div className={styles.conversationTopbar}>
      <div className={styles.liveBadge}><i /> DEMO EN VIVO</div>
      <div className={styles.conversationStatus}><span className={status === "recording" ? styles.statusRecording : status === "thinking" || status === "speaking" ? styles.statusActive : ""} /> {statusCopy(status, sessionActive)} <span className={`${styles.waveform} ${status !== "idle" ? styles.waveformActive : ""}`} aria-hidden="true">{[35, 62, 45, 80, 52, 70, 40].map((height, index) => <i key={index} style={{ height: `${status === "idle" ? 8 : height}%` }} />)}</span></div>
      <button type="button" className={styles.muteButton} onClick={() => { setMuted((current) => !current); if (!muted) stopAudio(); }} aria-pressed={muted} aria-label={muted ? "Activar audio automático" : "Silenciar audio automático"}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />} {muted ? "Audio silenciado" : "Audio activo"}</button>
    </div>

    <div className={styles.conversation} aria-live="polite">
      <div className={styles.conversationHint}><Sparkles size={14} /> Progy está usando información de ejemplo de {businessName}</div>
      {turns.map((turn) => <div className={`${styles.messageRow} ${turn.role === "user" ? styles.customerRow : styles.progyRow}`} key={turn.id}>
        <span className={`${styles.messageAvatar} ${turn.role === "assistant" ? styles.progyAvatar : ""}`}>{turn.role === "assistant" ? <Bot size={15} /> : <span>Tú</span>}</span>
        <div className={styles.messageContent}><small>{turn.role === "assistant" ? `Progy · ${businessName}` : "Tú"}</small><p>{turn.text}</p>{turn.role === "assistant" && turn.audioUrl && <button type="button" className={styles.responseAudio} onClick={() => toggleAudio(turn)}>{activeAudioId === turn.id ? <><Pause size={12} fill="currentColor" /> Pausar</> : <><Play size={12} fill="currentColor" /> Escuchar respuesta</>}</button>}</div>
      </div>)}
      {status === "thinking" && <div className={styles.thinking}><span /><span /><span /> Progy está pensando…</div>}
      {status === "recording" && <div className={styles.recordingNote}><span className={styles.recordingDot} /> Grabando tu pregunta… pulsa el botón para enviar</div>}
    </div>

    <div className={styles.suggestionArea}><small><Sparkles size={12} /> Prueba preguntando:</small><div className={styles.suggestionList}>{suggestions.map((suggestion) => <button type="button" className={styles.suggestionChip} key={suggestion.id} disabled={status !== "idle" || !voiceId} onClick={() => { onScenarioSelect(suggestion.id); void sendText(suggestion.text); }}>{suggestion.text}</button>)}</div></div>

    <form className={styles.composer} onSubmit={submit}>
      <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleInputKeyDown} disabled={status !== "idle" || !voiceId} placeholder="Escribe una pregunta sobre tu negocio…" aria-label="Escribe una pregunta para Progy" />
      <button type="submit" className={styles.sendButton} disabled={!input.trim() || status !== "idle" || !voiceId} aria-label="Enviar pregunta"><Send size={16} /></button>
      <button type="button" className={`${styles.recordButton} ${status === "recording" ? styles.recordButtonActive : ""}`} disabled={status !== "idle" && status !== "recording" || !voiceId} onClick={() => status === "recording" ? void stopAndSendRecording() : void beginRecording()} aria-label={status === "recording" ? "Detener y enviar grabación" : "Hablar con Progy"}>{status === "recording" ? <Square size={16} fill="currentColor" /> : <Mic size={17} />}</button>
    </form>

    <div className={styles.conversationFooter}><span>{canRecord ? "Puedes escribir o hablar; el micrófono se activa solo cuando lo pulses." : "El chat escrito está disponible en este navegador."}</span>{sessionActive && <span>{secondsLeft}s restantes</span>}</div>
    {error && <p className={styles.conversationError} role="alert">{error}</p>}
    {notice && <p className={styles.conversationNotice} role="status">{notice}</p>}
  </div>;
}
