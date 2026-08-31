import { isLibraryVoice, listElevenLabsVoices } from "../voice/catalog";
import { SupabaseDataError, supabaseDataRequest } from "@/lib/data/supabase";
import { getOnboardingTemplate, TEMPLATE_VERSION } from "./templates";
import { getNicheProfile } from "../niche/profile";
import { initializeTrialPlan } from "../billing/quota";
import type { OnboardingActivationStatus, OnboardingChannelStatus, OnboardingFlowStatus, OnboardingReadiness, OnboardingSnapshot } from "@shared/types/onboarding";

type Row = Record<string, unknown>;

function enc(value: string) { return encodeURIComponent(value); }
function text(row: Row | null | undefined, key: string) { return String(row?.[key] ?? ""); }
function bool(row: Row | null | undefined, key: string) { return Boolean(row?.[key]); }
function isConflict(error: unknown) { return error instanceof SupabaseDataError && error.status === 409; }

async function findBusiness(userId: string, businessId: string) {
  const businesses = await supabaseDataRequest<Row[]>(`businesses?id=eq.${enc(businessId)}&select=*`);
  const business = businesses[0];
  if (!business) throw new SupabaseDataError("No encontramos este negocio.", 404);

  if (text(business, "owner_id") === userId) return business;
  const members = await supabaseDataRequest<Row[]>(`business_members?business_id=eq.${enc(businessId)}&user_id=eq.${enc(userId)}&is_active=eq.true&select=role`);
  if (["owner", "manager", "admin"].includes(text(members[0], "role"))) return business;
  throw new SupabaseDataError("No tienes permiso para gestionar este negocio.", 403);
}

async function findPendingBusiness(userId: string, name: string, categoryCode: string) {
  const businesses = await supabaseDataRequest<Row[]>(`businesses?owner_id=eq.${enc(userId)}&category_code=eq.${enc(categoryCode)}&select=*&order=created_at.desc&limit=10`);
  for (const business of businesses) {
    if (text(business, "name").trim().toLowerCase() !== name.trim().toLowerCase()) continue;
    const states = await supabaseDataRequest<Row[]>(`business_onboarding?business_id=eq.${enc(text(business, "id"))}&select=flow_status,activation_status`);
    if (!states[0] && text(business, "status") !== "active") return business;
    if (states[0] && text(states[0], "activation_status") !== "active") return business;
  }
  return null;
}

async function ensureOnboardingRow(businessId: string, patch: Partial<Row> = {}) {
  const payload = { business_id: businessId, template_version: TEMPLATE_VERSION, ...patch };
  const current = await supabaseDataRequest<Row[]>(`business_onboarding?business_id=eq.${enc(businessId)}&select=*`);
  if (current[0]) {
    if (!Object.keys(patch).length) return current[0];
    const updated = await supabaseDataRequest<Row[]>(`business_onboarding?business_id=eq.${enc(businessId)}`, { method: "PATCH", body: JSON.stringify(patch), prefer: "return=representation" });
    return updated[0] ?? { ...current[0], ...patch };
  }
  try {
    const created = await supabaseDataRequest<Row[]>("business_onboarding", { method: "POST", body: JSON.stringify(payload), prefer: "return=representation" });
    if (!created[0]) throw new SupabaseDataError("No pudimos preparar el estado del onboarding.", 500);
    return created[0];
  } catch (error) {
    if (!isConflict(error)) throw error;
    const updated = await supabaseDataRequest<Row[]>(`business_onboarding?business_id=eq.${enc(businessId)}`, { method: "PATCH", body: JSON.stringify(patch), prefer: "return=representation" });
    if (!updated[0]) throw error;
    return updated[0];
  }
}

