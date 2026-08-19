"use client";

import { useState, type FocusEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { IntegrationStatus, PanelUser, SelectedWorkspace } from "./types";
import { useWorkspace } from "./useWorkspace";
import OnboardingRedirect from "../onboarding/steps/OnboardingRedirect";
import OverviewSection from "./sections/OverviewSection";
import BusinessSection from "./sections/BusinessSection";
import AgentSection from "./sections/AgentSection";
import CatalogSection from "./sections/CatalogSection";
import KnowledgeSection from "./sections/KnowledgeSection";
import VoiceSection from "./sections/VoiceSection";
import WhatsAppSection from "./sections/WhatsAppSection";
import { ConversationsSection, OrdersSection } from "./sections/RecordsSections";
import UsageSection from "./sections/UsageSection";
import PreparationSection from "./sections/PreparationSection";
import VoiceTestStudio from "./VoiceTestStudio";
import { Card, SectionHeader } from "./ui";
import { initials } from "./utils";
import { DashboardIcon } from "./LineIcon";
import styles from "./ProgyDashboard.module.css";

type SectionId = "inicio" | "negocio" | "asistente" | "catalogo" | "conocimiento" | "voz" | "whatsapp" | "pruebas" | "conversaciones" | "pedidos" | "consumo" | "ajustes";

const nav: Array<{ id: SectionId; icon: Parameters<typeof DashboardIcon>[0]["name"]; label: string }> = [
  { id: "inicio", icon: "home", label: "Inicio" },
  { id: "negocio", icon: "business", label: "Mi negocio" },
  { id: "asistente", icon: "assistant", label: "Configurar Progy" },
  { id: "catalogo", icon: "catalog", label: "Catálogo" },
  { id: "conocimiento", icon: "knowledge", label: "Conocimiento" },
  { id: "voz", icon: "voice", label: "Voz e idioma" },
  { id: "pruebas", icon: "test", label: "Pruebas" },
  { id: "whatsapp", icon: "whatsapp", label: "WhatsApp" },
  { id: "conversaciones", icon: "conversation", label: "Conversaciones" },
  { id: "pedidos", icon: "orders", label: "Pedidos y reservas" },
  { id: "consumo", icon: "usage", label: "Consumo y plan" },
];

const headers: Record<SectionId, string> = {
  inicio: "Inicio", negocio: "Mi negocio", asistente: "Configurar Progy", catalogo: "Catálogo",
  conocimiento: "Conocimiento", voz: "Voz e idioma", whatsapp: "WhatsApp", pruebas: "Pruebas",
  conversaciones: "Conversaciones", pedidos: "Pedidos y reservas", consumo: "Consumo y plan", ajustes: "Configuración",
};

function planLabel(code?: string | null) {
  const normalized = String(code || "trial").toLowerCase().replaceAll("-", "_");
  if (["trial", "free_trial", "free"].includes(normalized)) return "Prueba";
  if (normalized === "business") return "Negocio";
  if (normalized === "pro") return "Pro";
  return code || "Prueba";
}

export default function ProgyDashboard({ user, integrations }: { user: PanelUser; integrations: IntegrationStatus }) {
  const router = useRouter();
  const { snapshot, loading, error, notice, load, action } = useWorkspace();
  const [section, setSection] = useState<SectionId>("inicio");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarTooltip, setSidebarTooltip] = useState<{ label: string; top: number } | null>(null);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/acceso?mode=login");
  }

  function go(next: string) {
    setSection((headers[next as SectionId] ? next : "inicio") as SectionId);
    setMobileOpen(false);
    setSidebarTooltip(null);
  }

  if (loading && !snapshot) return <main className={styles.loading}><div><div className={styles.spinner} />Preparando tu espacio de trabajo…</div></main>;
  if (error && !snapshot) return <main className={styles.loading}><div><div className={styles.errorBanner}>{error}</div><button className={styles.primary} onClick={() => void load()}>Volver a intentar</button></div></main>;
  if (!snapshot) return null;
  if (!snapshot.selected) return <OnboardingRedirect to="/onboarding/business" />;

  const workspace = snapshot.selected;
  const category = snapshot.categories.find((item) => item.code === workspace.business.category_code);
  const workspaceKey = workspace.business.id;
  const currentPlan = planLabel(workspace.plan?.plan_code || workspace.business.status);
  const isActive = workspace.business.status === "active" || workspace.onboarding?.activation_status === "active";
  const ready = isActive && Boolean(workspace.agent?.voice_id && workspace.catalogItems.length && workspace.hours.length);

  async function activate() {
    setActivating(true);
    setActivationError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", businessId: workspace.business.id }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No pudimos activar la atención.");
      await load(workspace.business.id);
    } catch (activationError) {
      setActivationError(activationError instanceof Error ? activationError.message : "No pudimos activar la atención.");
    } finally {
      setActivating(false);
    }
  }

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 820px)").matches) {
      setMobileOpen(false);
      return;
    }
    setSidebarTooltip(null);
    setSidebarCollapsed((collapsed) => !collapsed);
  }

  const isSidebarCollapsed = sidebarCollapsed && !mobileOpen;

  function showSidebarTooltip(event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>, label: string) {
    if (!isSidebarCollapsed) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setSidebarTooltip({ label, top: bounds.top + bounds.height / 2 });
  }

  const sidebarControlLabel = mobileOpen ? "Cerrar menú" : sidebarCollapsed ? "Expandir sidebar" : "Ocultar sidebar";

  return <main className={`${styles.app} ${isSidebarCollapsed ? styles.collapsed : ""}`}>
    {mobileOpen && <button aria-label="Cerrar menú" className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />}
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.brand}><span className={styles.brandMark}><i /><i /><i /></span><span className={styles.brandText}>Progy</span></div>
        <button
          className={styles.sidebarToggle}
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarControlLabel}
          aria-expanded={mobileOpen ? true : !sidebarCollapsed}
          title={sidebarControlLabel}
        >
          <span className={styles.collapseIcon} aria-hidden="true">{sidebarCollapsed ? "›" : "‹"}</span>
          <span className={styles.closeIcon} aria-hidden="true">×</span>
        </button>
      </div>
      <div className={styles.businessSwitch}>
        <span className={styles.businessAvatar}>{initials(workspace.business.name)}</span>
        <div className={styles.businessDetails}><b>{workspace.business.name}</b><small>{category?.name || "Negocio"} · {currentPlan}</small></div>
      </div>
      {snapshot.businesses.length > 1 && <select className={styles.businessSelect} value={workspace.business.id} onChange={(event) => void load(event.target.value)}>{snapshot.businesses.map((business) => <option value={business.id} key={business.id}>{business.name}</option>)}</select>}

      <nav className={styles.nav} aria-label="Panel de Progy">
        <div className={styles.navLabel}>TRABAJO</div>
        {nav.map((item) => <button key={item.id} className={section === item.id ? styles.active : ""} onClick={() => go(item.id)} aria-label={item.label} onMouseEnter={(event) => showSidebarTooltip(event, item.label)} onMouseLeave={() => setSidebarTooltip(null)} onFocus={(event) => showSidebarTooltip(event, item.label)} onBlur={() => setSidebarTooltip(null)}><span className={styles.navIcon}><DashboardIcon name={item.icon} /></span><span className={styles.navText}>{item.label}</span></button>)}
        <div className={styles.navLabel}>CUENTA</div>
        <button className={section === "ajustes" ? styles.active : ""} onClick={() => go("ajustes")} aria-label="Configuración" onMouseEnter={(event) => showSidebarTooltip(event, "Configuración")} onMouseLeave={() => setSidebarTooltip(null)} onFocus={(event) => showSidebarTooltip(event, "Configuración")} onBlur={() => setSidebarTooltip(null)}><span className={styles.navIcon}><DashboardIcon name="settings" /></span><span className={styles.navText}>Configuración</span></button>
      </nav>
      {isSidebarCollapsed && sidebarTooltip && <div className={styles.sidebarTooltip} role="tooltip" style={{ top: sidebarTooltip.top }}>{sidebarTooltip.label}</div>}

      <div className={styles.user}>
        <span className={styles.userAvatar}>{initials(user.name)}</span>
        <div className={styles.userDetails}><b>{user.name}</b><small>{user.email}</small></div>
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
        {activationError && <div className={styles.errorBanner} role="alert">{activationError}</div>}
        {section === "inicio" && !isActive && workspace.readiness && <PreparationSection workspace={workspace} readiness={workspace.readiness} onGo={go} onActivate={activate} activating={activating} />}
        {section === "inicio" && isActive && <OverviewSection workspace={workspace} onGo={go} />}
        {section === "negocio" && <BusinessSection key={`business-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "asistente" && <AgentSection key={`agent-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "catalogo" && <CatalogSection key={`catalog-${workspaceKey}`} workspace={workspace} action={action} onRefresh={() => load(workspace.business.id)} />}
        {section === "conocimiento" && <KnowledgeSection key={`knowledge-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "voz" && <VoiceSection key={`voice-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "whatsapp" && <WhatsAppSection key={`whatsapp-${workspaceKey}`} workspace={workspace} />}
        {section === "pruebas" && <><SectionHeader eyebrow="PRUEBA ANTES DE ACTIVAR" title="Habla con Progy" description="Prueba el conocimiento y la voz del negocio. Cada turno registra su consumo para que podamos medir el costo real durante esta etapa de validación." />{!integrations.openai || !integrations.elevenlabs ? <div className={styles.errorBanner}>La prueba hablada está temporalmente en mantenimiento. Inténtalo nuevamente más tarde.</div> : <VoiceTestStudio key={`test-${workspaceKey}`} workspace={workspace} onRefresh={() => load(workspace.business.id)} />}</>}
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
          <div className={styles.listRow}><div><b>{workspace.business.name}</b><small>Negocio activo</small></div><strong>{planLabel(workspace.plan?.plan_code || workspace.business.status)}</strong></div>
        </div>
      </Card>
      <Card className={styles.cardHalf} title="Estado del servicio" description="Progy comprueba internamente que todo lo necesario esté disponible.">
        <div className={styles.listRow}><div><b>{serviceReady ? "Todo listo para trabajar" : "Hay una configuración pendiente"}</b><small>{serviceReady ? "Puedes seguir configurando y realizando pruebas." : "Algunas funciones pueden estar temporalmente limitadas."}</small></div><strong><DashboardIcon name={serviceReady ? "check" : "pending"} size={17} /></strong></div>
      </Card>
    </div>
  </>;
}
