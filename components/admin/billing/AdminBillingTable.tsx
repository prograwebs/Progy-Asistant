"use client";

import { useState } from "react";
import type { BillingInvoice } from "@/lib/server/billing/invoices";
import styles from "./billing.module.css";

function money(value: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminBillingTable({ initialInvoices }: { initialInvoices: BillingInvoice[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function registerPayment(invoiceId: string) {
    setBusyId(invoiceId);
    setError("");
    try {
      const response = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, method, reference }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No pudimos registrar el pago.");
      setInvoices((current) => current.filter((invoice) => invoice.id !== invoiceId));
      setReference("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos registrar el pago.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.toolbar}>
        <div>
          <h2>Facturas pendientes</h2>
          <p>{invoices.length ? `${invoices.length} pendiente${invoices.length === 1 ? "" : "s"}` : "No hay facturas pendientes."}</p>
        </div>
        <div className={styles.controls}>
          <label>
            Método
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="bank_transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label>
            Referencia
            <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Opcional" maxLength={160} />
          </label>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {invoices.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr><th>Negocio</th><th>Período</th><th>Consumo</th><th>Total</th><th /></tr>
            </thead>
            <tbody className={styles.tableBody}>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.business?.name || invoice.business?.legal_name || "Negocio"}</strong><small>{invoice.business?.billing_email || invoice.business?.email || "Sin correo"}</small></td>
                  <td>{date(invoice.period_starts_at)} – {date(invoice.period_ends_at)}</td>
                  <td>{money(invoice.usage_cost_usd)}{invoice.overage_amount_usd > 0 && <small>Excedente: {money(invoice.overage_amount_usd)}</small>}</td>
                  <td><strong>{money(invoice.total_amount_usd)}</strong></td>
                  <td><button className={styles.payButton} type="button" disabled={busyId !== null} onClick={() => void registerPayment(invoice.id)}>{busyId === invoice.id ? "Registrando…" : "Marcar pagada"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
