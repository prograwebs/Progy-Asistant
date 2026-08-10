import type { SelectedWorkspace } from "../types";
import { Card, SectionHeader } from "../ui";
import styles from "../ProgyDashboard.module.css";

function sumKind(workspace: SelectedWorkspace, kind: string) {
  return workspace.usage.filter((row) => row.kind === kind).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
}

export default function UsageSection({ workspace }: { workspace: SelectedWorkspace }) {
  const planCode = workspace.plan?.plan_code || "trial";
  const usedVoice = Number(workspace.plan?.used_voice_seconds || 0);
  const includedVoice = Number(workspace.plan?.included_voice_seconds || 0);
  const voicePercent = includedVoice > 0 ? Math.min(100, Math.round((usedVoice / includedVoice) * 100)) : 0;
  const aiTurns = sumKind(workspace, "openai_output_tokens") > 0 ? workspace.usage.filter((row) => row.kind === "openai_output_tokens").length : 0;
  const voiceCharacters = sumKind(workspace, "elevenlabs_characters");
  const imports = workspace.usage.filter((row) => row.kind === "catalog_import").length;

  return <>
    <SectionHeader eyebrow="CONTROL SIN SORPRESAS" title="Consumo y plan" description="Revisa cuánto se ha utilizado y qué incluye el plan del negocio. Los nombres y detalles técnicos de los proveedores permanecen fuera de la experiencia del cliente." />
    <div className={styles.metricGrid}>
      <article className={styles.metric}><small>Plan actual</small><b style={{ textTransform: "capitalize" }}>{planCode}</b><span>{workspace.plan?.status || "active"}</span></article>
      <article className={styles.metric}><small>Uso de voz</small><b>{Math.ceil(usedVoice / 60)} min</b><span>{includedVoice ? `de ${Math.ceil(includedVoice / 60)} min incluidos` : "medición activa"}</span></article>
      <article className={styles.metric}><small>Respuestas medidas</small><b>{aiTurns}</b><span>Interacciones registradas</span></article>
      <article className={styles.metric}><small>Importaciones</small><b>{imports}</b><span>Documentos procesados</span></article>
    </div>

    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Uso del plan" description="La prueba y los planes tienen límites para mantener controlado el consumo.">
        <div className={styles.listRow}><div><b>Voz utilizada</b><small>{usedVoice} segundos registrados</small></div><strong>{voicePercent}%</strong></div>
        <div className={styles.progress}><i style={{ width: `${voicePercent}%` }} /></div>
        <div className={styles.list} style={{ marginTop: 14 }}>
          <div className={styles.listRow}><div><b>Audio generado</b><small>Medido para controlar el consumo de la experiencia hablada.</small></div><strong>{voiceCharacters.toLocaleString("es-EC")} caracteres</strong></div>
          <div className={styles.listRow}><div><b>Historial</b><small>{workspace.conversations.length} conversaciones cargadas en este panel.</small></div></div>
        </div>
      </Card>

      <Card className={styles.cardHalf} title="Planes de Progy" description="La arquitectura ya separa la prueba de los planes de negocio. El cobro se conectará al proveedor comercial elegido por PrograWebs.">
        <div className={styles.list}>
          <div className={styles.listRow}><div><b>Prueba</b><small>Un negocio, configuración completa y una prueba de voz controlada.</small></div><strong>{planCode === "trial" ? "Actual" : ""}</strong></div>
          <div className={styles.listRow}><div><b>Negocio</b><small>Más pruebas, historial ampliado, catálogo mayor y WhatsApp cuando esté habilitado.</small></div><strong>{planCode === "business" ? "Actual" : ""}</strong></div>
          <div className={styles.listRow}><div><b>Pro</b><small>Varios negocios, automatizaciones y mayor capacidad operativa.</small></div><strong>{planCode === "pro" ? "Actual" : ""}</strong></div>
        </div>
      </Card>
    </div>
  </>;
}
