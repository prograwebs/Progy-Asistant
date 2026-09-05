import type { SelectedWorkspace } from "@/lib/shared/types/workspace";
import { Card, SectionHeader } from "../ui";
import styles from "../ProgyDashboard.module.css";

function sumKind(workspace: SelectedWorkspace, kind: string) {
  return workspace.usage.filter((row) => row.kind === kind).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
}

function planLabel(code?: string | null) {
  const normalized = String(code || "trial").toLowerCase().replaceAll("-", "_");
  if (["trial", "free_trial", "free"].includes(normalized)) return "Prueba";
  if (normalized === "business") return "Negocio";
  if (normalized === "starter") return "Starter";
  if (normalized === "pro") return "Pro";
  return code || "Prueba";
}

function conversationTurns(workspace: SelectedWorkspace) {
  return workspace.conversations.reduce((total, conversation) => {
    const turns = conversation.metadata && Array.isArray(conversation.metadata.turns)
      ? conversation.metadata.turns
      : [];
    return total + turns.filter((turn) => {
      if (!turn || typeof turn !== "object") return false;
      return (turn as Record<string, unknown>).role === "assistant";
    }).length;
  }, 0);
}

export default function UsageSection({ workspace }: { workspace: SelectedWorkspace }) {
  const rawPlanCode = workspace.plan?.plan_code || workspace.business.status || "trial";
  const voiceFromPlan = Number(workspace.plan?.used_voice_seconds || 0);
  const voiceFromConversations = workspace.conversations
    .filter((conversation) => conversation.channel === "web_voice")
    .reduce((sum, conversation) => sum + Math.max(0, Number(conversation.duration_seconds || 0)), 0);
  const usedVoice = Math.max(voiceFromPlan, voiceFromConversations);
  const includedVoice = Number(workspace.plan?.included_voice_seconds || 0);
  const voicePercent = includedVoice > 0 ? Math.min(100, Math.round((usedVoice / includedVoice) * 100)) : 0;

  const inputTokens = sumKind(workspace, "openai_input_tokens");
  const outputTokens = sumKind(workspace, "openai_output_tokens");
  const audioInputTokens = sumKind(workspace, "openai_audio_input_tokens");
  const totalTokens = inputTokens + outputTokens + audioInputTokens;
  const voiceCharacters = sumKind(workspace, "elevenlabs_characters");
  const imports = workspace.usage.filter((row) => row.kind === "catalog_import").length;
  const measuredTurns = workspace.usage.filter((row) => row.kind === "openai_output_tokens").length;
  const assistantTurns = conversationTurns(workspace);
  const voiceConversations = workspace.conversations.filter((conversation) => conversation.channel === "web_voice").length;
  const interactions = Math.max(measuredTurns, assistantTurns, voiceConversations);
  const estimatedCost = workspace.usage.reduce((sum, row) => sum + Math.max(0, Number(row.estimated_cost_usd || 0)), 0);

  return <>
    <SectionHeader eyebrow="CONTROL SIN SORPRESAS" title="Consumo y plan" description="Revisa las conversaciones, minutos, tokens y audio utilizados por este negocio. El consumo nuevo se registra automáticamente durante las pruebas." />
    <div className={styles.metricGrid}>
      <article className={styles.metric}><small>Plan actual</small><b>{planLabel(rawPlanCode)}</b><span>{workspace.plan?.status === "active" ? "Activo" : workspace.plan?.status || "Activo"}</span></article>
      <article className={styles.metric}><small>Uso de voz</small><b>{usedVoice < 60 ? `${usedVoice}s` : `${Math.ceil(usedVoice / 60)} min`}</b><span>{includedVoice ? `de ${Math.ceil(includedVoice / 60)} min incluidos` : `${voiceConversations} conversaciones de voz`}</span></article>
      <article className={styles.metric}><small>Tokens de IA</small><b>{totalTokens.toLocaleString("es-EC")}</b><span>{interactions} interacciones registradas</span></article>
      <article className={styles.metric}><small>Coste estimado</small><b>${estimatedCost.toFixed(4)}</b><span>según las tarifas configuradas</span></article>
    </div>

    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Detalle de consumo" description="Los registros permiten comparar cuánto usa cada prueba antes de definir los límites comerciales.">
        <div className={styles.listRow}><div><b>Voz utilizada</b><small>{usedVoice} segundos acumulados entre el plan y las conversaciones registradas.</small></div><strong>{includedVoice ? `${voicePercent}%` : `${voiceConversations} pruebas`}</strong></div>
        {includedVoice > 0 && <div className={styles.progress}><i style={{ width: `${voicePercent}%` }} /></div>}
        <div className={styles.list} style={{ marginTop: 14 }}>
          <div className={styles.listRow}><div><b>Entrada de IA</b><small>Texto y contexto enviados para comprender al cliente.</small></div><strong>{inputTokens.toLocaleString("es-EC")} tokens</strong></div>
          <div className={styles.listRow}><div><b>Salida de IA</b><small>Tokens utilizados para preparar las respuestas de Progy.</small></div><strong>{outputTokens.toLocaleString("es-EC")} tokens</strong></div>
          <div className={styles.listRow}><div><b>Audio procesado</b><small>Tokens de audio contabilizados por la transcripción cuando el proveedor los reporta.</small></div><strong>{audioInputTokens.toLocaleString("es-EC")} tokens</strong></div>
          <div className={styles.listRow}><div><b>Voz generada</b><small>Texto enviado al motor de voz para responder al cliente.</small></div><strong>{voiceCharacters.toLocaleString("es-EC")} caracteres</strong></div>
          <div className={styles.listRow}><div><b>Historial</b><small>{workspace.conversations.length} conversaciones cargadas en este panel.</small></div><strong>{interactions} respuestas</strong></div>
          <div className={styles.listRow}><div><b>Documentos</b><small>Importaciones de catálogo registradas.</small></div><strong>{imports}</strong></div>
        </div>
      </Card>

      <Card className={styles.cardHalf} title="Cómo leer estos datos" description="Las conversaciones antiguas pueden no tener tokens históricos porque ese medidor todavía no existía cuando se realizaron.">
        <div className={styles.list}>
          <div className={styles.listRow}><div><b>Conversaciones existentes</b><small>Se cuentan inmediatamente y su duración se usa como respaldo para mostrar voz consumida.</small></div><strong>{workspace.conversations.length}</strong></div>
          <div className={styles.listRow}><div><b>Nuevas pruebas</b><small>Desde esta versión registran tokens, audio generado, duración y coste estimado cuando hay tarifas configuradas.</small></div><strong>Medición activa</strong></div>
          <div className={styles.listRow}><div><b>Importante</b><small>No inventamos el consumo de pruebas anteriores: si no se registró un dato histórico, se muestra en cero y empezará a medirse en la siguiente prueba.</small></div></div>
        </div>
      </Card>
    </div>
  </>;
}
