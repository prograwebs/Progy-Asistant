"use client";

import { FormEvent, useState } from "react";
import CatalogImport from "../CatalogImport";
import type { CatalogItem, SelectedWorkspace, WorkspaceAction } from "../types";
import { businessBlueprint, money } from "../utils";
import { Card, EmptyState, SectionHeader } from "../ui";
import styles from "../ProgyDashboard.module.css";

export default function CatalogSection({ workspace, action, onRefresh }: { workspace: SelectedWorkspace; action: WorkspaceAction; onRefresh: () => Promise<void> | void }) {
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bp = businessBlueprint(workspace.business.category_code);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await action({
        action: "saveCatalogItem",
        businessId: workspace.business.id,
        id: editing?.id,
        kind: form.get("kind"),
        name: form.get("name"),
        description: form.get("description"),
        price: form.get("price"),
        durationMinutes: form.get("duration"),
        stockQuantity: form.get("stock"),
        trackStock: form.get("trackStock") === "on",
        isAvailable: form.get("available") === "on",
      }, editing ? "Elemento actualizado." : "Elemento agregado al catálogo.");
      setShowForm(false);
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el elemento.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CatalogItem) {
    if (!window.confirm(`¿Eliminar ${item.name}?`)) return;
    setBusy(true);
    setError("");
    try {
      await action({ action: "deleteCatalogItem", businessId: workspace.business.id, id: item.id }, "Elemento eliminado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos eliminar el elemento.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <SectionHeader eyebrow="PRECIOS CONFIRMADOS" title={bp.catalog} description="Progy consulta esta información cuando un cliente pregunta por un producto o servicio. Los precios nunca se completan por suposición." />
    {error && <div className={styles.errorBanner}>{error}</div>}
    <div className={styles.grid}>
      <Card title="Catálogo" description={`${workspace.catalogItems.length} elementos configurados`} tag={workspace.business.currency || "USD"}>
        <div className={styles.actions} style={{ marginTop: 0, marginBottom: 18 }}>
          <button className={styles.primary} onClick={() => { setEditing(null); setShowForm(true); }}>＋ Agregar {bp.singular}</button>
        </div>

        {showForm && <form onSubmit={save} style={{ marginBottom: 18 }}>
          <div className={styles.formGrid}>
            <label className={styles.field}>Tipo<select className={styles.select} name="kind" defaultValue={editing?.kind || bp.defaultKind}><option value="product">Producto</option><option value="service">Servicio</option></select></label>
            <label className={styles.field}>Nombre<input className={styles.input} name="name" defaultValue={editing?.name || ""} required /></label>
            <label className={styles.field}>Precio<input className={styles.input} name="price" type="number" min="0" step="0.01" defaultValue={editing?.price ?? ""} required /></label>
            <label className={styles.field}>Duración (minutos)<input className={styles.input} name="duration" type="number" min="1" defaultValue={editing?.duration_minutes || ""} /></label>
            <label className={styles.field}>Existencias<input className={styles.input} name="stock" type="number" min="0" defaultValue={editing?.stock_quantity || ""} /></label>
            <label className={styles.field}><span><input name="trackStock" type="checkbox" defaultChecked={editing?.track_stock} /> Controlar existencias</span></label>
            <label className={`${styles.field} ${styles.full}`}>Descripción<textarea className={styles.textarea} name="description" defaultValue={editing?.description || ""} /></label>
            <label className={`${styles.field} ${styles.full}`}><span><input name="available" type="checkbox" defaultChecked={editing?.is_available ?? true} /> Disponible para clientes</span></label>
          </div>
          <div className={styles.actions}><button className={styles.primary} disabled={busy}>{busy ? "Guardando…" : "Guardar elemento"}</button><button type="button" className={styles.secondary} onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</button></div>
        </form>}

        {workspace.catalogItems.length ? <div className={styles.list}>{workspace.catalogItems.map((item) => <article className={styles.listRow} key={item.id}><div><b>{item.name}</b><small>{item.kind === "service" ? "Servicio" : "Producto"}{item.description ? ` · ${item.description}` : ""}{item.duration_minutes ? ` · ${item.duration_minutes} min` : ""}</small></div><div className={styles.listRowActions}><strong>{money(item.sale_price ?? item.price)}</strong><button className={styles.textButton} onClick={() => { setEditing(item); setShowForm(true); }}>Editar</button><button className={styles.textButton} style={{ color: "#ff8f9d" }} onClick={() => void remove(item)}>Eliminar</button></div></article>)}</div> : <EmptyState title="Tu catálogo está vacío" text="Agrega manualmente un elemento o importa una lista de precios para que Progy pueda responder con información real." />}
      </Card>

      <Card title="Carga rápida" description="Convierte un documento existente en elementos revisables del catálogo." tag="IA asistida">
        <CatalogImport businessId={workspace.business.id} onImported={onRefresh} />
      </Card>
    </div>
  </>;
}
