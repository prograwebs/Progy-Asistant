"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SelectedWorkspace } from "../types";
import { dateTime, money } from "../utils";
import { Card, EmptyState, SectionHeader } from "../ui";
import styles from "../ProgyDashboard.module.css";

function statusLabel(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  const labels: Record<string, string> = {
    active: "En curso",
    completed: "Completada",
    failed: "Fallida",
    pending: "Pendiente",
    confirmed: "Confirmado",
    cancelled: "Cancelado",
    canceled: "Cancelado",
    processing: "En proceso",
    ready: "Listo",
    delivered: "Entregado",
  };
  return labels[normalized] || status || "Sin estado";
}

type WhatsAppMessage = {
  id: string;
  providerMessageId: string;
  direction: "inbound" | "outbound";
  messageType: string;
  text: string | null;
  status: string;
  createdAt: string;
};

type WhatsAppMessagesResponse = {
  error?: string;
  messages?: WhatsAppMessage[];
};

export function ConversationsSection({
  workspace,
  onGo,
  onRefresh,
}: {
  workspace: SelectedWorkspace;
  onGo: (section: string) => void;
  onRefresh: () => Promise<unknown>;
}) {
  const whatsappConversations = workspace.conversations.filter(
    (conversation) => conversation.channel === "whatsapp_chat",
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    whatsappConversations[0]?.id || null,
  );
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [manualText, setManualText] = useState("");
  const [messageError, setMessageError] = useState("");

  const effectiveSelectedId = selectedId || whatsappConversations[0]?.id || null;
  const selectedConversation = workspace.conversations.find(
    (conversation) => conversation.id === effectiveSelectedId,
  );

  async function loadMessages(conversationId = selectedId) {
    if (!conversationId || selectedConversation?.channel !== "whatsapp_chat") {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setMessageError("");
    try {
      const response = await fetch(
        `/api/whatsapp/messages?businessId=${encodeURIComponent(
          workspace.business.id,
        )}&conversationId=${encodeURIComponent(conversationId)}`,
        { cache: "no-store" },
      );
      const result = await response.json().catch(() => ({})) as WhatsAppMessagesResponse;
      if (!response.ok) throw new Error(result.error || "No pudimos cargar los mensajes.");
      setMessages(result.messages || []);
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "No pudimos cargar los mensajes.");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (effectiveSelectedId && workspace.conversations.some((conversation) => conversation.id === effectiveSelectedId)) {
      // This effect synchronizes the selected conversation with the server; state updates happen in the fetch callbacks.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadMessages(effectiveSelectedId);
    }
    // Conversation updates are intentionally driven by the refresh button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSelectedId, workspace.business.id, workspace.conversations.length]);

  async function refresh() {
    setRefreshing(true);
    setMessageError("");
    try {
      await onRefresh();
      await loadMessages();
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "No pudimos actualizar las conversaciones.");
    } finally {
      setRefreshing(false);
    }
  }

  async function sendManualMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectiveSelectedId || !manualText.trim() || selectedConversation?.channel !== "whatsapp_chat") return;

    setSending(true);
    setMessageError("");
    try {
      const response = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: workspace.business.id,
          conversationId: effectiveSelectedId,
          text: manualText.trim(),
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos enviar la respuesta.");
      setManualText("");
      await loadMessages(effectiveSelectedId);
      await onRefresh();
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "No pudimos enviar la respuesta.");
    } finally {
      setSending(false);
    }
  }

  return <>
    <SectionHeader eyebrow="HISTORIAL DEL NEGOCIO" title="Conversaciones" description="Cada conversación queda asociada únicamente al negocio activo. En WhatsApp puedes revisar los mensajes y responder manualmente si la IA necesita apoyo." />
    <div className={styles.grid}>
      <Card title="Conversaciones recientes" description={`${workspace.conversations.length} registros cargados`}>
        <div className={styles.actions} style={{ marginBottom: 14 }}>
          <button className={styles.secondary} type="button" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? "Actualizando…" : "Actualizar conversaciones"}
          </button>
        </div>
        {workspace.conversations.length ? <div className={styles.records}>{workspace.conversations.map((row) => <button
          type="button"
          className={styles.record}
          key={row.id}
          onClick={() => setSelectedId(row.id)}
          aria-pressed={effectiveSelectedId === row.id}
          style={{
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            border: effectiveSelectedId === row.id ? "1px solid rgba(120,220,190,.75)" : undefined,
          }}
        ><b>{row.channel === "web_voice" ? "VOZ WEB" : row.channel.replaceAll("_", " ").toUpperCase()}</b><div><strong>{row.customer_name || row.customer_phone || "Cliente sin identificar"}</strong><small>{row.summary || row.outcome || "Sin resumen registrado"}</small></div><span>{dateTime(row.started_at)}</span><em>{statusLabel(row.status)}</em></button>)}</div> : <EmptyState title="Aún no hay conversaciones" text="Envía un WhatsApp al número conectado para crear la primera conversación." />}
        {!workspace.conversations.length && <div className={styles.actions}><button className={styles.primary} onClick={() => onGo("pruebas")}>Realizar una prueba</button></div>}
      </Card>
    </div>
    {selectedConversation?.channel === "whatsapp_chat" && <div className={styles.grid} style={{ marginTop: 18 }}>
      <Card
        title={`WhatsApp · ${selectedConversation.customer_name || selectedConversation.customer_phone || "Cliente"}`}
        description="Mensajes recibidos, respuestas de Progy y mensajes enviados desde WhatsApp Business App."
      >
        {messageError && <div className={styles.errorBanner}>{messageError}</div>}
        {loadingMessages ? <div className={styles.empty}><p>Cargando mensajes…</p></div> : messages.length ? <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
          {messages.map((message) => <div key={message.id} style={{ display: "grid", gap: 4, justifyItems: message.direction === "outbound" ? "end" : "start" }}>
            <div style={{ maxWidth: "82%", padding: "10px 12px", borderRadius: 12, background: message.direction === "outbound" ? "rgba(120,220,190,.14)" : "rgba(255,255,255,.07)" }}>
              <b style={{ display: "block", fontSize: 12, marginBottom: 4 }}>{message.direction === "outbound" ? "Progy / negocio" : "Cliente"}</b>
              <span>{message.text || `[${message.messageType}]`}</span>
              <small style={{ display: "block", marginTop: 5, opacity: .65 }}>{dateTime(message.createdAt)} · {statusLabel(message.status)}</small>
            </div>
          </div>)}
        </div> : <div className={styles.empty}><p>Aún no hay mensajes guardados para esta conversación.</p></div>}
        <form onSubmit={(event) => void sendManualMessage(event)} style={{ display: "grid", gap: 10 }}>
          <label className={styles.field}>
            Respuesta manual
            <textarea
              value={manualText}
              onChange={(event) => setManualText(event.target.value.slice(0, 4096))}
              placeholder="Escribe una respuesta de respaldo…"
              rows={3}
              className={styles.textarea}
              disabled={sending}
            />
          </label>
          <div className={styles.actions}>
            <button className={styles.primary} type="submit" disabled={sending || !manualText.trim()}>
              {sending ? "Enviando…" : "Enviar respuesta manual"}
            </button>
          </div>
        </form>
      </Card>
    </div>}
  </>;
}

