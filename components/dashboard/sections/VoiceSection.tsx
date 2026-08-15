"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SelectedWorkspace, VoiceOption, WorkspaceAction } from "../types";
import { Card, EmptyState, SectionHeader } from "../ui";
import { DashboardIcon } from "../LineIcon";
import styles from "../ProgyDashboard.module.css";

export default function VoiceSection({ workspace, action }: { workspace: SelectedWorkspace; action: WorkspaceAction }) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selected, setSelected] = useState(workspace.agent?.voice_id || "");
  const [speed, setSpeed] = useState(Number((workspace.agent?.settings as Record<string, unknown> | null)?.voice_speed || 50));
  const [expression, setExpression] = useState(Number((workspace.agent?.settings as Record<string, unknown> | null)?.voice_expression || 55));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadVoices = useCallback(async (refresh = false) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/elevenlabs/voices${refresh ? "?refresh=1" : ""}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({})) as { voices?: VoiceOption[]; error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos cargar las voces disponibles.");
      setVoices(result.voices || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar las voces disponibles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadVoices(), 0);
    return () => {
      window.clearTimeout(timer);
      audioRef.current?.pause();
    };
  }, [loadVoices]);

  async function preview(voice: VoiceOption) {
    setBusy(`play:${voice.id}`);
    setError("");
    audioRef.current?.pause();
    try {
      if (voice.previewUrl) {
        const audio = new Audio(voice.previewUrl);
        audioRef.current = audio;
        audio.onended = () => setBusy("");
        audio.onerror = () => setBusy("");
        await audio.play();
        return;
      }

      const response = await fetch("/api/elevenlabs/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: voice.id, mode: "sample", speed, expression }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(result.error || "No pudimos reproducir esta voz.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setBusy(""); };
      audio.onerror = () => { URL.revokeObjectURL(url); setBusy(""); };
      await audio.play();
    } catch (cause) {
      setBusy("");
      setError(cause instanceof Error ? cause.message : "No pudimos reproducir esta voz.");
    }
  }

  async function save() {
    if (!selected) {
      setError("Elige una voz para continuar.");
      return;
    }
    setBusy("save");
    setError("");
    const existingSettings = workspace.agent?.settings && typeof workspace.agent.settings === "object" ? workspace.agent.settings : {};
    try {
      await action({
        action: "saveAgent",
        businessId: workspace.business.id,
        voice_id: selected,
        settings: { ...existingSettings, voice_speed: speed, voice_expression: expression },
      }, "Voz de Progy actualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar la voz.");
    } finally {
      setBusy("");
    }
  }

  const chosen = voices.find((voice) => voice.id === selected);

  return <>
    <SectionHeader eyebrow="LA VOZ DE TU NEGOCIO" title="Voz e idioma" description="Escucha varias opciones y elige la voz que utilizará Progy en las pruebas y conversaciones. La voz guardada se aplica al negocio activo." />
    {error && <div className={styles.errorBanner}>{error}</div>}
    <div className={styles.grid}>
      <Card title="Elige una voz" description="Puedes escuchar una muestra antes de guardar." tag={loading ? "Cargando" : `${voices.length} voces`}>
        {loading ? <div className={styles.loading} style={{ minHeight: 220 }}><div><div className={styles.spinner} />Preparando voces…</div></div> : voices.length ? <div className={styles.voiceGrid}>{voices.slice(0, 30).map((voice) => <article className={`${styles.voice} ${selected === voice.id ? styles.selected : ""}`} key={voice.id} onClick={() => setSelected(voice.id)}><b>{voice.name}</b><small>{voice.description}</small>{voice.recommended && <em>Recomendada</em>}<button type="button" className={styles.voicePlay} onClick={(event) => { event.stopPropagation(); void preview(voice); }}>{busy === `play:${voice.id}` ? "Reproduciendo…" : <><DashboardIcon name="play" size={13} />Escuchar</>}</button></article>)}</div> : <EmptyState title="No hay voces disponibles" text="Vuelve a intentarlo más tarde o revisa la configuración del servicio de voz desde el entorno de administración." />}
        <div className={styles.actions}><button className={styles.secondary} onClick={() => void loadVoices(true)} disabled={loading}>Actualizar lista</button></div>
      </Card>

      <Card className={styles.cardHalf} title="Ajusta el estilo" description="Estos ajustes se aplican a la respuesta hablada de Progy.">
        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.full}`}>Ritmo: {speed}<input type="range" min="25" max="75" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>
          <label className={`${styles.field} ${styles.full}`}>Expresividad: {expression}<input type="range" min="20" max="80" value={expression} onChange={(event) => setExpression(Number(event.target.value))} /></label>
        </div>
      </Card>

      <Card className={styles.cardHalf} title="Voz seleccionada" description="Esta será la voz usada por la prueba del asistente.">
        {chosen || selected ? <div className={styles.listRow}><div><b>{chosen?.name || "Voz configurada"}</b><small>{chosen?.description || "La voz ya estaba guardada para este negocio."}</small></div><strong><DashboardIcon name="check" size={16} /> Lista</strong></div> : <EmptyState title="Aún no has elegido una voz" text="Escucha varias opciones y selecciona la que represente mejor a tu negocio." />}
        <div className={styles.actions}><button className={styles.primary} onClick={() => void save()} disabled={!selected || busy === "save"}>{busy === "save" ? "Guardando…" : "Usar esta voz"}</button></div>
      </Card>
    </div>
  </>;
}
