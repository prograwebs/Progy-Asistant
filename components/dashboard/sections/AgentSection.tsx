"use client";

import { FormEvent, useState } from "react";
import type { SelectedWorkspace, WorkspaceAction } from "../types";
import { Card, SectionHeader } from "../ui";
import { DashboardIcon } from "../LineIcon";
import styles from "../ProgyDashboard.module.css";

const featureCopy: Record<string, { title: string; text: string }> = {
  answer_questions: { title: "Responder consultas", text: "Horarios, ubicación, precios e información del negocio." },
  take_orders: { title: "Tomar pedidos", text: "Recopilar productos, cantidades y modalidad de entrega." },
  schedule_appointments: { title: "Agendar citas", text: "Recopilar fecha, hora y servicio solicitado." },
  create_reservations: { title: "Crear reservas", text: "Recopilar fecha, hora, personas y detalles necesarios." },
  create_quotes: { title: "Preparar cotizaciones", text: "Identificar productos o servicios a cotizar." },
  capture_leads: { title: "Registrar interesados", text: "Recopilar datos de contacto y necesidad." },
  send_whatsapp: { title: "Continuar por WhatsApp", text: "Enviar confirmaciones cuando el canal esté disponible." },
  transfer_human: { title: "Pedir ayuda a una persona", text: "Escalar cuando Progy no tenga información suficiente." },
};

export default function AgentSection({ workspace, action }: { workspace: SelectedWorkspace; action: WorkspaceAction }) {
  const agent = workspace.agent;
  const [tone, setTone] = useState(agent?.tone || "cálido, natural y profesional");
  const [features, setFeatures] = useState<Record<string, boolean>>(() => Object.fromEntries(workspace.features.map((item) => [item.feature_code, item.enabled])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      action: "saveAgent",
      businessId: workspace.business.id,
      agent_name: form.get("agentName"),
      language_code: form.get("language"),
      greeting: form.get("greeting"),
      tone,
      collect_customer_name: form.get("collectName") === "on",
      collect_customer_phone: form.get("collectPhone") === "on",
      fallback_message: form.get("fallback"),
      settings: agent?.settings || {},
    };

    try {
      await action(payload, undefined, false);
      for (const [featureCode, enabled] of Object.entries(features)) {
        await action({ action: "saveFeature", businessId: workspace.business.id, featureCode, enabled }, undefined, false);
      }
      await action(payload, "Configuración de Progy guardada.", true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar la configuración.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <SectionHeader eyebrow="FORMA A TU ASISTENTE" title="Configurar Progy" description="Decide cómo se presenta, qué tono utiliza, qué información solicita y qué acciones puede realizar para tu negocio." />
    {error && <div className={styles.errorBanner}>{error}</div>}
    <form className={styles.grid} onSubmit={save}>
      <Card className={styles.cardHalf} title="Identidad del asistente" description="El cliente percibe una sola personalidad consistente.">
        <div className={styles.formGrid}>
          <label className={styles.field}>Nombre del asistente<input className={styles.input} name="agentName" defaultValue={agent?.agent_name || "Progy"} /></label>
          <label className={styles.field}>Idioma<select className={styles.select} name="language" defaultValue={agent?.language_code || "es-EC"}><option value="es-EC">Español de Ecuador</option><option value="es-419">Español latino</option></select></label>
          <label className={`${styles.field} ${styles.full}`}>Saludo inicial<textarea className={styles.textarea} name="greeting" defaultValue={agent?.greeting || `Hola, gracias por comunicarte con ${workspace.business.name}. Soy Progy, ¿en qué puedo ayudarte?`} /></label>
          <label className={`${styles.field} ${styles.full}`}>Cuando falte información<textarea className={styles.textarea} name="fallback" defaultValue={agent?.fallback_message || "No tengo esa información confirmada. Puedo ayudarte a comunicarte con una persona del negocio."} /></label>
        </div>
      </Card>

      <Card className={styles.cardHalf} title="Estilo de atención" description="Progy mantiene el mismo carácter en cada conversación.">
        <div className={styles.list}>
          {[
            ["cálido, natural y profesional", "Cálido y cercano", "Amable, humano y profesional."],
            ["directo, claro y profesional", "Claro y profesional", "Respuestas precisas y sobrias."],
            ["ágil, positivo y resolutivo", "Ágil y resolutivo", "Rápido y orientado a completar la solicitud."],
          ].map(([value, title, text]) => <button type="button" className={`${styles.listRow} ${tone === value ? styles.selected : ""}`} style={{ cursor: "pointer", textAlign: "left" }} key={value} onClick={() => setTone(value)}><div><b>{tone === value && <DashboardIcon name="check" size={15} className={styles.inlineIcon} />}{title}</b><small>{text}</small></div></button>)}
        </div>
        <div className={styles.actions}>
          <label className={styles.field}><span><input name="collectName" type="checkbox" defaultChecked={agent?.collect_customer_name ?? true} /> Solicitar nombre cuando sea necesario</span></label>
          <label className={styles.field}><span><input name="collectPhone" type="checkbox" defaultChecked={agent?.collect_customer_phone ?? true} /> Solicitar teléfono cuando sea necesario</span></label>
        </div>
      </Card>

      <Card title="Acciones permitidas" description="Activa solo lo que el negocio realmente puede gestionar. Progy nunca debe prometer una acción que no está habilitada.">
        <div className={styles.formGrid}>
          {workspace.features.map((feature) => {
            const copy = featureCopy[feature.feature_code] || { title: feature.feature_code, text: "Capacidad del asistente." };
            return <label className={styles.listRow} key={feature.feature_code}><div><b>{copy.title}</b><small>{copy.text}</small></div><input type="checkbox" checked={Boolean(features[feature.feature_code])} onChange={(event) => setFeatures((current) => ({ ...current, [feature.feature_code]: event.target.checked }))} /></label>;
          })}
        </div>
        <div className={styles.actions}><button className={styles.primary} disabled={busy}>{busy ? "Guardando…" : "Guardar configuración"}</button></div>
      </Card>
    </form>
  </>;
}