export function OrdersSection({ workspace }: { workspace: SelectedWorkspace }) {
  const [tab, setTab] = useState<"orders" | "bookings">(workspace.orders.length || !workspace.bookings.length ? "orders" : "bookings");
  const orderTotal = workspace.orders.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const pending = workspace.orders.filter((row) => row.status === "pending").length + workspace.bookings.filter((row) => row.status === "pending").length;

  return <>
    <SectionHeader eyebrow="RESULTADOS DE LAS CONVERSACIONES" title="Pedidos y reservas" description="Cuando Progy confirma una acción con el cliente, el resultado queda registrado aquí para que tu equipo pueda continuar." />
    <div className={styles.metricGrid}>
      <article className={styles.metric}><small>Pedidos</small><b>{workspace.orders.length}</b><span>Registros recientes</span></article>
      <article className={styles.metric}><small>Reservas y citas</small><b>{workspace.bookings.length}</b><span>Registros recientes</span></article>
      <article className={styles.metric}><small>Pendientes</small><b>{pending}</b><span>Requieren seguimiento</span></article>
      <article className={styles.metric}><small>Valor de pedidos</small><b>{money(orderTotal)}</b><span>Total registrado</span></article>
    </div>
    <div className={styles.grid}>
      <Card>
        <div className={styles.tabs}><button className={tab === "orders" ? styles.active : ""} onClick={() => setTab("orders")}>Pedidos ({workspace.orders.length})</button><button className={tab === "bookings" ? styles.active : ""} onClick={() => setTab("bookings")}>Reservas y citas ({workspace.bookings.length})</button></div>
        {tab === "orders" ? (workspace.orders.length ? <div className={styles.records}>{workspace.orders.map((row) => <article className={styles.record} key={row.id}><b>#{row.order_number || "—"}</b><div><strong>{row.customer_name || "Cliente"}</strong><small>{row.fulfillment === "delivery" ? "Entrega" : row.fulfillment === "pickup" ? "Retiro" : row.fulfillment}</small></div><span>{money(row.total)}</span><em>{statusLabel(row.status)}</em></article>)}</div> : <EmptyState title="Aún no hay pedidos" text="Los pedidos confirmados durante una conversación aparecerán aquí automáticamente." />) : (workspace.bookings.length ? <div className={styles.records}>{workspace.bookings.map((row) => <article className={styles.record} key={row.id}><b>{row.type === "appointment" ? "CITA" : "RESERVA"}</b><div><strong>{row.customer_name || "Cliente"}</strong><small>{row.resource_name || (row.party_size ? `${row.party_size} personas` : "Solicitud registrada")}</small></div><span>{dateTime(row.starts_at)}</span><em>{statusLabel(row.status)}</em></article>)}</div> : <EmptyState title="Aún no hay reservas o citas" text="Cuando Progy confirme una reserva o cita, quedará registrada aquí." />)}
      </Card>
    </div>
  </>;
}
