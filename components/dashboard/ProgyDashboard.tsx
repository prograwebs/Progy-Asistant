"use client";

import { useState } from "react";
import { useWorkspace } from "@/hooks/dashboard/useWorkspace";
import OnboardingRedirect from "../onboarding/steps/OnboardingRedirect";
import OverviewSection from "./sections/OverviewSection";
import BusinessSection from "./sections/BusinessSection";
import CatalogSection from "./sections/CatalogSection";
import KnowledgeSection from "./sections/KnowledgeSection";
import WhatsAppSection from "./sections/WhatsAppSection";
import { ConversationsSection, OrdersSection } from "./sections/RecordsSections";
import UsageSection from "./sections/UsageSection";
import PreparationSection from "./sections/PreparationSection";
import VoiceTestStudio from "./voice/VoiceTestStudio";
import ProgySection from "./sections/ProgySection";
import SettingsSection from "./sections/SettingsSection";
import { SectionHeader } from "./ui";
import { onboardingPathForStatus } from "@/lib/shared/onboarding/paths";
import styles from "./ProgyDashboard.module.css";
import PrivateSessionGuard from "../auth/PrivateSessionGuard";
import { logout as logoutSession } from "@/lib/client/services/auth";
import Sidebar from "./navigation/Sidebar";
import { dashboardHeaders, planLabel, resolveDashboardNavigation } from "./navigation/legacy";
import type { DashboardSectionId, ProgyTab } from "./navigation/types";
import type { ProgyDashboardProps } from "./types/dashboard";

export default function ProgyDashboard({ user, integrations }: ProgyDashboardProps) {
  const { snapshot, loading, error, notice, load, action } = useWorkspace();
  const [section, setSection] = useState<DashboardSectionId>("inicio");
  const [progyTab, setProgyTab] = useState<ProgyTab>("personalidad");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");

  async function logout() {
    await logoutSession();
    window.location.replace("/acceso?mode=login");
  }

  function go(next: string) {
    const target = resolveDashboardNavigation(next);
    setSection(target.section);
    if (target.progyTab) setProgyTab(target.progyTab);
    setMobileOpen(false);
  }

  if (loading && !snapshot) return <main className={styles.loading}><div><div className={styles.spinner} />Preparando tu espacio de trabajo…</div></main>;
  if (error && !snapshot) return <main className={styles.loading}><div><div className={styles.errorBanner}>{error}</div><button className={styles.primary} onClick={() => void load()}>Volver a intentar</button></div></main>;
  if (!snapshot) return null;
  if (!snapshot.selected) return <OnboardingRedirect to="/onboarding/business" />;

  const workspace = snapshot.selected;
  const onboardingPath = onboardingPathForStatus(String(workspace.onboarding?.flow_status || ""), true);
  if (onboardingPath !== "/panel") return <OnboardingRedirect to={onboardingPath} />;
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
    setSidebarCollapsed((collapsed) => !collapsed);
  }

  const isSidebarCollapsed = sidebarCollapsed && !mobileOpen;

  return <main className={`${styles.app} ${isSidebarCollapsed ? styles.collapsed : ""}`}>
    <PrivateSessionGuard />
    <Sidebar
      user={user}
      workspace={workspace.business}
      categoryName={category?.name}
      currentPlan={currentPlan}
      businesses={snapshot.businesses}
      mobileOpen={mobileOpen}
      sidebarCollapsed={sidebarCollapsed}
      onToggle={toggleSidebar}
      onCloseMobile={() => setMobileOpen(false)}
      onWorkspaceChange={(businessId) => void load(businessId)}
      onLogout={() => void logout()}
    />

    <section className={`${styles.main} ${section === "conversaciones" ? styles.conversationsMain : ""}`}>
      <header className={styles.topbar}>
        <div className={styles.topbarTitle}><small>PROGY · {workspace.business.name}</small><b>{dashboardHeaders[section]}</b></div>
        <div className={styles.topActions}>
          <span className={styles.statusPill}><i /> {ready ? "Asistente preparado" : "Configuración en progreso"}</span>
          <button type="button" className={styles.mobileButton} onClick={() => setMobileOpen(true)} aria-label="Abrir menú">☰</button>
        </div>
      </header>

      <div className={`${styles.content} ${section === "conversaciones" ? styles.conversationsContent : ""}`}>
        {notice && <div className={styles.notice}>{notice}</div>}
        {error && <div className={styles.errorBanner}>{error}</div>}
        {activationError && <div className={styles.errorBanner} role="alert">{activationError}</div>}
        {section === "inicio" && !isActive && workspace.readiness && <PreparationSection workspace={workspace} readiness={workspace.readiness} onGo={go} onActivate={activate} activating={activating} />}
        {section === "inicio" && isActive && <OverviewSection workspace={workspace} onGo={go} />}
        {section === "negocio" && <BusinessSection key={`business-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "progy" && <ProgySection key={`progy-${workspaceKey}`} workspace={workspace} action={action} tab={progyTab} onTabChange={setProgyTab} />}
        {section === "catalogo" && <CatalogSection key={`catalog-${workspaceKey}`} workspace={workspace} action={action} onRefresh={() => load(workspace.business.id)} />}
        {section === "conocimiento" && <KnowledgeSection key={`knowledge-${workspaceKey}`} workspace={workspace} action={action} />}
        {section === "whatsapp" && <WhatsAppSection key={`whatsapp-${workspaceKey}`} workspace={workspace} />}
        {section === "pruebas" && <><SectionHeader eyebrow="PRUEBA ANTES DE ACTIVAR" title="Habla con Progy" description="Prueba el conocimiento y la voz del negocio. Cada turno registra su consumo para que podamos medir el costo real durante esta etapa de validación." />{!integrations.openai || !integrations.elevenlabs ? <div className={styles.errorBanner}>La prueba hablada está temporalmente en mantenimiento. Inténtalo nuevamente más tarde.</div> : <VoiceTestStudio key={`test-${workspaceKey}`} workspace={workspace} onRefresh={() => load(workspace.business.id)} />}</>}
        {section === "conversaciones" && <ConversationsSection workspace={workspace} onGo={go} onRefresh={() => load(workspace.business.id)} />}
        {section === "pedidos" && <OrdersSection workspace={workspace} />}
        {section === "consumo" && <UsageSection workspace={workspace} />}
        {section === "ajustes" && <SettingsSection user={user} workspace={workspace} integrations={integrations} />}
      </div>
    </section>
  </main>;
}
