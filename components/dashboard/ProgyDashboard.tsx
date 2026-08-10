"use client";

import { useState } from "react";
import type { IntegrationStatus, PanelUser, SelectedWorkspace } from "./types";
import { useWorkspace } from "./useWorkspace";
import BusinessOnboarding from "./BusinessOnboarding";
import OverviewSection from "./sections/OverviewSection";
import BusinessSection from "./sections/BusinessSection";
import AgentSection from "./sections/AgentSection";
import CatalogSection from "./sections/CatalogSection";
import KnowledgeSection from "./sections/KnowledgeSection";
import VoiceSection from "./sections/VoiceSection";
import WhatsAppSection from "./sections/WhatsAppSection";
import { ConversationsSection, OrdersSection } from "./sections/RecordsSections";
import UsageSection from "./sections/UsageSection";
import VoiceTestStudio from "./VoiceTestStudio";
import { Card, SectionHeader } from "./ui";
import { initials } from "./utils";
import styles from "./ProgyDashboard.module.css";

type SectionId = "inicio" | "negocio" | "asistente" | "catalogo" | "conocimiento" | "voz" | "whatsapp" | "pruebas" | "conversaciones" | "pedidos" | "consumo" | "ajustes";

const nav: Array<{ id: SectionId; icon: string; label: string }> = [
  { id: "inicio", icon: "⌂", label: "Inicio" },
  { id: "negocio", icon: "▦", label: "Mi negocio" },
  { id: "asistente", icon: "◇", label: "Configurar Progy" },
  { id: "catalogo", icon: "□", label: "Catálogo" },
  { id: "conocimiento", icon: "▤", label: "Conocimiento" },
  { id: "voz", icon: "◖", label: "Voz e idioma" },
  { id: "pruebas", icon: "▷", label: "Pruebas" },
  { id: "whatsapp", icon: "◉", label: "WhatsApp" },
  { id: "conversaciones", icon: "☵", label: "Conversaciones" },
  { id: "pedidos", icon: "✓", label: "Pedidos y reservas" },
  { id: "consumo", icon: "◔", label: "Consumo y plan" },
];

const headers: Record<SectionId, string> = {
  inicio: "Inicio", negocio: "Mi negocio", asistente: "Configurar Progy", catalogo: "Catálogo",
  conocimiento: "Conocimiento", voz: "Voz e idioma", whatsapp: "WhatsApp", pruebas: "Pruebas",
  conversaciones: "Conversaciones", pedidos: "Pedidos y reservas", consumo: "Consumo y plan", ajustes: "Configuración",
};

