"use client";

import { FormEvent, useState } from "react";
import type { KnowledgeItem, SelectedWorkspace, WorkspaceAction } from "@/lib/shared/types/workspace";
import { Card, EmptyState, SectionHeader } from "../ui";
import styles from "../ProgyDashboard.module.css";

export default function KnowledgeSection({ workspace, action }: { workspace: SelectedWorkspace; action: WorkspaceAction }) {
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await action({
        action: "saveKnowledge",
        businessId: workspace.business.id,
        id: editing?.id,
        kind: form.get("kind"),
        title: form.get("title"),
        question: form.get("question"),
        answer: form.get("answer"),
        isActive: true,
      }, editing ? "Información actualizada." : "Información agregada.");
      setShowForm(false);
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar la información.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: KnowledgeItem) {
    if (!window.confirm(`¿Eliminar “${item.title}”?`)) return;
    setBusy(true);
    setError("");
    try {
      await action({ action: "deleteKnowledge", businessId: workspace.business.id, id: item.id }, "Información eliminada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos eliminar la información.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <SectionHeader eyebrow="LO QUE PROGY SABE" title="Conocimiento" description="Guarda políticas, formas de pago, respuestas frecuentes e instrucciones que no pertenecen al catálogo. Progy usa solo lo confirmado para este negocio." />
    {error && <div className={styles.errorBanner}>{error}</div>}
    <div className={styles.grid}>
      <Card title="Información del negocio" description={`${workspace.knowledge.length} respuestas y reglas guardadas`}>
        <div className={styles.actions} style={{ marginTop: 0, marginBottom: 18 }}><button className={styles.primary} onClick={() => { setEditing(null); setShowForm(true); }}>＋ Agregar información</button></div>
        {showForm && <form onSubmit={save} style={{ marginBottom: 18 }}>
          <div className={styles.formGrid}>
            <label className={styles.field}>Tipo<select className={styles.select} name="kind" defaultValue={editing?.kind || "faq"}><option value="faq">Pregunta frecuente</option><option value="policy">Política</option><option value="payment_method">Forma de pago</option><option value="location">Ubicación</option><option value="instruction">Instrucción de atención</option><option value="other">Otra información</option></select></label>
            <label className={styles.field}>Título<input className={styles.input} name="title" defaultValue={editing?.title || ""} required placeholder="Ej.: Formas de pago" /></label>
            <label className={`${styles.field} ${styles.full}`}>Pregunta habitual (opcional)<input className={styles.input} name="question" defaultValue={editing?.question || ""} placeholder="Ej.: ¿Aceptan transferencia?" /></label>
            <label className={`${styles.field} ${styles.full}`}>Respuesta confirmada<textarea className={styles.textarea} name="answer" defaultValue={editing?.answer || ""} required /></label>
          </div>
          <div className={styles.actions}><button className={styles.primary} disabled={busy}>{busy ? "Guardando…" : "Guardar información"}</button><button type="button" className={styles.secondary} onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</button></div>
        </form>}

        {workspace.knowledge.length ? <div className={styles.list}>{workspace.knowledge.map((item) => <article className={styles.listRow} key={item.id}><div><b>{item.title}</b><small>{item.question ? `${item.question} · ` : ""}{item.answer}</small></div><div className={styles.listRowActions}><button className={styles.textButton} onClick={() => { setEditing(item); setShowForm(true); }}>Editar</button><button className={styles.textButton} style={{ color: "#ff8f9d" }} onClick={() => void remove(item)}>Eliminar</button></div></article>)}</div> : <EmptyState title="Aún no has agregado conocimiento" text="Incluye políticas, pagos, preguntas frecuentes y cualquier respuesta que quieras mantener consistente." />}
      </Card>
    </div>
  </>;
}
