import { randomUUID } from "node:crypto";
import { requireApiUser } from "../../../lib/integrations";
import { SupabaseDataError, supabaseDataRequest } from "../../../lib/supabase-data";

const previewCategories = [
  { code: "restaurant", name: "Restaurante", description: "Menú, pedidos, entrega y reservas", icon: "◉" },
  { code: "clinic", name: "Clínica", description: "Especialidades, profesionales y citas", icon: "+" },
  { code: "hotel", name: "Hotel", description: "Habitaciones, disponibilidad y reservas", icon: "◇" },
  { code: "hardware_store", name: "Ferretería", description: "Productos, precios y cotizaciones", icon: "⌂" },
  { code: "beauty_salon", name: "Salón de belleza", description: "Servicios, profesionales y citas", icon: "✦" },
  { code: "retail_store", name: "Tienda", description: "Productos, pedidos y promociones", icon: "□" },
  { code: "professional_services", name: "Servicios profesionales", description: "Consultas, prospectos y cotizaciones", icon: "▤" },
  { code: "other", name: "Otro", description: "Configura el flujo según tu negocio", icon: "…" },
];

type UnknownRow = Record<string, unknown>;

function jsonError(error: unknown) {
  if (error instanceof SupabaseDataError) {
    return Response.json(
      { error: error.message, ...(error.publicCode ? { code: error.publicCode } : {}) },
      { status: error.status },
    );
  }
  console.error("Progy workspace request failed", { correlationId: randomUUID() });
  return Response.json({ error: "No pudimos completar la operación en este momento." }, { status: 500 });
}

function enc(value: string) { return encodeURIComponent(value); }

