"use client";

import { useState } from "react";
import type { SelectedWorkspace } from "../types";
import { dateTime, money } from "../utils";
import { Card, EmptyState, SectionHeader } from "../ui";
import { ConversationInbox } from "../conversations/ConversationInbox";
import { statusLabel } from "../conversations/conversation-utils";
import styles from "../ProgyDashboard.module.css";

export function ConversationsSection({
  workspace,
  onGo,
  onRefresh,
}: {
  workspace: SelectedWorkspace;
  onGo: (section: string) => void;
  onRefresh: () => Promise<unknown>;
}) {
  return <>
    
    <ConversationInbox workspace={workspace} onRefresh={onRefresh} />
    {!workspace.conversations.length && <div className={styles.actions}><button className={styles.primary} onClick={() => onGo("pruebas")}>Realizar una prueba</button></div>}
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
