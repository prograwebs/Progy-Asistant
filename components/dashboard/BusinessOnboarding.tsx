"use client";

import { FormEvent, useState } from "react";
import type { Category, PanelUser, WorkspaceAction } from "./types";
import styles from "./ProgyDashboard.module.css";

interface BusinessOnboardingProps {
  user: PanelUser;
  categories: Category[];
  action: WorkspaceAction;
}

export default function BusinessOnboarding({
  user,
  categories,
  action,
}: BusinessOnboardingProps) {
  const [categoryCode, setCategoryCode] = useState(categories[0]?.code || "other");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    if (!categoryCode) {
      setError("No pudimos cargar las categorías del negocio. Recarga la página e inténtalo nuevamente.");
      setBusy(false);
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      await action({
        action: "createBusiness",
        categoryCode,
        name: form.get("name"),
        description: form.get("description"),
        phone: form.get("phone"),
        whatsappPhone: form.get("whatsapp"),
        websiteUrl: form.get("website"),
        city: form.get("city"),
        province: form.get("province"),
        address: form.get("address"),
      }, "Tu negocio ya está listo para configurar.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos crear el negocio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.onboarding}>
      <form className={styles.onboardingCard} onSubmit={submit}>
        <div className={styles.eyebrow}>BIENVENIDO A PROGY</div>
        <h1>Configuremos tu primer negocio</h1>
        <p>Hola {user.name}. Elige la actividad que más se parece a tu negocio. Progy adaptará la configuración, el catálogo y las acciones que puede realizar.</p>

        <div className={styles.categories}>
          {categories.length ? categories.map((category) => (
            <button
              type="button"
              key={category.code}
              className={`${styles.category} ${categoryCode === category.code ? styles.selected : ""}`}
              onClick={() => setCategoryCode(category.code)}
            >
              <b>{category.name}</b>
              <small>{category.description || "Configura la atención según tu negocio."}</small>
            </button>
          )) : (
            <div className={styles.errorBanner} role="alert">
              No pudimos cargar las categorías del negocio. Recarga la página e inténtalo nuevamente.
            </div>
          )}
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>Nombre comercial<input className={styles.input} name="name" required placeholder="Ej.: Café Horizonte" /></label>
          <label className={styles.field}>Teléfono<input className={styles.input} name="phone" placeholder="+593..." /></label>
          <label className={styles.field}>WhatsApp<input className={styles.input} name="whatsapp" placeholder="+593..." /></label>
          <label className={styles.field}>Sitio web<input className={styles.input} name="website" type="url" placeholder="https://" /></label>
          <label className={styles.field}>Ciudad<input className={styles.input} name="city" placeholder="Quito" /></label>
          <label className={styles.field}>Provincia<input className={styles.input} name="province" placeholder="Pichincha" /></label>
          <label className={`${styles.field} ${styles.full}`}>Dirección<input className={styles.input} name="address" /></label>
          <label className={`${styles.field} ${styles.full}`}>Cuéntanos qué ofrece tu negocio<textarea className={styles.textarea} name="description" placeholder="Describe brevemente tus productos, servicios y tipo de atención." /></label>
        </div>
        {error && <div className={styles.errorBanner}>{error}</div>}
        <div className={styles.actions}>
          <button className={styles.primary} disabled={busy || !categoryCode}>{busy ? "Creando negocio…" : "Crear mi Progy"}</button>
        </div>
      </form>
    </main>
  );
}