async function snapshot(userId: string, requestedBusinessId?: string | null) {
  const [categories, businesses] = await Promise.all([
    supabaseDataRequest<UnknownRow[]>("business_categories?is_active=eq.true&select=code,name,description,icon,sort_order&order=sort_order.asc"),
    supabaseDataRequest<UnknownRow[]>(`businesses?owner_id=eq.${enc(userId)}&select=*&order=created_at.asc`),
  ]);
  const selected = businesses.find((business) => business.id === requestedBusinessId) ?? businesses[0] ?? null;
  if (!selected) return { categories, businesses, selected: null };

  const id = enc(String(selected.id));
  const [agents, hours, features, catalogCategories, catalogItems, knowledge, plans, conversations, orders, bookings, usage] = await Promise.all([
    supabaseDataRequest<UnknownRow[]>(`agent_configs?business_id=eq.${id}&select=*`),
    supabaseDataRequest<UnknownRow[]>(`business_hours?business_id=eq.${id}&select=*&order=day_of_week.asc`),
    supabaseDataRequest<UnknownRow[]>(`business_features?business_id=eq.${id}&select=*&order=feature_code.asc`),
    supabaseDataRequest<UnknownRow[]>(`catalog_categories?business_id=eq.${id}&select=*&order=sort_order.asc,name.asc`),
    supabaseDataRequest<UnknownRow[]>(`catalog_items?business_id=eq.${id}&select=*&order=sort_order.asc,name.asc`),
    supabaseDataRequest<UnknownRow[]>(`knowledge_items?business_id=eq.${id}&select=*&order=priority.desc,created_at.desc`),
    supabaseDataRequest<UnknownRow[]>(`business_plans?business_id=eq.${id}&select=*`),
    supabaseDataRequest<UnknownRow[]>(`conversations?business_id=eq.${id}&select=*&order=started_at.desc&limit=30`),
    supabaseDataRequest<UnknownRow[]>(`orders?business_id=eq.${id}&select=*&order=created_at.desc&limit=30`),
    supabaseDataRequest<UnknownRow[]>(`bookings?business_id=eq.${id}&select=*&order=created_at.desc&limit=30`),
    supabaseDataRequest<UnknownRow[]>(`usage_ledger?business_id=eq.${id}&select=*&order=created_at.desc&limit=200`),
  ]);
  let agent = agents[0] ?? null;
  if (agent && String(agent.agent_name || "").toLowerCase() === "kely") {
    const migrated = await supabaseDataRequest<UnknownRow[]>(`agent_configs?business_id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        agent_name: "Progy",
        greeting: String(agent.greeting || "").replaceAll("Kely", "Progy").replaceAll("kely", "Progy"),
      }),
      prefer: "return=representation",
    });
    agent = migrated[0] ?? { ...agent, agent_name: "Progy" };
  }
  return {
    categories,
    businesses,
    selected: {
      business: selected,
      agent,
      hours,
      features,
      catalogCategories,
      catalogItems,
      knowledge,
      plan: plans[0] ?? null,
      conversations,
      orders,
      bookings,
      usage,
    },
  };
}

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para abrir tu panel." }, { status: 401 });
  if (process.env.NODE_ENV !== "production" && !process.env.SUPABASE_URL) {
    const business = { id: "preview-business", owner_id: user.id, category_code: "restaurant", name: "Café Horizonte", description: "Cafetería y desayunos", phone: "+593990000000", whatsapp_phone: "+593990000000", city: "Quito", province: "Pichincha", country_code: "EC", timezone: "America/Guayaquil", currency: "USD", status: "trial" };
    return Response.json({ categories: previewCategories, businesses: [business], selected: { business, agent: { id: "preview-agent", business_id: business.id, agent_name: "Progy", language_code: "es-EC", greeting: "Hola, gracias por comunicarte con Café Horizonte. Soy Progy, ¿en qué puedo ayudarte?", tone: "cálido, natural y profesional", voice_id: null, collect_customer_name: true, collect_customer_phone: true, fallback_message: "Puedo comunicarte con una persona del negocio.", settings: {} }, hours: Array.from({ length: 7 }, (_, day) => ({ id: `hour-${day}`, day_of_week: day, opens_at: day ? "08:00" : null, closes_at: day ? "18:00" : null, is_closed: day === 0 })), features: [{ id: "feature-1", feature_code: "answer_questions", enabled: true, available_in_trial: true }, { id: "feature-2", feature_code: "take_orders", enabled: true, available_in_trial: true }], catalogCategories: [], catalogItems: [{ id: "item-1", kind: "product", name: "Desayuno de la casa", description: "Café, jugo y sándwich", price: 6.5, stock_quantity: 0, track_stock: false, is_available: true }], knowledge: [], plan: { plan_code: "trial", status: "active", included_voice_seconds: 600, used_voice_seconds: 0 }, conversations: [], orders: [], bookings: [], usage: [] } });
  }
  try {
    const businessId = new URL(request.url).searchParams.get("businessId");
    return Response.json(await snapshot(user.id, businessId));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") return Response.json({ error: "La solicitud no es válida." }, { status: 400 });

  try {
    if (body.action === "createBusiness") {
      const name = String(body.name ?? "").trim();
      const categoryCode = String(body.categoryCode ?? "").trim();
      if (!name || !categoryCode) throw new SupabaseDataError("Elige el tipo de negocio y escribe su nombre.", 400);
      const createdPayload = await supabaseDataRequest<UnknownRow | UnknownRow[]>("rpc/create_business_for_current_user", {
        method: "POST",
        body: JSON.stringify({
          p_name: name,
          p_category_code: categoryCode,
          p_slug: null,
          p_description: String(body.description ?? "").trim() || null,
          p_phone: String(body.phone ?? "").trim() || null,
          p_whatsapp_phone: String(body.whatsappPhone ?? "").trim() || null,
          p_email: user.email,
          p_website_url: String(body.websiteUrl ?? "").trim() || null,
          p_address: String(body.address ?? "").trim() || null,
          p_city: String(body.city ?? "").trim() || null,
          p_province: String(body.province ?? "").trim() || null,
        }),
        prefer: "return=representation",
      });
      const created = Array.isArray(createdPayload) ? createdPayload[0] : createdPayload;
      if (!created?.id) throw new SupabaseDataError("El negocio no pudo crearse.", 500);
      const businessId = String(created.id);
      const greeting = `Hola, gracias por comunicarte con ${name}. Soy Progy, ¿en qué puedo ayudarte?`;
      const updatedAgent = await supabaseDataRequest<UnknownRow[]>(`agent_configs?business_id=eq.${enc(businessId)}`, {
        method: "PATCH",
        body: JSON.stringify({ agent_name: "Progy", greeting, tone: "cálido, natural y profesional" }),
        prefer: "return=representation",
      });
      if (!updatedAgent.length) {
        await supabaseDataRequest("agent_configs", {
          method: "POST",
          body: JSON.stringify({ business_id: businessId, agent_name: "Progy", greeting }),
          prefer: "return=minimal",
        });
      }
      const defaultHours = Array.from({ length: 7 }, (_, day) => ({
        business_id: businessId,
        day_of_week: day,
        is_closed: day === 0,
        opens_at: day === 0 ? null : "08:00",
        closes_at: day === 0 ? null : "18:00",
      }));
      await supabaseDataRequest("business_hours?on_conflict=business_id,day_of_week", {
        method: "POST",
        body: JSON.stringify(defaultHours),
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      return Response.json({ business: created }, { status: 201 });
    }

    const businessId = String(body.businessId ?? "");
    if (!businessId) throw new SupabaseDataError("Selecciona un negocio antes de guardar.", 400);
    const businessFilter = `business_id=eq.${enc(businessId)}`;

    if (body.action === "updateBusiness") {
      const allowed = ["name", "description", "phone", "whatsapp_phone", "email", "website_url", "address", "city", "province", "accepts_online_orders", "accepts_online_bookings"];
      const data = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, body[key] === "" ? null : body[key]]));
      const rows = await supabaseDataRequest<UnknownRow[]>(`businesses?id=eq.${enc(businessId)}&owner_id=eq.${enc(user.id)}`, { method: "PATCH", body: JSON.stringify(data), prefer: "return=representation" });
      if (!rows.length) throw new SupabaseDataError("No encontramos un negocio que puedas editar.", 403);
      return Response.json({ business: rows[0] });
    }

    if (body.action === "saveHours") {
      const values = Array.isArray(body.hours) ? body.hours : [];
      const hours = values.slice(0, 7).map((entry) => {
        const row = entry as Record<string, unknown>;
        const isClosed = Boolean(row.is_closed);
        return {
          business_id: businessId,
          day_of_week: Math.max(0, Math.min(6, Number(row.day_of_week))),
          is_closed: isClosed,
          opens_at: isClosed ? null : String(row.opens_at || "08:00"),
          closes_at: isClosed ? null : String(row.closes_at || "18:00"),
        };
      });
      await supabaseDataRequest("business_hours?on_conflict=business_id,day_of_week", { method: "POST", body: JSON.stringify(hours), prefer: "resolution=merge-duplicates,return=minimal" });
      return Response.json({ ok: true });
    }

    if (body.action === "saveAgent") {
      const allowed = ["agent_name", "language_code", "greeting", "tone", "voice_id", "collect_customer_name", "collect_customer_phone", "fallback_message", "settings"];
      const data = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, body[key]]));
      const rows = await supabaseDataRequest<UnknownRow[]>(`agent_configs?${businessFilter}`, { method: "PATCH", body: JSON.stringify(data), prefer: "return=representation" });
      if (!rows.length) throw new SupabaseDataError("No encontramos la configuración de este asistente.", 404);
      return Response.json({ agent: rows[0] });
    }

    if (body.action === "saveFeature") {
      const featureCode = String(body.featureCode ?? "");
      await supabaseDataRequest(`business_features?${businessFilter}&feature_code=eq.${enc(featureCode)}`, { method: "PATCH", body: JSON.stringify({ enabled: Boolean(body.enabled) }), prefer: "return=minimal" });
      return Response.json({ ok: true });
    }

    if (body.action === "startConversation") {
      const scenario = String(body.scenario ?? "Prueba libre").slice(0, 160);
      const rows = await supabaseDataRequest<UnknownRow[]>("conversations", {
        method: "POST",
        body: JSON.stringify({
          business_id: businessId,
          customer_id: user.id,
          customer_name: user.name,
          channel: "web_voice",
          status: "active",
          is_trial: true,
          outcome: scenario,
          metadata: { source: "progy_panel_test", scenario },
        }),
        prefer: "return=representation",
      });
      if (!rows[0]) throw new SupabaseDataError("No pudimos registrar el inicio de la prueba.", 500);
      return Response.json({ conversation: rows[0] }, { status: 201 });
    }

    if (body.action === "endConversation") {
      const conversationId = String(body.conversationId ?? "");
      if (!conversationId) throw new SupabaseDataError("La conversación no es válida.", 400);
      const status = body.status === "failed" ? "failed" : "completed";
      const duration = Math.max(0, Math.min(3600, Number(body.durationSeconds || 0)));
      const rows = await supabaseDataRequest<UnknownRow[]>(`conversations?id=eq.${enc(conversationId)}&${businessFilter}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          summary: status === "failed" ? "La prueba no pudo completarse." : "Prueba de voz realizada desde el panel de Progy.",
          outcome: String(body.scenario ?? "Prueba del asistente").slice(0, 160),
        }),
        prefer: "return=representation",
      });
      if (!rows[0]) throw new SupabaseDataError("No pudimos cerrar la conversación de prueba.", 404);
      return Response.json({ conversation: rows[0] });
    }

    if (body.action === "saveCatalogItem") {
      const id = body.id ? String(body.id) : "";
      const kind = body.kind === "service" ? "service" : "product";
      const data = {
        business_id: businessId,
        kind,
        name: String(body.name ?? "").trim(),
        description: String(body.description ?? "").trim() || null,
        price: Math.max(0, Number(body.price || 0)),
        duration_minutes: kind === "service" && body.durationMinutes ? Math.max(1, Number(body.durationMinutes)) : null,
        stock_quantity: kind === "product" && body.stockQuantity ? Math.max(0, Number(body.stockQuantity)) : 0,
        track_stock: kind === "product" && Boolean(body.trackStock),
        is_available: body.isAvailable !== false,
      };
      if (!data.name) throw new SupabaseDataError("Escribe el nombre del producto o servicio.", 400);
      const path = id ? `catalog_items?id=eq.${enc(id)}&${businessFilter}` : "catalog_items";
      const rows = await supabaseDataRequest<UnknownRow[]>(path, { method: id ? "PATCH" : "POST", body: JSON.stringify(data), prefer: "return=representation" });
      return Response.json({ item: rows[0] }, { status: id ? 200 : 201 });
    }

    if (body.action === "deleteCatalogItem") {
      await supabaseDataRequest(`catalog_items?id=eq.${enc(String(body.id ?? ""))}&${businessFilter}`, { method: "DELETE", prefer: "return=minimal" });
      return Response.json({ ok: true });
    }

    if (body.action === "saveKnowledge") {
      const id = body.id ? String(body.id) : "";
      const allowedKinds = ["faq", "policy", "instruction", "location", "payment_method", "other"];
      const kind = allowedKinds.includes(String(body.kind)) ? String(body.kind) : "faq";
      const data = {
        business_id: businessId,
        kind,
        title: String(body.title ?? "").trim(),
        question: String(body.question ?? "").trim() || null,
        answer: String(body.answer ?? "").trim(),
        is_active: body.isActive !== false,
      };
      if (!data.title || !data.answer) throw new SupabaseDataError("Completa el título y la respuesta.", 400);
      const path = id ? `knowledge_items?id=eq.${enc(id)}&${businessFilter}` : "knowledge_items";
      const rows = await supabaseDataRequest<UnknownRow[]>(path, { method: id ? "PATCH" : "POST", body: JSON.stringify(data), prefer: "return=representation" });
      return Response.json({ item: rows[0] }, { status: id ? 200 : 201 });
    }

    if (body.action === "deleteKnowledge") {
      await supabaseDataRequest(`knowledge_items?id=eq.${enc(String(body.id ?? ""))}&${businessFilter}`, { method: "DELETE", prefer: "return=minimal" });
      return Response.json({ ok: true });
    }

    throw new SupabaseDataError("La acción solicitada no existe.", 400);
  } catch (error) { return jsonError(error); }
}
