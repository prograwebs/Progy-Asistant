"use client";

import { FormEvent, useState } from "react";
import type { Hour, SelectedWorkspace, WorkspaceAction } from "@/shared/types/workspace";
import { Card, SectionHeader } from "../ui";
import styles from "../ProgyDashboard.module.css";

const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function BusinessSection({ workspace, action }: { workspace: SelectedWorkspace; action: WorkspaceAction }) {
  const [hours, setHours] = useState<Hour[]>(workspace.hours);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("business");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await action({
        action: "updateBusiness",
        businessId: workspace.business.id,
        name: form.get("name"),
        description: form.get("description"),
        phone: form.get("phone"),
        whatsapp_phone: form.get("whatsapp"),
        email: form.get("email"),
        website_url: form.get("website"),
        address: form.get("address"),
        city: form.get("city"),
        province: form.get("province"),
      }, "Datos del negocio actualizados.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar los datos.");
    } finally {
      setBusy("");
    }
  }

  async function saveHours() {
    setBusy("hours");
    setError("");
    try {
      await action({ action: "saveHours", businessId: workspace.business.id, hours }, "Horario actualizado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el horario.");
    } finally {
      setBusy("");
    }
  }

  function changeHour(index: number, patch: Partial<Hour>) {
    setHours((current) => current.map((hour, itemIndex) => itemIndex === index ? { ...hour, ...patch } : hour));
  }

  return <>
    <SectionHeader eyebrow="LA INFORMACIÓN BASE" title="Mi negocio" description="Mantén aquí los datos que Progy utiliza para identificarse, orientar a tus clientes y saber cuándo está abierto el negocio." />
    {error && <div className={styles.errorBanner}>{error}</div>}
    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Identidad y contacto" description="Información visible y útil durante la atención.">
        <form onSubmit={saveBusiness}>
          <div className={styles.formGrid}>
            <label className={styles.field}>Nombre comercial<input className={styles.input} name="name" defaultValue={workspace.business.name} required /></label>
            <label className={styles.field}>Correo del negocio<input className={styles.input} name="email" type="email" defaultValue={workspace.business.email || ""} /></label>
            <label className={styles.field}>Teléfono<input className={styles.input} name="phone" defaultValue={workspace.business.phone || ""} /></label>
            <label className={styles.field}>WhatsApp<input className={styles.input} name="whatsapp" defaultValue={workspace.business.whatsapp_phone || ""} /></label>
            <label className={styles.field}>Ciudad<input className={styles.input} name="city" defaultValue={workspace.business.city || ""} /></label>
            <label className={styles.field}>Provincia<input className={styles.input} name="province" defaultValue={workspace.business.province || ""} /></label>
            <label className={`${styles.field} ${styles.full}`}>Dirección<input className={styles.input} name="address" defaultValue={workspace.business.address || ""} /></label>
            <label className={`${styles.field} ${styles.full}`}>Sitio web<input className={styles.input} name="website" type="url" defaultValue={workspace.business.website_url || ""} placeholder="https://" /></label>
            <label className={`${styles.field} ${styles.full}`}>Descripción<textarea className={styles.textarea} name="description" defaultValue={workspace.business.description || ""} placeholder="Qué ofrece tu negocio y cómo atiende a sus clientes." /></label>
          </div>
          <div className={styles.actions}><button className={styles.primary} disabled={busy === "business"}>{busy === "business" ? "Guardando…" : "Guardar datos"}</button></div>
        </form>
      </Card>

      <Card className={styles.cardHalf} title="Horario habitual" description="Progy solo afirmará que el negocio está abierto cuando el horario lo respalde.">
        <div className={styles.hours}>
          {hours.map((hour, index) => <div className={styles.hour} key={hour.day_of_week}>
            <b>{days[hour.day_of_week]}</b>
            <label><input type="checkbox" checked={!hour.is_closed} onChange={(event) => changeHour(index, { is_closed: !event.target.checked })} />{hour.is_closed ? "Cerrado" : "Abierto"}</label>
            <input className={styles.input} type="time" disabled={hour.is_closed} value={hour.opens_at?.slice(0, 5) || "08:00"} onChange={(event) => changeHour(index, { opens_at: event.target.value })} />
            <span>a</span>
            <input className={styles.input} type="time" disabled={hour.is_closed} value={hour.closes_at?.slice(0, 5) || "18:00"} onChange={(event) => changeHour(index, { closes_at: event.target.value })} />
          </div>)}
        </div>
        <div className={styles.actions}><button className={styles.primary} onClick={() => void saveHours()} disabled={busy === "hours"}>{busy === "hours" ? "Guardando…" : "Guardar horario"}</button></div>
      </Card>
    </div>
  </>;
}
