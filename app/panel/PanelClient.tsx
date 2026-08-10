"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type PanelUser = { id: string; email: string; name: string };
type IntegrationStatus = { supabase: boolean; openai: boolean; elevenlabs: boolean; elevenlabsVoice: boolean };
type Category = { code: string; name: string; description?: string; icon?: string };
type Business = {
  id: string; owner_id: string; category_code: string; name: string; description?: string | null;
  phone?: string | null; whatsapp_phone?: string | null; email?: string | null; website_url?: string | null;
  address?: string | null; city?: string | null; province?: string | null; country_code?: string;
  timezone?: string; currency?: string; status?: string; accepts_online_orders?: boolean; accepts_online_bookings?: boolean;
};
type Agent = {
  id: string; business_id: string; agent_name: string; language_code: string; greeting: string; tone: string;
  voice_id?: string | null; elevenlabs_agent_id?: string | null; collect_customer_name: boolean; collect_customer_phone: boolean; fallback_message: string;
  settings?: Record<string, unknown> | null;
};
type Hour = { id?: string; day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };
type Feature = { id: string; feature_code: string; enabled: boolean; available_in_trial: boolean };
type CatalogItem = { id: string; kind: "product" | "service"; name: string; description?: string | null; price: number; duration_minutes?: number | null; stock_quantity?: number; track_stock?: boolean; is_available: boolean };
type KnowledgeItem = { id: string; kind: string; title: string; question?: string | null; answer: string; is_active: boolean };
type Conversation = { id: string; customer_name?: string | null; customer_phone?: string | null; channel: string; status: string; duration_seconds: number; summary?: string | null; outcome?: string | null; started_at: string };
type Order = { id: string; order_number: number; customer_name?: string | null; status: string; fulfillment: string; total: number; created_at: string };
type Booking = { id: string; customer_name?: string | null; type: string; status: string; starts_at: string; party_size?: number | null; resource_name?: string | null; created_at: string };
type Plan = { plan_code: string; status: string; included_voice_seconds: number; used_voice_seconds: number; trial_ends_at?: string | null };
type Usage = { id: string; kind: string; quantity: number; estimated_cost_usd: number; created_at: string };
type VoiceOption = { id: string; name: string; description: string; previewUrl: string | null; labels: Record<string, string>; recommended: boolean };
type WhatsAppStatus = { numberSaved: boolean; connected: boolean; messagingReady?: boolean; callingReady?: boolean; agentReady?: boolean; phoneNumberId?: string | null; phoneNumberName?: string | null; businessAccountName?: string | null; tokenExpired?: boolean; checkAvailable?: boolean; nextAction?: "connection_unavailable" | "connection_permissions" | "try_again" | "authorize_meta" | "reauthorize_meta" | "assign_progy" | "test_channel" };
type SelectedWorkspace = { business: Business; agent: Agent | null; hours: Hour[]; features: Feature[]; catalogCategories: unknown[]; catalogItems: CatalogItem[]; knowledge: KnowledgeItem[]; plan: Plan | null; conversations: Conversation[]; orders: Order[]; bookings: Booking[]; usage: Usage[] };
type Snapshot = { categories: Category[]; businesses: Business[]; selected: SelectedWorkspace | null };

const navItems = [
  ["inicio", "⌂", "Inicio"], ["negocio", "▦", "Mi negocio"], ["configurar", "◇", "Configurar Progy"],
  ["conocimiento", "▤", "Conocimiento"], ["voz", "◖", "Voz e idioma"], ["whatsapp", "◉", "WhatsApp"],
  ["pruebas", "▷", "Pruebas"], ["conversaciones", "☵", "Conversaciones"], ["pedidos", "□", "Pedidos y reservas"],
  ["consumo", "◔", "Consumo y plan"],
];

const viewCopy: Record<string, { title: string; eyebrow: string; description: string }> = {
  negocio: { eyebrow: "LA BASE DE TODO", title: "Mi negocio", description: "Mantén actualizados tus datos, horarios, productos o servicios." },
  configurar: { eyebrow: "FORMA A TU ASISTENTE", title: "Configurar Progy", description: "Define cómo se presenta, qué tono utiliza y qué debe conseguir." },
  conocimiento: { eyebrow: "LO QUE PROGY SABE", title: "Conocimiento", description: "Agrega respuestas, políticas e indicaciones para que Progy no improvise." },
  voz: { eyebrow: "LA VOZ DE TU NEGOCIO", title: "Voz e idioma", description: "Escucha la voz, ajusta su estilo y confirma la que usarás en las pruebas." },
  whatsapp: { eyebrow: "TU CANAL PRINCIPAL", title: "WhatsApp", description: "Registra el número del negocio y revisa los pasos pendientes de conexión." },
  pruebas: { eyebrow: "ANTES DE ACTIVAR", title: "Pruebas", description: "Habla con Progy usando la información real que acabas de configurar." },
  conversaciones: { eyebrow: "TODO LO QUE OCURRIÓ", title: "Conversaciones", description: "Revisa únicamente las conversaciones registradas para este negocio." },
  pedidos: { eyebrow: "RESULTADOS DEL NEGOCIO", title: "Pedidos y reservas", description: "Consulta pedidos, citas y reservas capturados por Progy." },
  consumo: { eyebrow: "CONTROL CLARO", title: "Consumo y plan", description: "Conoce los minutos utilizados y el costo registrado sin datos simulados." },
  ajustes: { eyebrow: "ESTADO DE TU CUENTA", title: "Configuración", description: "Revisa tu cuenta, integraciones y negocio activo." },
};

const blueprints: Record<string, { catalog: string; singular: string; kind: "product" | "service"; action: string; examples: string }> = {
  restaurant: { catalog: "Menú y productos", singular: "producto o plato", kind: "product", action: "pedidos y reservas", examples: "Ej.: encebollado, parrillada, bebida" },
  clinic: { catalog: "Servicios y especialidades", singular: "servicio médico", kind: "service", action: "citas", examples: "Ej.: consulta general, odontología" },
  hotel: { catalog: "Habitaciones y servicios", singular: "habitación o servicio", kind: "service", action: "reservas", examples: "Ej.: habitación doble, desayuno" },
  hardware_store: { catalog: "Productos y cotizaciones", singular: "producto", kind: "product", action: "pedidos y cotizaciones", examples: "Ej.: cemento, taladro, pintura" },
  beauty_salon: { catalog: "Servicios y duración", singular: "servicio", kind: "service", action: "citas", examples: "Ej.: corte, manicure, coloración" },
  retail_store: { catalog: "Productos y promociones", singular: "producto", kind: "product", action: "pedidos", examples: "Ej.: camiseta, accesorio, combo" },
  professional_services: { catalog: "Servicios y tarifas", singular: "servicio", kind: "service", action: "consultas y cotizaciones", examples: "Ej.: asesoría, instalación, diagnóstico" },
  other: { catalog: "Productos o servicios", singular: "producto o servicio", kind: "service", action: "solicitudes", examples: "Agrega lo que ofreces a tus clientes" },
};

function blueprint(code: string) { return blueprints[code] ?? blueprints.other; }
function money(value: number | string | null | undefined) { return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(value || 0)); }
function dateTime(value: string) { return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(value)); }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "P"; }

