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
  const available = Boolean(appId && configId);

  async function connect() {
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
      setMessage("WhatsApp quedó autorizado. Cuando la conexión para clientes esté habilitada, Progy podrá usar este canal sin pasos técnicos adicionales.");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "No pudimos conectar WhatsApp.";
      setError(/registrar clientes|onboard|access verification/i.test(text)
        ? "La conexión para nuevos negocios todavía está siendo habilitada. No necesitas cambiar nada en Progy; vuelve a intentarlo cuando la revisión termine."
        : text);
    } finally {
      setConnecting(false);
    }
  }

  return <>
    <SectionHeader eyebrow="UN CANAL MÁS PARA TU ASISTENTE" title="WhatsApp" description="La conexión se realiza desde una sola pantalla. El negocio no necesita copiar tokens, identificadores ni aprender herramientas técnicas." />
    {error && <div className={styles.errorBanner}>{error}</div>}
    {message && <div className={styles.notice}>{message}</div>}
    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Conectar el WhatsApp del negocio" description={`Cuenta para ${workspace.business.name}`} tag={connection?.wabaId ? "Autorizado" : available ? "Preparado" : "En preparación"}>
        {connection?.wabaId ? <div className={styles.list}><div className={styles.listRow}><div><b>{connection.verifiedName || connection.wabaName || workspace.business.name}</b><small>{connection.phoneNumber || "Número autorizado"}</small></div><strong>✓</strong></div><div className={styles.listRow}><div><b>{connection.isOnBizApp ? "WhatsApp Business conservado" : "Canal autorizado"}</b><small>El negocio conserva una experiencia simple; los detalles técnicos quedan internos.</small></div></div></div> : <div className={styles.empty}><div><b>{available ? "Listo para autorizar cuando Meta habilite el acceso" : "Conexión en preparación"}</b><p>La configuración del negocio y del asistente puede continuar aunque WhatsApp todavía esté pendiente.</p></div></div>}
        <div className={styles.actions}><button className={styles.primary} disabled={!available || connecting} onClick={() => void connect()}>{connecting ? "Abriendo WhatsApp…" : connection?.wabaId ? "Volver a autorizar" : "Conectar WhatsApp"}</button></div>
      </Card>

      <Card className={styles.cardHalf} title="Qué podrá hacer Progy" description="Estas funciones se activarán sobre el mismo conocimiento del negocio.">
        <div className={styles.list}>
          <div className={styles.listRow}><div><b>Responder mensajes</b><small>Consultas de productos, servicios, horarios y políticas.</small></div><strong>01</strong></div>
          <div className={styles.listRow}><div><b>Enviar información útil</b><small>Catálogos, resúmenes y confirmaciones cuando corresponda.</small></div><strong>02</strong></div>
          <div className={styles.listRow}><div><b>Registrar resultados</b><small>Pedidos, citas y reservas visibles en el mismo panel.</small></div><strong>03</strong></div>
        </div>
      </Card>
    </div>
  </>;
}