async function upsertTemplateRow(table: "catalog_items" | "knowledge_items", businessId: string, key: string, payload: Row) {
  const existing = await supabaseDataRequest<Row[]>(`${table}?business_id=eq.${enc(businessId)}&template_key=eq.${enc(key)}&select=id`);
  if (existing[0]) {
    await supabaseDataRequest(`${table}?id=eq.${enc(text(existing[0], "id"))}&business_id=eq.${enc(businessId)}`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
    return;
  }
  try {
    await supabaseDataRequest(table, { method: "POST", body: JSON.stringify(payload), prefer: "return=minimal" });
  } catch (error) {
    if (!isConflict(error)) throw error;
    const concurrent = await supabaseDataRequest<Row[]>(`${table}?business_id=eq.${enc(businessId)}&template_key=eq.${enc(key)}&select=id`);
    if (!concurrent[0]) throw error;
    await supabaseDataRequest(`${table}?id=eq.${enc(text(concurrent[0], "id"))}&business_id=eq.${enc(businessId)}`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
  }
}

async function upsertTemplateCatalog(businessId: string, template: ReturnType<typeof getOnboardingTemplate>) {
  for (const item of template.catalog) {
    const payload = {
      business_id: businessId,
      template_key: item.key,
      is_demo: true,
      sku: `demo-${template.code}-${item.key}`,
      kind: item.kind,
      name: item.name,
      description: item.description,
      price: item.price,
      duration_minutes: item.durationMinutes ?? null,
      stock_quantity: 0,
      track_stock: false,
      is_available: true,
      sort_order: item.sortOrder,
    };
    await upsertTemplateRow("catalog_items", businessId, item.key, payload);
  }
}

async function upsertTemplateKnowledge(businessId: string, template: ReturnType<typeof getOnboardingTemplate>) {
  for (const item of template.knowledge) {
    const payload = {
      business_id: businessId,
      template_key: item.key,
      is_demo: true,
      kind: item.kind,
      title: item.title,
      question: item.question,
      answer: item.answer,
      priority: item.priority,
      is_active: true,
    };
    await upsertTemplateRow("knowledge_items", businessId, item.key, payload);
  }
}

export async function ensureNicheDefaults(businessId: string, categoryCode: string) {
  const niche = await getNicheProfile(categoryCode);
  const featureCodes = [...new Set(niche.default_feature_codes)];
  if (featureCodes.length) {
    const existingFeatures = await supabaseDataRequest<Row[]>(`business_features?business_id=eq.${enc(businessId)}&feature_code=in.(${featureCodes.map(enc).join(",")})&select=id,feature_code`);
    for (const featureCode of featureCodes) {
      const payload = { business_id: businessId, feature_code: featureCode, enabled: true, available_in_trial: true };
      const existing = existingFeatures.find((feature) => text(feature, "feature_code") === featureCode);
      if (existing) {
        await supabaseDataRequest(`business_features?id=eq.${enc(text(existing, "id"))}&business_id=eq.${enc(businessId)}`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
      } else {
        await supabaseDataRequest("business_features", { method: "POST", body: JSON.stringify(payload), prefer: "return=minimal" });
      }
    }
  }
  if (niche.default_tool_codes.length) {
    await supabaseDataRequest("business_tool_settings?on_conflict=business_id,tool_code", {
      method: "POST",
      body: JSON.stringify(niche.default_tool_codes.map((toolCode) => ({ business_id: businessId, tool_code: toolCode, enabled: true, config: {} }))),
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }
  return niche;
}

async function seedTemplate(businessId: string, name: string, categoryCode: string) {
  const template = getOnboardingTemplate(categoryCode);
  await ensureOnboardingRow(businessId, { flow_status: "business_created", activation_status: "preparing", template_version: template.version });

  const greeting = `Hola, gracias por comunicarte con ${name}. Soy Progy, ¿en qué puedo ayudarte?`;
  const agents = await supabaseDataRequest<Row[]>(`agent_configs?business_id=eq.${enc(businessId)}&select=id`);
  if (agents[0]) {
    await supabaseDataRequest(`agent_configs?id=eq.${enc(text(agents[0], "id"))}&business_id=eq.${enc(businessId)}`, { method: "PATCH", body: JSON.stringify({ agent_name: "Progy", greeting, tone: template.tone }), prefer: "return=minimal" });
  } else {
    await supabaseDataRequest("agent_configs", { method: "POST", body: JSON.stringify({ business_id: businessId, agent_name: "Progy", greeting, tone: template.tone }), prefer: "return=minimal" });
  }

  await supabaseDataRequest("business_hours?on_conflict=business_id,day_of_week", {
    method: "POST",
    body: JSON.stringify(template.hours.map((hour) => ({ business_id: businessId, day_of_week: hour.dayOfWeek, is_closed: hour.isClosed, opens_at: hour.opensAt, closes_at: hour.closesAt }))),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  const existingFeatures = await supabaseDataRequest<Row[]>(`business_features?business_id=eq.${enc(businessId)}&feature_code=in.(${template.features.map(enc).join(",")})&select=id,feature_code`);
  for (const featureCode of template.features) {
    const payload = { business_id: businessId, feature_code: featureCode, enabled: true, available_in_trial: true };
    const existing = existingFeatures.find((feature) => text(feature, "feature_code") === featureCode);
    if (existing) {
      await supabaseDataRequest(`business_features?id=eq.${enc(text(existing, "id"))}&business_id=eq.${enc(businessId)}`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
    } else {
      await supabaseDataRequest("business_features", { method: "POST", body: JSON.stringify(payload), prefer: "return=minimal" });
    }
  }
  await ensureNicheDefaults(businessId, categoryCode);
  await upsertTemplateCatalog(businessId, template);
  await upsertTemplateKnowledge(businessId, template);
  return ensureOnboardingRow(businessId, { template_version: template.version });
}

export async function createBusinessFromTemplate(userId: string, input: { name: string; categoryCode: string; businessId?: string }) {
  const name = input.name.trim().slice(0, 160);
  const categoryCode = input.categoryCode.trim();
  if (!name || !categoryCode) throw new SupabaseDataError("Escribe el nombre y elige el tipo de negocio.", 400);
  const template = getOnboardingTemplate(categoryCode);
  if (template.code !== categoryCode) throw new SupabaseDataError("La categoría seleccionada no es válida.", 400);

  let business: Row | null = input.businessId ? await findBusiness(userId, input.businessId) : await findPendingBusiness(userId, name, categoryCode);
  let created = false;
  if (!business) {
    const categories = await supabaseDataRequest<Row[]>(`business_categories?code=eq.${enc(categoryCode)}&is_active=eq.true&select=code`);
    if (!categories[0]) throw new SupabaseDataError("La categoría seleccionada no está disponible.", 400);
    const createdPayload = await supabaseDataRequest<Row | Row[]>("rpc/create_business_for_current_user", {
      method: "POST",
      body: JSON.stringify({ p_name: name, p_category_code: categoryCode, p_slug: null, p_description: null, p_phone: null, p_whatsapp_phone: null, p_email: null, p_website_url: null, p_address: null, p_city: null, p_province: null }),
      prefer: "return=representation",
    });
    business = Array.isArray(createdPayload) ? createdPayload[0] : createdPayload;
    created = true;
  }
  if (!business?.id) throw new SupabaseDataError("El negocio no pudo crearse.", 500);
  if (created) await initializeTrialPlan(text(business, "id"));
  const onboarding = await seedTemplate(text(business, "id"), text(business, "name") || name, text(business, "category_code") || categoryCode);
  return { business, onboarding };
}

export async function saveDemoForBusiness(userId: string, input: { businessId: string; voiceId: string; scenarioId: string }) {
  const business = await findBusiness(userId, input.businessId);
  const template = getOnboardingTemplate(text(business, "category_code"));
  if (!template.scenarios.some((scenario) => scenario.id === input.scenarioId)) throw new SupabaseDataError("La situación de prueba no es válida.", 400);
  const voices = await listElevenLabsVoices();
  const selectedVoice = voices.find((voice) => voice.id === input.voiceId);
  if (!selectedVoice || isLibraryVoice(selectedVoice)) throw new SupabaseDataError("La voz elegida no puede generar audio con el plan actual. Selecciona otra voz.", 400);
  const agents = await supabaseDataRequest<Row[]>(`agent_configs?business_id=eq.${enc(input.businessId)}&select=id`);
  if (!agents[0]) throw new SupabaseDataError("La configuración de Progy no está disponible.", 404);
  await supabaseDataRequest(`agent_configs?id=eq.${enc(text(agents[0], "id"))}&business_id=eq.${enc(input.businessId)}`, { method: "PATCH", body: JSON.stringify({ voice_id: input.voiceId }), prefer: "return=minimal" });
  return ensureOnboardingRow(input.businessId, { flow_status: "demo_completed", selected_voice_id: input.voiceId, selected_scenario_key: input.scenarioId, demo_completed_at: new Date().toISOString() });
}

export async function markChannelSkipped(userId: string, businessId: string) {
  await findBusiness(userId, businessId);
  const current = await ensureOnboardingRow(businessId);
  if (text(current, "flow_status") !== "demo_completed") throw new SupabaseDataError("Completa la prueba de Progy antes de omitir WhatsApp.", 422);
  return ensureOnboardingRow(businessId, { flow_status: "channel_skipped", channel_status: "skipped", channel_updated_at: new Date().toISOString() });
}

export async function markChannelConnected(userId: string, businessId: string) {
  await findBusiness(userId, businessId);
  const current = await ensureOnboardingRow(businessId);
  if (text(current, "flow_status") !== "demo_completed") throw new SupabaseDataError("Completa la prueba de Progy antes de conectar WhatsApp.", 422);
  return ensureOnboardingRow(businessId, { flow_status: "channel_connected", channel_status: "connected", channel_updated_at: new Date().toISOString() });
}

export function calculateReadiness(business: Row, onboarding: Row, agent: Row | null, hours: Row[], catalogItems: Row[]): OnboardingReadiness {
  const validHour = (hour: Row) => {
    if (bool(hour, "is_closed")) return false;
    const opensAt = text(hour, "opens_at");
    const closesAt = text(hour, "closes_at");
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    return timePattern.test(opensAt) && timePattern.test(closesAt) && opensAt < closesAt;
  };
  const realCatalog = catalogItems.some((item) => !bool(item, "is_demo") && bool(item, "is_available"));
  const basicInfo = Boolean(text(business, "description") || text(business, "phone") || text(business, "address") || text(business, "city"));
  const readiness = {
    business: Boolean(text(business, "name") && text(business, "category_code")),
    voice: Boolean(text(agent, "voice_id") && text(onboarding, "selected_voice_id") === text(agent, "voice_id")),
    hours: hours.some(validHour),
    catalog: realCatalog,
    basicInfo,
    demo: ["demo_completed", "channel_skipped", "channel_connected", "onboarding_completed"].includes(text(onboarding, "flow_status")),
    channel: text(onboarding, "channel_status") === "connected",
    ready: false,
  };
  readiness.ready = Object.values(readiness).every(Boolean);
  return readiness;
}

export async function getOnboardingSnapshot(userId: string, businessId: string) {
  const business = await findBusiness(userId, businessId);
  const id = enc(businessId);
  const [onboardingRows, agents, hours, catalogItems, knowledge] = await Promise.all([
    supabaseDataRequest<Row[]>(`business_onboarding?business_id=eq.${id}&select=*`),
    supabaseDataRequest<Row[]>(`agent_configs?business_id=eq.${id}&select=*`),
    supabaseDataRequest<Row[]>(`business_hours?business_id=eq.${id}&select=*&order=day_of_week.asc`),
    supabaseDataRequest<Row[]>(`catalog_items?business_id=eq.${id}&select=*&order=sort_order.asc,name.asc`),
    supabaseDataRequest<Row[]>(`knowledge_items?business_id=eq.${id}&select=*&order=priority.desc,created_at.desc`),
  ]);
  let onboarding = onboardingRows[0] ?? await ensureOnboardingRow(businessId, { template_version: TEMPLATE_VERSION });
  const readiness = calculateReadiness(business, onboarding, agents[0] ?? null, hours, catalogItems);
  if (readiness.ready && text(onboarding, "activation_status") !== "active") {
    onboarding = await ensureOnboardingRow(businessId, { activation_status: "ready" });
  }
  return { business, onboarding, agent: agents[0] ?? null, hours, catalogItems, knowledge, readiness } satisfies OnboardingSnapshot;
}

export async function activateBusiness(userId: string, businessId: string) {
  const snapshot = await getOnboardingSnapshot(userId, businessId);
  if (!snapshot.readiness.ready) throw new SupabaseDataError("Completa los requisitos antes de activar la atención.", 422);
  const updated = await supabaseDataRequest<Row[]>(`businesses?id=eq.${enc(businessId)}`, { method: "PATCH", body: JSON.stringify({ status: "active" }), prefer: "return=representation" });
  if (!updated[0]) throw new SupabaseDataError("No pudimos activar este negocio.", 403);
  return ensureOnboardingRow(businessId, { flow_status: "onboarding_completed", activation_status: "active", completed_at: new Date().toISOString(), activated_at: new Date().toISOString() });
}

export type OnboardingStatePatch = {
  flowStatus?: OnboardingFlowStatus;
  activationStatus?: OnboardingActivationStatus;
  channelStatus?: OnboardingChannelStatus;
};