export default function PanelClient({ user, integrations }: { user: PanelUser; integrations: IntegrationStatus }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState("inicio");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (businessId?: string) => {
    setLoading(true);
    setError("");

    const workspaceUrl =
      `/api/workspace${businessId
        ? `?businessId=${encodeURIComponent(businessId)}`
        : ""}`;

    async function requestWorkspace() {
      const response = await fetch(workspaceUrl, {
        cache: "no-store",
      });

      const result = await response.json() as Snapshot & {
        error?: string;
      };

      return {
        response,
        result,
      };
    }

    try {
      let { response, result } = await requestWorkspace();

      // "JWT issued at future" suele ser un fallo temporal de validación
      // inmediatamente después de obtener una nueva sesión.
      if (
        !response.ok &&
        /jwt issued at future/i.test(result.error || "")
      ) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, 1200)
        );

        const retry = await requestWorkspace();

        response = retry.response;
        result = retry.result;
      }

      // Si la sesión sigue siendo inválida, usamos el refresh token.
      if (
        !response.ok &&
        /jwt|token|session|unauthorized|auth/i.test(
          result.error || ""
        )
      ) {
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
          cache: "no-store",
        });

        if (refreshResponse.ok) {
          // Pequeño margen antes de reutilizar el nuevo JWT.
          await new Promise((resolve) =>
            window.setTimeout(resolve, 500)
          );

          const retry = await requestWorkspace();

          response = retry.response;
          result = retry.result;
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error || "No pudimos abrir tu panel."
        );
      }

      setSnapshot(result);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos abrir tu panel."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The initial workspace load is intentionally tied to the authenticated panel mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => { if (notice) { const timer = window.setTimeout(() => setNotice(""), 3200); return () => window.clearTimeout(timer); } }, [notice]);

  async function action(payload: Record<string, unknown>, message?: string, reload = true) {
    const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { error?: string; business?: Business };
    if (!response.ok) throw new Error(result.error || "No pudimos guardar los cambios.");
    if (message) setNotice(message);
    if (reload) await load(String(payload.businessId || result.business?.id || ""));
    return result;
  }

  function go(section: string) { setActive(section); setMobileOpen(false); }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/acceso?mode=login"; }

  if (loading && !snapshot) return <PanelLoading />;
  if (error && !snapshot) return <PanelError message={error} onRetry={() => void load()} />;
  if (!snapshot) return null;
  if (creating || !snapshot.selected) return <BusinessOnboarding user={user} categories={snapshot.categories} onCancel={snapshot.selected ? () => setCreating(false) : undefined} onCreate={async (payload) => { const result = await action({ action: "createBusiness", ...payload }, "Tu negocio ya está listo para configurarse."); setCreating(false); setActive("negocio"); setGuideOpen(true); return result; }} />;

  const workspace = snapshot.selected;
  const business = workspace.business;
  const category = snapshot.categories.find((item) => item.code === business.category_code);
  const completion = getCompletion(workspace);

  return <main className="panel-shell progy-app">
    {mobileOpen && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
    <aside className={`panel-sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="sidebar-topline">
        <Link className="brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span>Progy</span></Link>
        <button className="sidebar-close" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)}>×</button>
      </div>
      <div className="sidebar-scroll">
        <div className="business-switch real-business">
          <span>{initials(business.name)}</span>
          <div><b>{business.name}</b><small>{category?.name || "Negocio"} · {business.status === "trial" ? "Prueba" : business.status}</small></div>
        </div>
        {snapshot.businesses.length > 1 && <label className="business-select-label">CAMBIAR NEGOCIO<select value={business.id} onChange={(event) => void load(event.target.value)}>{snapshot.businesses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
        <button className="new-business-button" onClick={() => setCreating(true)}>＋ Crear otro negocio</button>
        <nav className="panel-nav" aria-label="Panel de Progy">
          <small>MENÚ PRINCIPAL</small>
          {navItems.map(([id, icon, label]) => <button key={id} className={active === id ? "active" : ""} onClick={() => go(id)}><span>{icon}</span>{label}{id === "configurar" && completion.done < completion.steps.length && <i>{completion.steps.length - completion.done}</i>}</button>)}
          <small>CUENTA</small>
          <button onClick={() => go("ajustes")} className={active === "ajustes" ? "active" : ""}><span>⚙</span>Configuración</button>
        </nav>
        <div className="sidebar-help"><div>?</div><b>¿Necesitas ayuda?</b><p>Abre la guía o conversa con PrograWebs.</p><button onClick={() => setGuideOpen(true)}>Abrir guía →</button><a href="https://prograwebs.com/">Hablar con soporte →</a></div>
      </div>
      <button className="user-chip" onClick={logout} title="Cerrar sesión"><span>{initials(user.name)}</span><div><b>{user.name}</b><small>{user.email}</small></div><em>Salir ↪</em></button>
    </aside>
    <section className="panel-main">
      <header className="panel-top">
        <button className="mobile-menu-button" aria-label="Abrir menú" onClick={() => setMobileOpen(true)}>☰</button>
        <div className="mobile-brand">Progy</div>
        <div className="agent-state"><span /> {completion.done === completion.steps.length ? "Progy está listo para probar" : `Configuración ${completion.percent}% completa`}</div>
        <div className="top-actions"><button className="guide-button" onClick={() => setGuideOpen(true)}>Guía {completion.done}/{completion.steps.length}</button><button className="test-button" onClick={() => go("pruebas")}>▷ Probar a Progy</button></div>
      </header>
      {active === "inicio"
        ? <DashboardHome user={user} workspace={workspace} category={category} completion={completion} onGo={go} />
        : <ModuleView key={`${business.id}-${active}`} active={active} workspace={workspace} category={category} integrations={integrations} action={action} onGo={go} />}
    </section>
    {guideOpen && <GuideDrawer completion={completion} business={business} onClose={() => setGuideOpen(false)} onGo={(section) => { setGuideOpen(false); go(section); }} />}
    {notice && <div className="save-toast" role="status">✓ {notice}</div>}
  </main>;
}

function PanelLoading() { return <main className="panel-loading"><div className="oauth-loader" /><h1>Preparando tu espacio</h1><p>Estamos cargando únicamente los datos de tu cuenta.</p></main>; }
function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) { return <main className="panel-loading"><span className="error-symbol">!</span><h1>No pudimos abrir el panel</h1><p>{message}</p><button className="button" onClick={onRetry}>Intentar nuevamente</button><a href="/api/auth/logout">Cerrar sesión</a></main>; }

function BusinessOnboarding({ user, categories, onCreate, onCancel }: { user: PanelUser; categories: Category[]; onCreate: (payload: Record<string, unknown>) => Promise<unknown>; onCancel?: () => void }) {
  const [step, setStep] = useState(0);
  const [categoryCode, setCategoryCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = categories.find((item) => item.code === categoryCode);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    try { await onCreate({ categoryCode, name: form.get("name"), description: form.get("description"), phone: form.get("phone"), whatsappPhone: form.get("whatsappPhone"), address: form.get("address"), city: form.get("city"), province: form.get("province") }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos crear el negocio."); setSaving(false); }
  }
  return <main className="onboarding-page">
    <header><Link className="brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span>Progy</span></Link><div className="onboarding-progress"><span>{step + 1} de 2</span><i><b style={{ width: `${(step + 1) * 50}%` }} /></i></div>{onCancel ? <button onClick={onCancel}>Cerrar</button> : <a href="/api/auth/logout">Cerrar sesión</a>}</header>
    <section className="onboarding-card">
      <span className="panel-kicker">HOLA, {user.name.split(" ")[0].toUpperCase()}</span>
      {step === 0 ? <>
        <h1>¿Qué tipo de negocio vas a configurar?</h1><p>Esto adapta las opciones de Progy. Una clínica necesita citas; un restaurante, pedidos y reservas.</p>
        <div className="category-grid">{categories.map((item) => <button className={categoryCode === item.code ? "selected" : ""} onClick={() => setCategoryCode(item.code)} key={item.code}><span>{item.icon || "◇"}</span><b>{item.name}</b><small>{item.description}</small>{categoryCode === item.code && <em>✓</em>}</button>)}</div>
        <div className="onboarding-actions"><button className="button" disabled={!categoryCode} onClick={() => setStep(1)}>Continuar <span>→</span></button></div>
      </> : <form onSubmit={submit}>
        <button type="button" className="back-step" onClick={() => setStep(0)}>← Cambiar tipo</button>
        <h1>Cuéntanos lo esencial de tu {selected?.name.toLowerCase()}</h1><p>Podrás completar y modificar todo después. Empezaremos con una estructura preparada para {blueprint(categoryCode).action}.</p>
        <div className="form-grid onboarding-form"><label>Nombre comercial<input name="name" placeholder="Ej.: Clínica Vida" required autoFocus /></label><label>Provincia<input name="province" placeholder="Ej.: Pichincha" /></label><label>Ciudad<input name="city" placeholder="Ej.: Quito" /></label><label>Teléfono<input name="phone" type="tel" placeholder="Ej.: 02 234 5678" /></label><label>WhatsApp<input name="whatsappPhone" type="tel" placeholder="Ej.: +593 99 000 0000" /></label><label className="full">Dirección<input name="address" placeholder="Calle, número y referencia" /></label><label className="full">Descripción breve<textarea name="description" placeholder="¿Qué ofrece tu negocio y a quién atiende?" /></label></div>
        {error && <div className="form-message error">{error}</div>}
        <div className="onboarding-actions"><button className="button" disabled={saving}>{saving ? "Creando tu espacio…" : "Crear mi negocio"} <span>↗</span></button></div>
      </form>}
    </section>
    <footer>Configuración segura · Ecuador · USD · America/Guayaquil</footer>
  </main>;
}

function getCompletion(workspace: SelectedWorkspace) {
  const settings = workspace.agent?.settings ?? {};
  const steps = [
    { label: "Crear el negocio", detail: "Nombre y tipo de actividad", done: Boolean(workspace.business.name), section: "negocio" },
    { label: "Revisar horarios", detail: "Días y horas de atención", done: workspace.hours.length === 7, section: "negocio" },
    { label: `Agregar ${blueprint(workspace.business.category_code).catalog.toLowerCase()}`, detail: "Con precios y disponibilidad", done: workspace.catalogItems.length > 0, section: "negocio" },
    { label: "Enseñar respuestas importantes", detail: "Preguntas frecuentes y políticas", done: workspace.knowledge.length > 0, section: "conocimiento" },
    { label: "Confirmar voz y probar", detail: "Escucha cómo atenderá", done: Boolean(settings && settings.voice_confirmed), section: "voz" },
  ];
  const done = steps.filter((item) => item.done).length;
  return { steps, done, percent: Math.round((done / steps.length) * 100) };
}

function DashboardHome({ user, workspace, category, completion, onGo }: { user: PanelUser; workspace: SelectedWorkspace; category?: Category; completion: ReturnType<typeof getCompletion>; onGo: (section: string) => void }) {
  const plan = workspace.plan;
  const usedMinutes = (plan?.used_voice_seconds ?? 0) / 60;
  const totalMinutes = (plan?.included_voice_seconds ?? 600) / 60;
  const outcomes = workspace.orders.length + workspace.bookings.length;
  return <div className="panel-content">
    <div className="panel-welcome"><div><span className="panel-kicker">{category?.name?.toUpperCase() || "TU NEGOCIO"}</span><h1>Hola, {user.name.split(/\s+/)[0]}.</h1><p>Este panel ya muestra datos reales de {workspace.business.name}. Completa la guía para realizar una prueba útil.</p></div><div className="trial-badge"><span>CONFIGURACIÓN</span><b>{completion.percent}%</b><small>{completion.done} de {completion.steps.length} pasos</small></div></div>
    <section className="setup-banner"><div className="setup-ring"><span>{completion.done}<small>/ {completion.steps.length}</small></span></div><div className="setup-copy"><small>TUTORIAL DE TU PRIMER PROGY</small><h2>{completion.done === completion.steps.length ? "Tu asistente está listo para probar" : completion.steps.find((item) => !item.done)?.label}</h2><p>{completion.done === completion.steps.length ? "Haz una conversación de prueba y comprueba sus respuestas." : completion.steps.find((item) => !item.done)?.detail}</p><div className="progress-line">{completion.steps.map((item) => item.done ? <i key={item.label} /> : <span key={item.label} />)}</div></div><button className="button" onClick={() => onGo(completion.steps.find((item) => !item.done)?.section || "pruebas")}>{completion.done === completion.steps.length ? "Probar ahora" : "Continuar configuración"} <span>→</span></button></section>
    <div className="stats-grid real-stats">
      <article><div><span>◖</span><small>MINUTOS UTILIZADOS</small></div><b>{usedMinutes.toFixed(1)} <em>/ {totalMinutes.toFixed(0)} min</em></b><p><i style={{ width: `${Math.min(100, totalMinutes ? usedMinutes / totalMinutes * 100 : 0)}%` }} /></p><small>{Math.max(0, totalMinutes - usedMinutes).toFixed(1)} minutos disponibles</small></article>
      <article><div><span>☵</span><small>CONVERSACIONES</small></div><b>{workspace.conversations.length}</b><p className="trend">Historial del negocio</p><small>{workspace.conversations[0] ? `Última: ${dateTime(workspace.conversations[0].started_at)}` : "Aún no hay conversaciones"}</small></article>
      <article><div><span>□</span><small>RESULTADOS</small></div><b>{outcomes}</b><p className="trend">{workspace.orders.length} pedidos · {workspace.bookings.length} reservas</p><small>Registros reales</small></article>
      <article><div><span>▤</span><small>CONOCIMIENTO</small></div><b>{workspace.catalogItems.length + workspace.knowledge.length}</b><p className="trend">elementos disponibles</p><small>{workspace.catalogItems.length} catálogo · {workspace.knowledge.length} respuestas</small></article>
    </div>
    <div className="dashboard-grid">
      <section className="activity-card"><div className="card-title"><div><small>ACTIVIDAD RECIENTE</small><h3>Últimas conversaciones</h3></div><button onClick={() => onGo("conversaciones")}>Ver todas →</button></div>{workspace.conversations.length ? <div className="activity-table"><div className="table-head"><span>CLIENTE</span><span>RESULTADO</span><span>DURACIÓN</span><span>ESTADO</span></div>{workspace.conversations.slice(0, 5).map((row) => <div className="table-row" key={row.id}><span className="client"><i>{initials(row.customer_name || "Cliente")}</i><b>{row.customer_name || row.customer_phone || "Cliente sin identificar"}<small>{dateTime(row.started_at)}</small></b></span><span>{row.outcome || row.summary || "Sin resultado registrado"}</span><span>{Math.round((row.duration_seconds || 0) / 60)} min</span><span><em className="result-pill">{row.status}</em></span></div>)}</div> : <EmptyState icon="☵" title="Todavía no hay conversaciones" text="Cuando pruebes a Progy, el historial aparecerá aquí." action="Realizar una prueba" onClick={() => onGo("pruebas")} />}</section>
      <aside className="next-card"><div className="card-title"><div><small>GUÍA DE INICIO</small><h3>Tu progreso</h3></div><b>{completion.done} de {completion.steps.length}</b></div>{completion.steps.map((step, index) => <button className={`progress-item ${step.done ? "done" : ""}`} onClick={() => onGo(step.section)} key={step.label}><span>{step.done ? "✓" : index + 1}</span><div><b>{step.label}</b><small>{step.done ? "Completado" : step.detail}</small></div><i>{step.done ? "Revisar" : "Continuar"} →</i></button>)}</aside>
    </div>
  </div>;
}

function ModuleView({ active, workspace, category, integrations, action, onGo }: { active: string; workspace: SelectedWorkspace; category?: Category; integrations: IntegrationStatus; action: (payload: Record<string, unknown>, message?: string, reload?: boolean) => Promise<unknown>; onGo: (section: string) => void }) {
  const copy = viewCopy[active] || viewCopy.ajustes;
  return <div className="panel-content module-page"><div className="module-heading"><div><span className="panel-kicker">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p></div><span className="live-data-pill">● DATOS DE {workspace.business.name.toUpperCase()}</span></div>
    {active === "negocio" && <BusinessModule workspace={workspace} category={category} action={action} />}
    {active === "configurar" && <ConfigureModule workspace={workspace} action={action} />}
    {active === "conocimiento" && <KnowledgeModule workspace={workspace} action={action} />}
    {active === "voz" && <VoiceModule workspace={workspace} integrations={integrations} action={action} onGo={onGo} />}
    {active === "whatsapp" && <WhatsAppModule workspace={workspace} action={action} />}
    {active === "pruebas" && <TestModule workspace={workspace} integrations={integrations} action={action} />}
    {active === "conversaciones" && <ConversationModule rows={workspace.conversations} onGo={onGo} />}
    {active === "pedidos" && <OrdersModule orders={workspace.orders} bookings={workspace.bookings} />}
    {active === "consumo" && <UsageModule plan={workspace.plan} usage={workspace.usage} />}
    {active === "ajustes" && <SettingsModule workspace={workspace} category={category} integrations={integrations} />}
  </div>;
}

function Block({ title, step, children, note }: { title: string; step?: string; children: ReactNode; note?: string }) { return <section className="module-block"><div className="module-block-head"><div>{step && <span>{step}</span>}<h2>{title}</h2></div><small>{note || "Los cambios se guardan al confirmar"}</small></div>{children}</section>; }

function BusinessModule({ workspace, category, action }: { workspace: SelectedWorkspace; category?: Category; action: (payload: Record<string, unknown>, message?: string) => Promise<unknown> }) {
  const [tab, setTab] = useState<"datos" | "horarios" | "catalogo">("datos");
  const [hours, setHours] = useState<Hour[]>(() => Array.from({ length: 7 }, (_, day) => workspace.hours.find((row) => row.day_of_week === day) || { day_of_week: day, opens_at: "08:00", closes_at: "18:00", is_closed: day === 0 }));
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bp = blueprint(workspace.business.category_code);
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  async function run(task: () => Promise<unknown>) { setBusy(true); setError(""); try { await task(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar."); } finally { setBusy(false); } }
  async function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await run(() => action({ action: "updateBusiness", businessId: workspace.business.id, name: form.get("name"), description: form.get("description"), phone: form.get("phone"), whatsapp_phone: form.get("whatsapp"), email: form.get("email"), website_url: form.get("website"), address: form.get("address"), city: form.get("city"), province: form.get("province") }, "Datos del negocio actualizados.")); }
  async function saveItem(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await run(async () => { await action({ action: "saveCatalogItem", businessId: workspace.business.id, id: editingItem?.id, kind: form.get("kind"), name: form.get("name"), description: form.get("description"), price: form.get("price"), durationMinutes: form.get("duration"), stockQuantity: form.get("stock"), trackStock: form.get("trackStock") === "on", isAvailable: form.get("isAvailable") === "on" }, `${editingItem ? "Elemento actualizado" : "Elemento agregado"} al catálogo.`); setShowItemForm(false); setEditingItem(null); }); }
  return <div className="module-grid"><div className="module-tabs"><button className={tab === "datos" ? "active" : ""} onClick={() => setTab("datos")}>1. Datos</button><button className={tab === "horarios" ? "active" : ""} onClick={() => setTab("horarios")}>2. Horarios</button><button className={tab === "catalogo" ? "active" : ""} onClick={() => setTab("catalogo")}>3. {bp.catalog}</button></div>
    {error && <div className="form-message error">{error}</div>}
    {tab === "datos" && <Block title="Identidad y contacto"><form onSubmit={saveProfile}><div className="industry-summary"><span>{category?.icon || "◇"}</span><div><small>TIPO DE NEGOCIO</small><b>{category?.name || workspace.business.category_code}</b><p>Progy adaptará sus acciones para {bp.action}.</p></div></div><div className="form-grid"><label>Nombre comercial<input name="name" defaultValue={workspace.business.name} required /></label><label>Correo del negocio<input name="email" type="email" defaultValue={workspace.business.email || ""} /></label><label>Teléfono<input name="phone" defaultValue={workspace.business.phone || ""} /></label><label>WhatsApp<input name="whatsapp" defaultValue={workspace.business.whatsapp_phone || ""} /></label><label>Ciudad<input name="city" defaultValue={workspace.business.city || ""} /></label><label>Provincia<input name="province" defaultValue={workspace.business.province || ""} /></label><label className="full">Dirección<input name="address" defaultValue={workspace.business.address || ""} /></label><label className="full">Sitio web<input name="website" type="url" defaultValue={workspace.business.website_url || ""} placeholder="https://" /></label><label className="full">Descripción<textarea name="description" defaultValue={workspace.business.description || ""} /></label></div><button className="button module-save" disabled={busy}>{busy ? "Guardando…" : "Guardar datos"}</button></form></Block>}
    {tab === "horarios" && <Block title="Horario habitual" note="Puedes cambiarlo cuando tu negocio lo necesite"><div className="hours-list">{hours.map((row, index) => <div className={`hour-row ${row.is_closed ? "closed" : ""}`} key={row.day_of_week}><b>{days[row.day_of_week]}</b><label className="open-toggle"><input type="checkbox" checked={!row.is_closed} onChange={(event) => setHours((current) => current.map((item, i) => i === index ? { ...item, is_closed: !event.target.checked } : item))} /><span>{row.is_closed ? "Cerrado" : "Abierto"}</span></label><input type="time" disabled={row.is_closed} value={row.opens_at?.slice(0, 5) || "08:00"} onChange={(event) => setHours((current) => current.map((item, i) => i === index ? { ...item, opens_at: event.target.value } : item))} /><span>a</span><input type="time" disabled={row.is_closed} value={row.closes_at?.slice(0, 5) || "18:00"} onChange={(event) => setHours((current) => current.map((item, i) => i === index ? { ...item, closes_at: event.target.value } : item))} /></div>)}</div><button className="button module-save" disabled={busy} onClick={() => void run(() => action({ action: "saveHours", businessId: workspace.business.id, hours }, "Horarios guardados."))}>{busy ? "Guardando…" : "Guardar horarios"}</button></Block>}
    {tab === "catalogo" && <Block title={bp.catalog} note={`${workspace.catalogItems.length} elementos configurados`}><div className="catalog-toolbar"><div><p>Progy solo mencionará los precios y servicios que agregues aquí.</p><small>{bp.examples}</small></div><button className="button" onClick={() => { setEditingItem(null); setShowItemForm(true); }}>＋ Agregar {bp.singular}</button></div>{showItemForm && <form className="inline-editor" onSubmit={saveItem}><div className="inline-editor-head"><b>{editingItem ? "Editar elemento" : `Nuevo ${bp.singular}`}</b><button type="button" onClick={() => { setShowItemForm(false); setEditingItem(null); }}>×</button></div><div className="form-grid"><label>Tipo<select name="kind" defaultValue={editingItem?.kind || bp.kind}><option value="product">Producto</option><option value="service">Servicio</option></select></label><label>Nombre<input name="name" defaultValue={editingItem?.name || ""} required /></label><label>Precio (USD)<input name="price" type="number" min="0" step="0.01" defaultValue={editingItem?.price ?? ""} required /></label><label>Duración en minutos<input name="duration" type="number" min="1" defaultValue={editingItem?.duration_minutes || ""} placeholder="Solo para servicios" /></label><label>Existencias<input name="stock" type="number" min="0" step="0.001" defaultValue={editingItem?.stock_quantity || ""} placeholder="Solo para productos" /></label><label className="check-field"><input name="trackStock" type="checkbox" defaultChecked={editingItem?.track_stock} /> Controlar existencias</label><label className="full">Descripción<textarea name="description" defaultValue={editingItem?.description || ""} /></label><label className="check-field full"><input name="isAvailable" type="checkbox" defaultChecked={editingItem?.is_available ?? true} /> Disponible para clientes</label></div><button className="button" disabled={busy}>{busy ? "Guardando…" : "Guardar elemento"}</button></form>}{workspace.catalogItems.length ? <div className="catalog-list">{workspace.catalogItems.map((item) => <article key={item.id}><span className="catalog-kind">{item.kind === "service" ? "SERVICIO" : "PRODUCTO"}</span><div><b>{item.name}</b><small>{item.description || "Sin descripción"}{item.duration_minutes ? ` · ${item.duration_minutes} min` : ""}</small></div><strong>{money(item.price)}</strong><em className={item.is_available ? "available" : "unavailable"}>{item.is_available ? "Disponible" : "Oculto"}</em><button onClick={() => { setEditingItem(item); setShowItemForm(true); }}>Editar</button><button className="danger-link" onClick={() => { if (window.confirm(`¿Eliminar ${item.name}?`)) void run(() => action({ action: "deleteCatalogItem", businessId: workspace.business.id, id: item.id }, "Elemento eliminado.")); }}>Eliminar</button></article>)}</div> : <EmptyState icon="＋" title={`Agrega tu primer ${bp.singular}`} text="Sin elementos, Progy no inventará precios ni disponibilidad." action="Agregar ahora" onClick={() => setShowItemForm(true)} />}</Block>}
  </div>;
}

function ConfigureModule({ workspace, action }: { workspace: SelectedWorkspace; action: (payload: Record<string, unknown>, message?: string) => Promise<unknown> }) {
  const agent = workspace.agent;
  const [tone, setTone] = useState(agent?.tone || "cálido, natural y profesional");
  const [features, setFeatures] = useState(() => Object.fromEntries(workspace.features.map((item) => [item.feature_code, item.enabled])) as Record<string, boolean>);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const featureLabels: Record<string, [string, string]> = { answer_questions: ["Responder consultas", "Horarios, ubicación, precios y preguntas frecuentes."], take_orders: ["Tomar pedidos", "Productos, cantidades, entrega o retiro."], schedule_appointments: ["Agendar citas", "Fecha, hora y servicio solicitado."], create_reservations: ["Crear reservas", "Mesas, habitaciones u otros espacios."], create_quotes: ["Preparar cotizaciones", "Productos o servicios para cotizar."], capture_leads: ["Registrar interesados", "Nombre, teléfono y necesidad."], send_whatsapp: ["Enviar seguimiento por WhatsApp", "Confirmaciones y resúmenes autorizados."], transfer_human: ["Transferir a una persona", "Cuando Progy no pueda resolver algo." ] };
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget); try { const agentPayload = { action: "saveAgent", businessId: workspace.business.id, agent_name: form.get("agentName"), language_code: form.get("language"), greeting: form.get("greeting"), tone, collect_customer_name: form.get("collectName") === "on", collect_customer_phone: form.get("collectPhone") === "on", fallback_message: form.get("fallback"), settings: agent?.settings || {} }; await action(agentPayload, undefined, false); for (const [featureCode, enabled] of Object.entries(features)) await action({ action: "saveFeature", businessId: workspace.business.id, featureCode, enabled }, undefined, false); await action(agentPayload, "Configuración de Progy guardada.", true); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar."); } finally { setBusy(false); } }
  return <form className="module-grid" onSubmit={save}>{error && <div className="form-message error">{error}</div>}<Block step="01" title="Identidad de Progy"><div className="form-grid"><label>Nombre del asistente<input name="agentName" defaultValue={agent?.agent_name || "Progy"} /></label><label>Idioma<select name="language" defaultValue={agent?.language_code || "es-419"}><option value="es-419">Español latino</option><option value="es-EC">Español de Ecuador</option></select></label><label className="full">Saludo inicial<textarea name="greeting" defaultValue={agent?.greeting || `Hola, gracias por llamar a ${workspace.business.name}. Soy Progy, ¿en qué puedo ayudarte?`} /></label></div></Block><Block step="02" title="Forma de atender"><div className="choice-grid">{[["cálido, natural y profesional", "Cálido y cercano", "Amable y conversacional."], ["directo, claro y profesional", "Profesional", "Claro, sobrio y respetuoso."], ["ágil, positivo y resolutivo", "Dinámico", "Rápido y orientado a resolver."]].map(([value, title, text]) => <button type="button" className={tone === value ? "selected" : ""} onClick={() => setTone(value)} key={value}><b>{title}</b><small>{text}</small>{tone === value && <span>✓</span>}</button>)}</div></Block><Block step="03" title="Lo que Progy puede hacer"><div className="toggle-list">{workspace.features.map((feature) => { const copy = featureLabels[feature.feature_code] || [feature.feature_code, "Capacidad del asistente."]; return <label key={feature.feature_code}><span><b>{copy[0]}</b><small>{copy[1]}</small></span><input type="checkbox" checked={Boolean(features[feature.feature_code])} onChange={(event) => setFeatures((current) => ({ ...current, [feature.feature_code]: event.target.checked }))} /></label>; })}</div></Block><Block step="04" title="Datos que debe solicitar"><div className="toggle-list compact-toggles"><label><span><b>Nombre del cliente</b><small>Para personalizar y registrar la atención.</small></span><input name="collectName" type="checkbox" defaultChecked={agent?.collect_customer_name ?? true} /></label><label><span><b>Teléfono de contacto</b><small>Para confirmaciones o seguimiento.</small></span><input name="collectPhone" type="checkbox" defaultChecked={agent?.collect_customer_phone ?? true} /></label></div><label className="standalone-field">Cuando no conozca una respuesta<textarea name="fallback" defaultValue={agent?.fallback_message || "No tengo esa información confirmada. Puedo comunicarte con una persona del negocio."} /></label></Block><button className="button sticky-save" disabled={busy}>{busy ? "Guardando configuración…" : "Guardar configuración de Progy"}</button></form>;
}

function KnowledgeModule({ workspace, action }: { workspace: SelectedWorkspace; action: (payload: Record<string, unknown>, message?: string) => Promise<unknown> }) {
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<KnowledgeItem | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function run(task: () => Promise<unknown>) { setBusy(true); setError(""); try { await task(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar."); } finally { setBusy(false); } }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await run(async () => { await action({ action: "saveKnowledge", businessId: workspace.business.id, id: editing?.id, kind: form.get("kind"), title: form.get("title"), question: form.get("question"), answer: form.get("answer"), isActive: true }, editing ? "Respuesta actualizada." : "Nueva información agregada."); setShowForm(false); setEditing(null); }); }
  return <div className="module-grid">{error && <div className="form-message error">{error}</div>}<Block title="Respuestas y reglas importantes" note={`${workspace.knowledge.length} elementos guardados`}><div className="catalog-toolbar"><div><p>Escribe la respuesta correcta una sola vez. Progy la usará en sus conversaciones.</p><small>No incluyas información privada ni claves.</small></div><button className="button" onClick={() => { setEditing(null); setShowForm(true); }}>＋ Agregar información</button></div>{showForm && <form className="inline-editor" onSubmit={submit}><div className="inline-editor-head"><b>{editing ? "Editar información" : "Nueva información"}</b><button type="button" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid"><label>Tipo<select name="kind" defaultValue={editing?.kind || "faq"}><option value="faq">Pregunta frecuente</option><option value="policy">Política</option><option value="payment_method">Forma de pago</option><option value="location">Ubicación</option><option value="instruction">Instrucción interna</option><option value="other">Otra información</option></select></label><label>Título<input name="title" defaultValue={editing?.title || ""} required placeholder="Ej.: Formas de pago" /></label><label className="full">Pregunta del cliente (opcional)<input name="question" defaultValue={editing?.question || ""} placeholder="Ej.: ¿Aceptan transferencia?" /></label><label className="full">Respuesta confirmada<textarea name="answer" defaultValue={editing?.answer || ""} required /></label></div><button className="button" disabled={busy}>{busy ? "Guardando…" : "Guardar información"}</button></form>}{workspace.knowledge.length ? <div className="knowledge-list">{workspace.knowledge.map((item) => <article key={item.id}><span>{item.kind === "faq" ? "?" : "▤"}</span><div><small>{item.kind.replace("_", " ").toUpperCase()}</small><b>{item.title}</b><p>{item.answer}</p></div><button onClick={() => { setEditing(item); setShowForm(true); }}>Editar</button><button className="danger-link" onClick={() => { if (window.confirm(`¿Eliminar “${item.title}”?`)) void run(() => action({ action: "deleteKnowledge", businessId: workspace.business.id, id: item.id }, "Información eliminada.")); }}>Eliminar</button></article>)}</div> : <EmptyState icon="?" title="Progy todavía no tiene respuestas adicionales" text="Agrega formas de pago, políticas, ubicación o preguntas frecuentes." action="Agregar la primera" onClick={() => setShowForm(true)} />}</Block></div>;
}

function VoiceModule({ workspace, integrations, action, onGo }: { workspace: SelectedWorkspace; integrations: IntegrationStatus; action: (payload: Record<string, unknown>, message?: string) => Promise<unknown>; onGo: (section: string) => void }) {
  const agent = workspace.agent; const settings = agent?.settings || {};
  const [speed, setSpeed] = useState(Number(settings.voice_speed ?? 50)); const [expression, setExpression] = useState(Number(settings.voice_expressiveness ?? 55));
  const [voices, setVoices] = useState<VoiceOption[]>([]); const [selectedVoiceId, setSelectedVoiceId] = useState(agent?.voice_id || "");
  const [loadingVoices, setLoadingVoices] = useState(true); const [playingId, setPlayingId] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null); const audioCacheRef = useRef(new Map<string, string>());
  const loadVoices = useCallback(async (refresh = false) => { setLoadingVoices(true); setMessage(""); try { const response = await fetch(`/api/elevenlabs/voices${refresh ? "?refresh=1" : ""}`, { cache: "no-store" }); const data = await response.json() as { voices?: VoiceOption[]; error?: string }; if (!response.ok) throw new Error(data.error || "No pudimos cargar las voces."); const available = data.voices || []; setVoices(available); setSelectedVoiceId((current) => available.some((voice) => voice.id === current) ? current : available[0]?.id || ""); } catch (cause) { setVoices([]); setSelectedVoiceId(""); setMessage(cause instanceof Error ? cause.message : "No pudimos cargar las voces."); } finally { setLoadingVoices(false); } }, []);
  useEffect(() => { const audioCache = audioCacheRef.current; queueMicrotask(() => void loadVoices()); return () => { audioRef.current?.pause(); for (const url of audioCache.values()) URL.revokeObjectURL(url); }; }, [loadVoices]);
  function stopAudio() { audioRef.current?.pause(); audioRef.current = null; setPlayingId(""); }
  async function play(url: string, id: string) { stopAudio(); const audio = new Audio(url); audioRef.current = audio; setPlayingId(id); audio.onended = () => { audioRef.current = null; setPlayingId(""); }; audio.onerror = () => { audioRef.current = null; setPlayingId(""); setMessage("No pudimos reproducir esta muestra."); }; await audio.play(); }
  async function generateAudio(mode: "sample" | "greeting", voiceId: string) { const response = await fetch("/api/elevenlabs/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, voiceId, speed, expression, text: mode === "greeting" ? agent?.greeting || `Hola, soy Progy, el asistente de ${workspace.business.name}. ¿En qué puedo ayudarte?` : undefined }) }); if (!response.ok) { const data = await response.json().catch(() => ({})) as { error?: string }; throw new Error(data.error || "No se pudo generar el audio."); } return URL.createObjectURL(await response.blob()); }
  async function previewVoice(voice: VoiceOption) { if (playingId === voice.id) { stopAudio(); return; } setMessage(""); try { let url = voice.previewUrl || audioCacheRef.current.get(voice.id); if (!url) { url = await generateAudio("sample", voice.id); audioCacheRef.current.set(voice.id, url); } await play(url, voice.id); } catch (cause) { stopAudio(); setMessage(cause instanceof Error ? cause.message : "No se pudo reproducir la voz."); } }
  async function previewGreeting() { if (!selectedVoiceId) { setMessage("Elige una voz antes de escuchar el saludo."); return; } if (playingId === "greeting") { stopAudio(); return; } setMessage(""); try { await play(await generateAudio("greeting", selectedVoiceId), "greeting"); } catch (cause) { stopAudio(); setMessage(cause instanceof Error ? cause.message : "No se pudo generar el saludo."); } }
  async function confirmVoice() { if (!selectedVoiceId) return; setBusy(true); setMessage(""); try { await action({ action: "saveAgent", businessId: workspace.business.id, voice_id: selectedVoiceId, settings: { ...settings, voice_confirmed: true, voice_speed: speed, voice_expressiveness: expression } }, "Voz y ajustes guardados para tus pruebas."); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "No pudimos guardar la voz."); } finally { setBusy(false); } }
  const selectedVoice = voices.find((voice) => voice.id === selectedVoiceId);
  return <div className="voice-layout">
    <Block title="Elige cómo hablará Progy" note="Lista real de voces de tu cuenta">
      <div className="voice-toolbar"><span>{voices.length ? `${voices.length} voces disponibles` : "Consultando voces"}</span><button onClick={() => void loadVoices(true)} disabled={loadingVoices}>{loadingVoices ? "Consultando…" : "Actualizar voces"}</button></div>
      {loadingVoices ? <div className="voice-loading"><span className="oauth-loader" /><p>Cargando las voces disponibles…</p></div> : voices.length ? <div className="voice-picker">
        <label>Selecciona una voz<select value={selectedVoiceId} onChange={(event) => setSelectedVoiceId(event.target.value)}>{voices.map((voice) => <option value={voice.id} key={voice.id}>{voice.name}{voice.description ? ` — ${voice.description}` : ""}</option>)}</select></label>
        {selectedVoice && <div className="voice-choice-summary"><div><span>{selectedVoice.recommended ? "RECOMENDADA PARA ESPAÑOL" : "VOZ DISPONIBLE"}</span><b>{selectedVoice.name}</b><small>{selectedVoice.description}</small></div><button className="voice-test-button" onClick={() => void previewVoice(selectedVoice)}>{playingId === selectedVoice.id ? "■ Detener" : "▶ Probar esta voz"}</button></div>}
      </div> : <div className="voice-empty"><b>No pudimos cargar la lista de voces</b><p>Vuelve a consultar. Si el problema continúa, Progy te mostrará si la clave necesita permiso para leer voces.</p><button onClick={() => void loadVoices(true)}>Volver a consultar</button></div>}
      <div className="greeting-preview"><div><small>SALUDO REAL DE {workspace.business.name.toUpperCase()}</small><b>{selectedVoice?.name || "Elige una voz disponible"}</b><p>{agent?.greeting || `Hola, soy Progy, el asistente de ${workspace.business.name}. ¿En qué puedo ayudarte?`}</p></div><button onClick={() => void previewGreeting()} disabled={!selectedVoiceId || !integrations.elevenlabs}>{playingId === "greeting" ? "■ Detener" : "▶ Escuchar saludo real"}</button></div>
      {message && <p className="inline-error">{message}</p>}
    </Block>
    <aside className="voice-settings"><small>AJUSTES DE VOZ</small><h3>{selectedVoice?.name || agent?.agent_name || "Progy"}</h3><p className="voice-ready-copy">Ajusta la forma de hablar y vuelve a escuchar el saludo antes de confirmar.</p><label>Ritmo <input type="range" min="25" max="75" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /><small>{speed < 45 ? "Pausado" : speed > 60 ? "Ágil" : "Natural"}</small></label><label>Expresividad <input type="range" min="20" max="80" value={expression} onChange={(event) => setExpression(Number(event.target.value))} /><small>{expression < 40 ? "Serena" : expression > 65 ? "Expresiva" : "Equilibrada"}</small></label><button className="button" onClick={() => void confirmVoice()} disabled={!selectedVoiceId || busy}>{busy ? "Guardando…" : settings.voice_confirmed ? "Guardar voz y ajustes" : "Usar esta voz"}</button><button className="secondary-action" onClick={() => onGo("pruebas")}>Ir a la prueba completa →</button><p>La prueba usa la muestra existente cuando está disponible. El saludo real es una generación corta.</p></aside>
  </div>;
}

type MetaLoginResponse = {
  authResponse?: {
    code?: string;
  };
  status?: string;
};

type MetaLoginOptions = {
  config_id: string;
  auth_type?: string;
  response_type: "code";
  override_default_response_type: true;
  extras: {
    setup: Record<string, unknown>;
    featureType: string;
    sessionInfoVersion: string;
  };
};

type MetaFacebookSdk = {
  init: (options: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }) => void;

  login: (
    callback: (
      response: MetaLoginResponse
    ) => void,
    options: MetaLoginOptions,
  ) => void;
};

type MetaSdkWindow = Window & {
  FB?: MetaFacebookSdk;
  fbAsyncInit?: () => void;
};

type EmbeddedSignupAssets = {
  wabaId: string;
  phoneNumberId?: string;
  businessId?: string;
  flow:
    | "standard"
    | "business_app";
};

type MetaConnectResponse = {
  ok?: boolean;
  connected?: boolean;
  error?: string;

  meta?: {
    businessId?: string | null;
    wabaId?: string | null;
    wabaName?: string | null;
    phoneNumberId?: string | null;
    phoneNumber?: string | null;
    verifiedName?: string | null;
    isOnBizApp?: boolean;
    platformType?: string | null;
  };
};

function loadMetaSdk(
  appId: string,
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      if (!appId) {
        reject(
          new Error(
            "Falta configurar el App ID de Meta.",
          ),
        );

        return;
      }

      const metaWindow =
        window as MetaSdkWindow;

      function initialize() {
        if (!metaWindow.FB) {
          return false;
        }

        metaWindow.FB.init({
          appId,
          cookie: true,
          xfbml: false,
          version: "v25.0",
        });

        resolve();

        return true;
      }

      if (initialize()) {
        return;
      }

      metaWindow.fbAsyncInit = () => {
        if (!initialize()) {
          reject(
            new Error(
              "Meta no pudo iniciar su SDK.",
            ),
          );
        }
      };

      const existing =
        document.getElementById(
          "facebook-jssdk",
        ) as HTMLScriptElement | null;

      if (existing) {
        existing.addEventListener(
          "load",
          () => {
            initialize();
          },
          {
            once: true,
          },
        );

        return;
      }

      const script =
        document.createElement("script");

      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";

      script.src =
        "https://connect.facebook.net/es_LA/sdk.js";

      script.onerror = () => {
        reject(
          new Error(
            "No pudimos cargar la conexión segura de Meta.",
          ),
        );
      };

      document.body.appendChild(script);
    },
  );
}

async function launchMetaEmbeddedSignup(
  appId: string,
  configId: string,
) {
  await loadMetaSdk(appId);

  const metaWindow =
    window as MetaSdkWindow;

  if (!metaWindow.FB) {
    throw new Error(
      "El SDK de Meta no está disponible.",
    );
  }

  if (!configId) {
    throw new Error(
      "Falta configurar el Configuration ID de Meta.",
    );
  }

  return new Promise<
    EmbeddedSignupAssets & {
      code: string;
    }
  >((resolve, reject) => {
    let authorizationCode = "";

    let assets:
      | EmbeddedSignupAssets
      | null = null;

    let finished = false;

    const timeoutId =
      window.setTimeout(
        () => {
          finishWithError(
            "La autorización tardó demasiado. Inténtalo nuevamente.",
          );
        },
        5 * 60 * 1000,
      );

    function cleanup() {
      window.clearTimeout(timeoutId);

      window.removeEventListener(
        "message",
        handleMessage,
      );
    }

    function finishWithError(
      message: string,
    ) {
      if (finished) return;

      finished = true;
      cleanup();

      reject(new Error(message));
    }

    function finishIfReady() {
      if (
        finished ||
        !authorizationCode ||
        !assets?.wabaId
      ) {
        return;
      }

      finished = true;
      cleanup();

      resolve({
        ...assets,
        code: authorizationCode,
      });
    }

    function handleMessage(
      event: MessageEvent,
    ) {
      if (
        event.origin !==
          "https://www.facebook.com" &&
        event.origin !==
          "https://web.facebook.com"
      ) {
        return;
      }

      let payload:
        | {
            type?: string;
            event?: string;
            data?: {
              waba_id?: string;
              phone_number_id?: string;
              business_id?: string;
              error_message?: string;
            };
          }
        | undefined;

      try {
        payload =
          typeof event.data === "string"
            ? JSON.parse(event.data)
            : event.data;
      } catch {
        return;
      }

      if (
        payload?.type !==
        "WA_EMBEDDED_SIGNUP"
      ) {
        return;
      }

      if (
        payload.event === "CANCEL"
      ) {
        finishWithError(
          "La conexión con WhatsApp fue cancelada.",
        );

        return;
      }

      if (
        payload.event === "ERROR"
      ) {
        finishWithError(
          payload.data?.error_message ||
            "Meta no pudo completar la conexión.",
        );

        return;
      }

      if (
        payload.event === "FINISH"
      ) {
        const wabaId =
          payload.data?.waba_id || "";

        if (!wabaId) {
          finishWithError(
            "Meta terminó el proceso pero no devolvió la cuenta de WhatsApp.",
          );

          return;
        }

        assets = {
          wabaId,

          phoneNumberId:
            payload.data
              ?.phone_number_id,

          businessId:
            payload.data
              ?.business_id,

          flow: "standard",
        };

        finishIfReady();

        return;
      }

      if (
        payload.event ===
        "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
      ) {
        const wabaId =
          payload.data?.waba_id || "";

        if (!wabaId) {
          finishWithError(
            "Meta terminó la conexión de WhatsApp Business pero no devolvió la cuenta.",
          );

          return;
        }

        assets = {
          wabaId,

          phoneNumberId:
            payload.data
              ?.phone_number_id,

          businessId:
            payload.data
              ?.business_id,

          flow: "business_app",
        };

        finishIfReady();
      }
    }

    window.addEventListener(
      "message",
      handleMessage,
    );

    metaWindow.FB!.login(
      (response) => {
        const code =
          response.authResponse?.code
            ?.trim() || "";

        if (!code) {
          finishWithError(
            "No se completó la autorización de Meta.",
          );

          return;
        }

        authorizationCode = code;

        finishIfReady();
      },
      {
        config_id: configId,

        auth_type: "rerequest",

        response_type: "code",

        override_default_response_type:
          true,

        extras: {
          setup: {},

          /*
           * Permite que un negocio que ya
           * usa WhatsApp Business App
           * conecte ese mismo número.
           */
          featureType:
            "whatsapp_business_app_onboarding",

          sessionInfoVersion: "4",
        },
      },
    );
  });
}

function WhatsAppModule({
  workspace,
}: {
  workspace: SelectedWorkspace;
  action: (
    payload: Record<string, unknown>,
    message?: string,
    reload?: boolean,
  ) => Promise<unknown>;
}) {
  const [connecting, setConnecting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  const [connection, setConnection] =
    useState<
      MetaConnectResponse["meta"] | null
    >(null);

  const appId =
    process.env
      .NEXT_PUBLIC_META_APP_ID || "";

  const configId =
    process.env
      .NEXT_PUBLIC_META_CONFIG_ID || "";

  async function connectWhatsApp() {
    setConnecting(true);
    setError("");
    setFeedback("");
    setConnection(null);

    try {
      /*
       * 1. Abrimos directamente Meta.
       *
       * El cliente NO entra en ElevenLabs.
       */
      const signup =
        await launchMetaEmbeddedSignup(
          appId,
          configId,
        );

      setFeedback(
        "Meta autorizó WhatsApp. Progy está comprobando el número…",
      );

      /*
       * 2. Enviamos el código temporal
       * y los IDs al servidor.
       */
      const response = await fetch(
        "/api/whatsapp/connect",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            code: signup.code,

            wabaId:
              signup.wabaId,

            phoneNumberId:
              signup.phoneNumberId,

            businessId:
              signup.businessId,
          }),
        },
      );

      const result =
        (await response
          .json()
          .catch(() => ({}))) as MetaConnectResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No pudimos terminar la conexión de WhatsApp.",
        );
      }

      if (!result.meta?.wabaId) {
        throw new Error(
          "Meta autorizó WhatsApp pero Progy no recibió los datos necesarios.",
        );
      }

      setConnection(result.meta);

      setFeedback(
        result.meta.isOnBizApp
          ? "WhatsApp Business quedó autorizado y puede continuar funcionando en el teléfono mientras preparamos Progy."
          : "WhatsApp quedó autorizado correctamente con Progy.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar WhatsApp.",
      );
    } finally {
      setConnecting(false);
    }
  }

  const connected =
    Boolean(connection?.wabaId);

  return (
    <div className="whatsapp-setup">
      <section className="whatsapp-hero">
        <div className="whatsapp-orb">
          ◉
        </div>

        <div>
          <span className="panel-kicker">
            WHATSAPP BUSINESS
          </span>

          <h2>
            Conecta WhatsApp a Progy
          </h2>

          <p>
            Conecta el WhatsApp de{" "}
            {workspace.business.name} para
            que Progy pueda atender a tus
            clientes desde el mismo canal.
          </p>
        </div>

        <span
          className={`channel-state ${
            connected
              ? "ready"
              : "pending"
          }`}
        >
          {connected
            ? "✓ Autorizado"
            : "Pendiente"}
        </span>
      </section>

      <div className="whatsapp-grid">
        <Block
          step="01"
          title="Conecta tu WhatsApp"
          note="Configuración segura mediante Meta"
        >
          {!connected ? (
            <>
              <div className="privacy-note">
                <b>
                  Una sola conexión.
                </b>

                <p>
                  No necesitas copiar claves,
                  identificadores ni configurar
                  herramientas técnicas. Meta te
                  mostrará los WhatsApp que puedes
                  autorizar.
                </p>
              </div>

              <button
                className="button module-save"
                onClick={() =>
                  void connectWhatsApp()
                }
                disabled={
                  connecting ||
                  !appId ||
                  !configId
                }
              >
                {connecting
                  ? "Conectando con Meta…"
                  : "Conectar WhatsApp"}
              </button>

              <small className="guide-security">
                La contraseña y los códigos de
                verificación se introducen
                únicamente en las pantallas
                oficiales de Meta.
              </small>

              {(!appId ||
                !configId) && (
                <div className="form-message error">
                  Falta configurar el App ID o
                  Configuration ID de Meta en
                  Progy.
                </div>
              )}
            </>
          ) : (
            <div className="sync-summary">
              <span>
                ✓ Cuenta de WhatsApp autorizada
              </span>

              <span>
                ✓ Número encontrado
              </span>

              <span>
                {connection?.isOnBizApp
                  ? "✓ WhatsApp Business App conservado"
                  : "✓ WhatsApp Cloud API preparado"}
              </span>

              <span>
                ◷ Falta guardar la conexión
                definitiva
              </span>
            </div>
          )}

          {feedback && (
            <div className="connection-feedback">
              {feedback}
            </div>
          )}

          {error && (
            <div className="form-message error">
              {error}
            </div>
          )}
        </Block>

        <Block
          step="02"
          title="Estado"
          note="Progy verifica los datos automáticamente"
        >
          {!connected ? (
            <div className="activation-list interactive">
              <div>
                <span>1</span>

                <p>
                  <b>Autorizar con Meta</b>

                  <small>
                    Selecciona tu negocio y
                    WhatsApp.
                  </small>
                </p>
              </div>

              <div>
                <span>2</span>

                <p>
                  <b>
                    Comprobar el número
                  </b>

                  <small>
                    Progy lo detectará
                    automáticamente.
                  </small>
                </p>
              </div>

              <div>
                <span>3</span>

                <p>
                  <b>Preparar a Progy</b>

                  <small>
                    Mensajes, conocimiento y
                    voz.
                  </small>
                </p>
              </div>
            </div>
          ) : (
            <div className="settings-summary">
              <span>
                {initials(
                  connection?.verifiedName ||
                    workspace.business.name,
                )}
              </span>

              <div>
                <small>
                  WHATSAPP CONECTADO
                </small>

                <h2>
                  {connection?.verifiedName ||
                    connection?.wabaName ||
                    workspace.business.name}
                </h2>

                <p>
                  {connection?.phoneNumber ||
                    "Número conectado"}
                </p>

                {connection?.isOnBizApp && (
                  <p>
                    WhatsApp Business App +
                    Cloud API
                  </p>
                )}
              </div>
            </div>
          )}

          {connected && (
            <button
              className="secondary-check"
              onClick={() =>
                void connectWhatsApp()
              }
              disabled={connecting}
            >
              Volver a autorizar
            </button>
          )}
        </Block>
      </div>

      <section className="channel-explainer">
        <article>
          <span>✦</span>

          <div>
            <b>Sin configuración técnica</b>

            <p>
              El negocio no necesita conocer
              tokens, WABA ID, Phone Number ID
              ni APIs.
            </p>
          </div>
        </article>

        <article>
          <span>◖</span>

          <div>
            <b>
              Conserva WhatsApp Business
            </b>

            <p>
              Cuando Meta permita
              coexistencia para el número,
              podrá seguir utilizándose desde
              la aplicación del teléfono.
            </p>
          </div>
        </article>

        <article>
          <span>↗</span>

          <div>
            <b>
              Progy se configura después
            </b>

            <p>
              En el siguiente paso
              conectaremos mensajes,
              conocimiento, pedidos y
              automatizaciones.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

function TestModule({ workspace, integrations, action }: { workspace: SelectedWorkspace; integrations: IntegrationStatus; action: (payload: Record<string, unknown>, message?: string, reload?: boolean) => Promise<unknown> }) {
  const [scenario, setScenario] = useState(0); const [testing, setTesting] = useState(false); const [connecting, setConnecting] = useState(false); const [message, setMessage] = useState(""); const peerRef = useRef<RTCPeerConnection | null>(null); const streamRef = useRef<MediaStream | null>(null); const conversationRef = useRef<{ id: string; startedAt: number; scenario: string } | null>(null);
  const stop = useCallback((status: "completed" | "failed" = "completed") => { const peer = peerRef.current; const stream = streamRef.current; const current = conversationRef.current; peerRef.current = null; streamRef.current = null; conversationRef.current = null; if (peer) peer.onconnectionstatechange = null; peer?.close(); stream?.getTracks().forEach((track) => track.stop()); setTesting(false); setConnecting(false); if (current) void action({ action: "endConversation", businessId: workspace.business.id, conversationId: current.id, durationSeconds: Math.max(1, Math.round((Date.now() - current.startedAt) / 1000)), scenario: current.scenario, status }, status === "completed" ? "Prueba guardada en Conversaciones." : undefined, true); }, [action, workspace.business.id]);
  useEffect(() => () => stop(), [stop]);
  const scenarios = workspace.business.category_code === "restaurant" ? ["Realizar un pedido", "Preguntar por horarios", "Solicitar una reserva", "Conversación libre"] : workspace.business.category_code === "clinic" || workspace.business.category_code === "beauty_salon" ? ["Agendar una cita", "Preguntar precios", "Cambiar una cita", "Conversación libre"] : ["Preguntar por un servicio", "Consultar horarios", "Solicitar una reserva", "Conversación libre"];
  async function toggle() { if (testing || connecting) { stop(); return; } setMessage(""); setConnecting(true); try { const started = await action({ action: "startConversation", businessId: workspace.business.id, scenario: scenarios[scenario] }, undefined, false) as { conversation?: { id?: string } }; if (!started.conversation?.id) throw new Error("No pudimos preparar el historial de la prueba."); conversationRef.current = { id: started.conversation.id, startedAt: Date.now(), scenario: scenarios[scenario] }; const pc = new RTCPeerConnection(); peerRef.current = pc; const audio = document.createElement("audio"); audio.autoplay = true; pc.ontrack = (event) => { audio.srcObject = event.streams[0]; }; const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); streamRef.current = stream; pc.addTrack(stream.getAudioTracks()[0]); pc.createDataChannel("oai-events"); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); const response = await fetch(`/api/openai/realtime?businessId=${encodeURIComponent(workspace.business.id)}&scenario=${scenario}`, { method: "POST", body: offer.sdp, headers: { "Content-Type": "application/sdp" } }); if (!response.ok) { const data = await response.json().catch(() => ({})) as { error?: string }; throw new Error(data.error || "No se pudo iniciar la conversación."); } await pc.setRemoteDescription({ type: "answer", sdp: await response.text() }); pc.onconnectionstatechange = () => { if (pc.connectionState === "connected") { setConnecting(false); setTesting(true); } if (["failed", "closed", "disconnected"].includes(pc.connectionState)) stop(); }; } catch (cause) { stop("failed"); setMessage(cause instanceof Error ? cause.message : "No se pudo acceder al micrófono."); } }
  const ready = workspace.catalogItems.length > 0 && workspace.hours.length > 0;
  return <div className="test-studio"><section className="scenario-picker"><small>ESCENARIO DE PRUEBA</small><h3>¿Qué quieres comprobar?</h3>{scenarios.map((label, index) => <button className={scenario === index ? "selected" : ""} onClick={() => setScenario(index)} key={label}><span>{scenario === index ? "✓" : index + 1}</span>{label}</button>)}</section><section className={`test-call ${testing || connecting ? "calling" : ""}`}><div className="test-avatar"><span /><span /><span /></div><small>{connecting ? "CONECTANDO" : testing ? "PROGY ESTÁ ESCUCHANDO" : integrations.openai ? "OPENAI CONECTADO" : "OPENAI PENDIENTE"}</small><h2>{testing ? "Habla cuando quieras" : `Prueba a Progy para ${workspace.business.name}`}</h2><p>{message || (testing ? "La conversación usa tus horarios, catálogo y respuestas guardadas." : ready ? `Escenario: ${scenarios[scenario]}. Permite el micrófono para comenzar.` : "Antes de probar, agrega al menos un producto o servicio y revisa tus horarios.")}</p><div className="test-wave">{[20, 48, 31, 74, 44, 64, 28, 82, 56, 38, 67, 34, 52].map((height, index) => <i style={{ height: `${testing || connecting ? height : 8}%` }} key={index} />)}</div><button onClick={() => void toggle()} className="call-button" disabled={!integrations.openai || !ready}>{testing || connecting ? "■" : "▶"}</button><em>{testing || connecting ? "Finalizar prueba" : ready ? "Iniciar conversación" : "Completa la información básica"}</em></section><aside className="test-insights"><small>DATOS UTILIZADOS</small><div><span>01</span><b>{workspace.catalogItems.length} elementos<small>Productos o servicios</small></b></div><div><span>02</span><b>{workspace.knowledge.length} respuestas<small>Conocimiento adicional</small></b></div><div><span>03</span><b>{workspace.hours.length}/7 días<small>Horario configurado</small></b></div></aside></div>;
}

function ConversationModule({ rows, onGo }: { rows: Conversation[]; onGo: (section: string) => void }) { return <Block title="Historial real" note={`${rows.length} conversaciones cargadas`}>{rows.length ? <div className="conversation-list">{rows.map((row) => <article key={row.id}><span>◖</span><div><b>{row.customer_name || row.customer_phone || "Cliente sin identificar"}</b><small>{dateTime(row.started_at)} · {Math.round((row.duration_seconds || 0) / 60)} min · {row.channel.replaceAll("_", " ")}</small><p>{row.summary || row.outcome || "Sin resumen registrado"}</p></div><em>{row.status}</em></article>)}</div> : <EmptyState icon="☵" title="No hay conversaciones todavía" text="Las pruebas y llamadas reales aparecerán aquí cuando queden registradas." action="Realizar una prueba" onClick={() => onGo("pruebas")} />}</Block>; }

function OrdersModule({ orders, bookings }: { orders: Order[]; bookings: Booking[] }) {
  const [tab, setTab] = useState<"orders" | "bookings">(orders.length || !bookings.length ? "orders" : "bookings"); const total = orders.reduce((sum, row) => sum + Number(row.total || 0), 0);
  return <div className="module-grid"><div className="order-summary"><article><small>PEDIDOS</small><b>{orders.length}</b><em>registrados</em></article><article><small>CITAS Y RESERVAS</small><b>{bookings.length}</b><em>registradas</em></article><article><small>VALOR DE PEDIDOS</small><b>{money(total)}</b><em>total registrado</em></article></div><div className="module-tabs"><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Pedidos ({orders.length})</button><button className={tab === "bookings" ? "active" : ""} onClick={() => setTab("bookings")}>Citas y reservas ({bookings.length})</button></div><Block title={tab === "orders" ? "Pedidos recientes" : "Citas y reservas"}>{tab === "orders" ? (orders.length ? <div className="record-table">{orders.map((row) => <article key={row.id}><b>#{row.order_number}</b><div><strong>{row.customer_name || "Cliente sin identificar"}</strong><small>{dateTime(row.created_at)} · {row.fulfillment}</small></div><span>{money(row.total)}</span><em>{row.status}</em></article>)}</div> : <EmptyState icon="□" title="Aún no hay pedidos" text="Los pedidos que registre Progy aparecerán aquí." />) : (bookings.length ? <div className="record-table">{bookings.map((row) => <article key={row.id}><b>{row.type === "appointment" ? "CITA" : "RESERVA"}</b><div><strong>{row.customer_name || "Cliente sin identificar"}</strong><small>{dateTime(row.starts_at)}{row.party_size ? ` · ${row.party_size} personas` : ""}</small></div><span>{row.resource_name || "Sin recurso"}</span><em>{row.status}</em></article>)}</div> : <EmptyState icon="◇" title="Aún no hay citas ni reservas" text="Cuando Progy registre una, aparecerá aquí." />)}</Block></div>;
}

function UsageModule({ plan, usage }: { plan: Plan | null; usage: Usage[] }) { const used = (plan?.used_voice_seconds || 0) / 60; const included = (plan?.included_voice_seconds || 600) / 60; const cost = usage.reduce((sum, row) => sum + Number(row.estimated_cost_usd || 0), 0); const characters = usage.filter((row) => row.kind === "messages").reduce((sum, row) => sum + Number(row.quantity || 0), 0); return <div className="usage-layout"><section className="usage-hero"><span className="chip">{plan?.plan_code?.replaceAll("_", " ").toUpperCase() || "PLAN DE PRUEBA"}</span><h2>{used.toFixed(1)} de {included.toFixed(0)} minutos utilizados</h2><div className="usage-bar"><i style={{ width: `${Math.min(100, included ? used / included * 100 : 0)}%` }} /></div><p>Estos valores provienen del registro de consumo de tu negocio. No se muestran ejemplos inventados.</p>{plan?.trial_ends_at && <small>Prueba disponible hasta {dateTime(plan.trial_ends_at)}</small>}</section><div className="usage-cards"><article><small>VOZ UTILIZADA</small><b>{used.toFixed(1)} min</b><em>{Math.max(0, included - used).toFixed(1)} min disponibles</em></article><article><small>REGISTROS DE USO</small><b>{usage.length}</b><em>{characters ? `${characters} mensajes` : "sin mensajes medidos"}</em></article><article><small>COSTO ESTIMADO</small><b>{money(cost)}</b><em>según registros del proveedor</em></article></div></div>; }

function SettingsModule({ workspace, category, integrations }: { workspace: SelectedWorkspace; category?: Category; integrations: IntegrationStatus }) { return <div className="module-grid"><Block title="Servicios de Progy"><div className="integration-grid">{[["Cuenta protegida", "Sesión y datos privados del negocio", integrations.supabase], ["Conversación disponible", "Pruebas en tiempo real desde el panel", integrations.openai], ["Voces listas", "Selección y saludo natural", integrations.elevenlabs]].map(([name, description, ready]) => <article key={String(name)}><span className={ready ? "ready" : "waiting"}>{ready ? "✓" : "!"}</span><div><b>{String(name)}</b><small>{String(description)}</small></div><em>{ready ? "Disponible" : "En preparación"}</em></article>)}</div></Block><Block title="Negocio activo"><div className="settings-summary"><span>{initials(workspace.business.name)}</span><div><small>{category?.name || workspace.business.category_code}</small><h2>{workspace.business.name}</h2><p>{workspace.business.city || "Ciudad pendiente"}, {workspace.business.province || "provincia pendiente"} · {workspace.business.timezone || "America/Guayaquil"} · {workspace.business.currency || "USD"}</p></div></div></Block><Block title="Privacidad de datos"><div className="privacy-note"><b>Los datos están separados por usuario y negocio.</b><p>Progy consulta los registros permitidos por la sesión de tu cuenta. Una cuenta nueva sin negocios verá el tutorial de creación; no verá información de otra empresa.</p></div></Block></div>; }

function GuideDrawer({ completion, business, onClose, onGo }: { completion: ReturnType<typeof getCompletion>; business: Business; onClose: () => void; onGo: (section: string) => void }) { return <div className="guide-layer"><button className="guide-overlay" onClick={onClose} aria-label="Cerrar guía" /><aside className="guide-drawer"><button className="guide-close" onClick={onClose}>×</button><span className="panel-kicker">TU PRIMER ASISTENTE</span><h2>Configura a Progy para {business.name}</h2><p>Avanza en orden. Cada paso mejora lo que Progy puede responder durante la prueba.</p><div className="guide-progress"><b>{completion.percent}%</b><span><i style={{ width: `${completion.percent}%` }} /></span></div><div className="guide-steps">{completion.steps.map((step, index) => <button className={step.done ? "done" : ""} onClick={() => onGo(step.section)} key={step.label}><span>{step.done ? "✓" : index + 1}</span><div><b>{step.label}</b><small>{step.done ? "Completado — puedes revisarlo" : step.detail}</small></div><em>→</em></button>)}</div><small className="guide-note">Puedes volver a esta guía desde la barra superior o el menú lateral.</small></aside></div>; }

function EmptyState({ icon, title, text, action, onClick }: { icon: string; title: string; text: string; action?: string; onClick?: () => void }) { return <div className="empty-state"><span>{icon}</span><b>{title}</b><p>{text}</p>{action && onClick && <button onClick={onClick}>{action} →</button>}</div>; }