export default function ProgyDashboard({ user, integrations }: { user: PanelUser; integrations: IntegrationStatus }) {
  const { snapshot, loading, error, notice, load, action } = useWorkspace();
  const [section, setSection] = useState<SectionId>("inicio");
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/acceso?mode=login";
  }

  function go(next: string) {
    setSection((headers[next as SectionId] ? next : "inicio") as SectionId);
    setMobileOpen(false);
  }

  if (loading && !snapshot) return <main className={styles.loading}><div><div className={styles.spinner} />Preparando tu espacio de trabajo…</div></main>;
  if (error && !snapshot) return <main className={styles.loading}><div><div className={styles.errorBanner}>{error}</div><button className={styles.primary} onClick={() => void load()}>Volver a intentar</button></div></main>;
  if (!snapshot) return null;
  if (!snapshot.selected) return <BusinessOnboarding user={user} categories={snapshot.categories} action={action} />;

  const workspace = snapshot.selected;
  const category = snapshot.categories.find((item) => item.code === workspace.business.category_code);
  const ready = Boolean(workspace.agent?.voice_id && workspace.catalogItems.length && workspace.hours.length);
  const workspaceKey = workspace.business.id;

  return <main className={styles.app}>
    {mobileOpen && <button aria-label="Cerrar menú" className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />}
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}>
      <div className={styles.brand}><span className={styles.brandMark}><i /><i /><i /></span>Progy</div>
      <div className={styles.businessSwitch}>
        <span className={styles.businessAvatar}>{initials(workspace.business.name)}</span>
        <div><b>{workspace.business.name}</b><small>{category?.name || "Negocio"} · {workspace.plan?.plan_code || workspace.business.status || "trial"}</small></div>
      </div>
      {snapshot.businesses.length > 1 && <select className={styles.businessSelect} value={workspace.business.id} onChange={(event) => void load(event.target.value)}>{snapshot.businesses.map((business) => <option value={business.id} key={business.id}>{business.name}</option>)}</select>}

      <nav className={styles.nav} aria-label="Panel de Progy">
        <div className={styles.navLabel}>TRABAJO</div>
        {nav.map((item) => <button key={item.id} className={section === item.id ? styles.active : ""} onClick={() => go(item.id)}><span className={styles.navIcon}>{item.icon}</span>{item.label}</button>)}
        <div className={styles.navLabel}>CUENTA</div>
        <button className={section === "ajustes" ? styles.active : ""} onClick={() => go("ajustes")}><span className={styles.navIcon}>⚙</span>Configuración</button>
      </nav>

      <div className={styles.user}>
        <span className={styles.userAvatar}>{initials(user.name)}</span>
        <div><b>{user.name}</b><small>{user.email}</small></div>
        <button className={styles.logout} onClick={() => void logout()}>Salir</button>
      </div>
    </aside>

    <section className={styles.main}>
      <header className={styles.topbar}>
        <div className={styles.topbarTitle}><small>PROGY · {workspace.business.name}</small><b>{headers[section]}</b></div>
        <div className={styles.topActions}>
          <span className={styles.statusPill}><i /> {ready ? "Asistente preparado" : "Configuración en progreso"}</span>
          <button className={styles.mobileButton} onClick={() => setMobileOpen(true)} aria-label="Abrir menú">☰</button>
        </div>
      </header>

      <div className={styles.content}>
        {notice && <div className={styles.notice}>{notice}</div>}
        {error && <div className={styles.errorBanner}>{error}</div>}
        {section === "inicio" && <OverviewSection workspace={workspace} onGo={go} />}
        {section === "negocio" && <BusinessSection key={`business-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "asistente" && <AgentSection key={`agent-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "catalogo" && <CatalogSection key={`catalog-${workspaceKey}`} workspace={workspace} action={action} onRefresh={() => load(workspace.business.id)} />}
        {section === "conocimiento" && <KnowledgeSection key={`knowledge-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "voz" && <VoiceSection key={`voice-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "whatsapp" && <WhatsAppSection key={`whatsapp-${workspaceKey}`} workspace={workspace} />}
        {section === "pruebas" && <><SectionHeader eyebrow="PRUEBA ANTES DE ACTIVAR" title="Habla con Progy" description="Esta prueba utiliza el conocimiento de tu negocio y responde con la voz que seleccionaste. Está limitada para mantener controlado el consumo." />{!integrations.openai || !integrations.elevenlabs ? <div className={styles.errorBanner}>La prueba hablada está temporalmente en mantenimiento. Inténtalo nuevamente más tarde.</div> : <VoiceTestStudio key={`test-${workspaceKey}`} workspace={workspace} onRefresh={() => load(workspace.business.id)} />}</>}
        {section === "conversaciones" && <ConversationsSection workspace={workspace} onGo={go} />}
        {section === "pedidos" && <OrdersSection workspace={workspace} />}
        {section === "consumo" && <UsageSection workspace={workspace} />}
        {section === "ajustes" && <SettingsSection user={user} workspace={workspace} integrations={integrations} />}
      </div>
    </section>
  </main>;
}

function SettingsSection({ user, workspace, integrations }: { user: PanelUser; workspace: SelectedWorkspace; integrations: IntegrationStatus }) {
  const serviceReady = integrations.supabase && integrations.openai && integrations.elevenlabs;
  return <>
    <SectionHeader eyebrow="TU CUENTA" title="Configuración" description="Información general del espacio de trabajo. Los detalles internos de proveedores y credenciales no se muestran en el panel de clientes." />
    <div className={styles.grid}>
      <Card className={styles.cardHalf} title="Cuenta" description="Sesión y negocio activo.">
        <div className={styles.list}>
          <div className={styles.listRow}><div><b>{user.name}</b><small>{user.email}</small></div></div>
          <div className={styles.listRow}><div><b>{workspace.business.name}</b><small>Negocio activo</small></div><strong>{workspace.plan?.plan_code || "trial"}</strong></div>
        </div>
      </Card>
      <Card className={styles.cardHalf} title="Estado del servicio" description="Progy comprueba internamente que todo lo necesario esté disponible.">
        <div className={styles.listRow}><div><b>{serviceReady ? "Todo listo para trabajar" : "Hay una configuración pendiente"}</b><small>{serviceReady ? "Puedes seguir configurando y realizando pruebas." : "Algunas funciones pueden estar temporalmente limitadas."}</small></div><strong>{serviceReady ? "✓" : "○"}</strong></div>
      </Card>
    </div>
  </>;
}
