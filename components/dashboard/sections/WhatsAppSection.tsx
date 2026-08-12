"use client";

import { useState } from "react";
import type { SelectedWorkspace } from "../types";
import { launchWhatsAppSignup } from "../metaSignup";
import { Card, SectionHeader } from "../ui";
import styles from "../ProgyDashboard.module.css";

type Connection = {
  wabaId?: string | null;
  wabaName?: string | null;
  phoneNumberId?: string | null;
  phoneNumber?: string | null;
  verifiedName?: string | null;
  isOnBizApp?: boolean;
};

export default function WhatsAppSection({ workspace }: { workspace: SelectedWorkspace }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [connection, setConnection] = useState<Connection | null>(null);
  const appId = process.env.NEXT_PUBLIC_META_APP_ID || "";
  const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID || "";
  const featureEnabled = process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true";
  const available = featureEnabled && Boolean(appId && configId);

  async function connect() {
    if (!available) return;
    setConnecting(true);
    setError("");
    setMessage("");
    try {
      const signup = await launchWhatsAppSignup(appId, configId);
      setMessage("Autorización recibida. Estamos comprobando el número seleccionado…");
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: signup.code,
          wabaId: signup.wabaId,
          phoneNumberId: signup.phoneNumberId,
          businessId: signup.businessId,
          progyBusinessId: workspace.business.id,
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; meta?: Connection };
      if (!response.ok) throw new Error(result.error || "No pudimos terminar la conexión de WhatsApp.");
      setConnection(result.meta || null);
      setMessage("WhatsApp quedó autorizado para este negocio.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos conectar WhatsApp.");
    } finally {
      setConnecting(false);
    }
  }

  const statusTag = connection?.wabaId ? "Autorizado" : available ? "Preparado" : "En revisión";

  return <>
    <SectionHeader eyebrow="UN CANAL MÁS PARA TU ASISTENTE" title="WhatsApp" description="La conexión se realizará desde una sola pantalla. El negocio no tendrá que copiar credenciales ni aprender configuraciones técnicas." />
    {error && <div className={styles.errorBanner}>{error}</div>}
    {message && <div className={styles.notice}>{message}</div>}
    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Conectar el WhatsApp del negocio" description={`Cuenta para ${workspace.business.name}`} tag={statusTag}>
        {connection?.wabaId ? <div className={styles.list}><div className={styles.listRow}><div><b>{connection.verifiedName || connection.wabaName || workspace.business.name}</b><small>{connection.phoneNumber || "Número autorizado"}</small></div><strong>✓</strong></div><div className={styles.listRow}><div><b>{connection.isOnBizApp ? "WhatsApp Business conservado" : "Canal autorizado"}</b><small>La conexión quedó asociada al negocio activo.</small></div></div></div> : <div className={styles.empty}><div><b>{available ? "Listo para autorizar" : "Canal en revisión"}</b><p>{available ? "Autoriza la cuenta del negocio cuando quieras habilitar el canal." : "Puedes terminar de configurar y probar Progy. Activaremos esta conexión cuando la revisión externa esté finalizada."}</p></div></div>}
        <div className={styles.actions}><button className={styles.primary} disabled={!available || connecting} onClick={() => void connect()}>{connecting ? "Abriendo WhatsApp…" : connection?.wabaId ? "Volver a autorizar" : available ? "Conectar WhatsApp" : "Disponible próximamente"}</button></div>
      </Card>

      <Card className={styles.cardHalf} title="Qué podrá hacer Progy" description="El canal utilizará el mismo conocimiento y las mismas reglas que ya configuraste.">
        <div className={styles.list}>
          <div className={styles.listRow}><div><b>Responder mensajes</b><small>Consultas de productos, servicios, horarios y políticas.</small></div><strong>01</strong></div>
          <div className={styles.listRow}><div><b>Enviar información útil</b><small>Confirmaciones y datos relevantes cuando corresponda.</small></div><strong>02</strong></div>
          <div className={styles.listRow}><div><b>Registrar resultados</b><small>Pedidos, citas y reservas visibles en el mismo panel.</small></div><strong>03</strong></div>
        </div>
      </Card>
    </div>
  </>;
}
