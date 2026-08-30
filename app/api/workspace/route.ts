import { randomUUID } from "node:crypto";
import { requireApiUser } from "@/lib/auth/supabase";
import { SupabaseDataError, supabaseDataRequest } from "@/lib/data/supabase";
import { calculateReadiness } from "../../../lib/onboarding/service";
import { cleanText, isRecord, requiredText, validBoolean, validEmail, validFiniteNumber, validIdentifier } from "@shared/validation/input";

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
  const [agents, hours, features, catalogCategories, catalogItems, knowledge, plans, conversations, orders, bookings, usage, onboardingRows] = await Promise.all([
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
    supabaseDataRequest<UnknownRow[]>(`business_onboarding?business_id=eq.${id}&select=*`),
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
      onboarding: onboardingRows[0] ?? null,
      readiness: onboardingRows[0] ? calculateReadiness(selected, onboardingRows[0], agent, hours, catalogItems) : null,
    },
  };
}

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para abrir tu panel." }, { status: 401 });
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

    const businessId = validIdentifier(body.businessId);
    if (!businessId) throw new SupabaseDataError("Selecciona un negocio antes de guardar.", 400);
    const businessFilter = `business_id=eq.${enc(businessId)}`;

    if (body.action === "updateBusiness") {
      const textFields: Record<string, number> = { name: 160, description: 1000, phone: 40, whatsapp_phone: 40, website_url: 300, address: 300, city: 120, province: 120 };
      const data: Record<string, unknown> = {};
      for (const [key, max] of Object.entries(textFields)) {
        if (!(key in body)) continue;
        if (body[key] === null) { data[key] = null; continue; }
        if (typeof body[key] !== "string") throw new SupabaseDataError(`El campo ${key} no es válido.`, 400);
        const value = cleanText(body[key], max);
        if (key === "name" && !value) throw new SupabaseDataError("El nombre del negocio no puede quedar vacío.", 400);
        data[key] = value || null;
      }
      if ("email" in body) {
        if (body.email !== null && body.email !== "") {
          const email = validEmail(body.email);
          if (!email) throw new SupabaseDataError("El correo del negocio no es válido.", 400);
          data.email = email;
        } else data.email = null;
      }
      for (const key of ["accepts_online_orders", "accepts_online_bookings"]) {
        if (!(key in body)) continue;
        const value = validBoolean(body[key]);
        if (value === null) throw new SupabaseDataError(`El campo ${key} debe ser verdadero o falso.`, 400);
        data[key] = value;
      }
      if (!Object.keys(data).length) throw new SupabaseDataError("No hay cambios válidos para guardar.", 400);
      const rows = await supabaseDataRequest<UnknownRow[]>(`businesses?id=eq.${enc(businessId)}&owner_id=eq.${enc(user.id)}`, { method: "PATCH", body: JSON.stringify(data), prefer: "return=representation" });
      if (!rows.length) throw new SupabaseDataError("No encontramos un negocio que puedas editar.", 403);
      return Response.json({ business: rows[0] });
    }

    if (body.action === "saveHours") {
      const values = Array.isArray(body.hours) ? body.hours : null;
      if (!values || values.length === 0 || values.length > 7 || values.some((entry) => !isRecord(entry))) throw new SupabaseDataError("Configura al menos un horario válido.", 400);
      const seenDays = new Set<number>();
      const hours = values.slice(0, 7).map((entry) => {
        const row = entry as Record<string, unknown>;
        const day = validFiniteNumber(row.day_of_week, { min: 0, max: 6 });
        const isClosed = validBoolean(row.is_closed);
        if (day === null || !Number.isInteger(day) || isClosed === null || seenDays.has(day)) throw new SupabaseDataError("Los días y estados de horario no son válidos.", 400);
        seenDays.add(day);
        const opensAt = cleanText(row.opens_at, 5);
        const closesAt = cleanText(row.closes_at, 5);
        const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!isClosed && (!timePattern.test(opensAt) || !timePattern.test(closesAt) || opensAt >= closesAt)) throw new SupabaseDataError("Revisa las horas de apertura y cierre.", 400);
        return {
          business_id: businessId,
          day_of_week: day,
          is_closed: isClosed,
          opens_at: isClosed ? null : opensAt,
          closes_at: isClosed ? null : closesAt,
        };
      });
      await supabaseDataRequest("business_hours?on_conflict=business_id,day_of_week", { method: "POST", body: JSON.stringify(hours), prefer: "resolution=merge-duplicates,return=minimal" });
      return Response.json({ ok: true });
    }

    if (body.action === "saveAgent") {
      const data: Record<string, unknown> = {};
      const textFields: Record<string, number> = { agent_name: 80, language_code: 20, greeting: 1000, tone: 300, voice_id: 160, fallback_message: 1000 };
      for (const [key, max] of Object.entries(textFields)) {
        if (!(key in body)) continue;
        if (typeof body[key] !== "string") throw new SupabaseDataError(`El campo ${key} no es válido.`, 400);
        const value = cleanText(body[key], max);
        if (["agent_name", "greeting", "tone", "fallback_message"].includes(key) && !value) throw new SupabaseDataError(`El campo ${key} no puede quedar vacío.`, 400);
        data[key] = value || null;
      }
      for (const key of ["collect_customer_name", "collect_customer_phone"]) {
        if (!(key in body)) continue;
        const value = validBoolean(body[key]);
        if (value === null) throw new SupabaseDataError(`El campo ${key} debe ser verdadero o falso.`, 400);
        data[key] = value;
      }
      if ("settings" in body) {
        if (!isRecord(body.settings)) throw new SupabaseDataError("La configuración del asistente no es válida.", 400);
        data.settings = body.settings;
      }
      if (!Object.keys(data).length) throw new SupabaseDataError("No hay cambios válidos para guardar.", 400);
      const rows = await supabaseDataRequest<UnknownRow[]>(`agent_configs?${businessFilter}`, { method: "PATCH", body: JSON.stringify(data), prefer: "return=representation" });
      if (!rows.length) throw new SupabaseDataError("No encontramos la configuración de este asistente.", 404);
      return Response.json({ agent: rows[0] });
    }

    if (body.action === "saveFeature") {
      const featureCode = requiredText(body.featureCode, 80);
      const enabled = validBoolean(body.enabled);
      if (!featureCode || enabled === null) throw new SupabaseDataError("La función solicitada no es válida.", 400);
      await supabaseDataRequest(`business_features?${businessFilter}&feature_code=eq.${enc(featureCode)}`, { method: "PATCH", body: JSON.stringify({ enabled }), prefer: "return=minimal" });
      return Response.json({ ok: true });
    }

    if (body.action === "startConversation") {
      const scenario = cleanText(body.scenario, 160) || "Prueba libre";
      const access = await supabaseDataRequest<UnknownRow[]>(`businesses?id=eq.${enc(businessId)}&owner_id=eq.${enc(user.id)}&select=id`);
      if (!access[0]) throw new SupabaseDataError("No tienes acceso a este negocio.", 403);
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
      const conversationId = validIdentifier(body.conversationId);
      if (!conversationId) throw new SupabaseDataError("La conversación no es válida.", 400);
      const status = body.status === "failed" ? "failed" : "completed";
      const duration = validFiniteNumber(body.durationSeconds, { min: 0, max: 3600 });
      if (duration === null) throw new SupabaseDataError("La duración de la conversación no es válida.", 400);
      const rows = await supabaseDataRequest<UnknownRow[]>(`conversations?id=eq.${enc(conversationId)}&${businessFilter}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          summary: status === "failed" ? "La prueba no pudo completarse." : "Prueba de voz realizada desde el panel de Progy.",
          outcome: cleanText(body.scenario, 160) || "Prueba del asistente",
        }),
        prefer: "return=representation",
      });
      if (!rows[0]) throw new SupabaseDataError("No pudimos cerrar la conversación de prueba.", 404);
      return Response.json({ conversation: rows[0] });
    }

    if (body.action === "saveCatalogItem") {
      const id = body.id ? validIdentifier(body.id) : null;
      if (body.id && !id) throw new SupabaseDataError("El identificador del producto no es válido.", 400);
      const kind = body.kind === "service" ? "service" : "product";
      const price = validFiniteNumber(body.price, { min: 0, max: 100000000 });
      if (price === null) throw new SupabaseDataError("El precio debe ser un número válido mayor o igual a cero.", 400);
      const duration = kind === "service" ? validFiniteNumber(body.durationMinutes, { min: 1, max: 100000 }) : null;
      const stock = kind === "product" ? validFiniteNumber(body.stockQuantity, { min: 0, max: 100000000 }) : 0;
      if (kind === "service" && duration === null) throw new SupabaseDataError("La duración del servicio no es válida.", 400);
      if (stock === null) throw new SupabaseDataError("El stock no es válido.", 400);
      if ("trackStock" in body && typeof body.trackStock !== "boolean") throw new SupabaseDataError("El indicador de stock no es válido.", 400);
      if ("isAvailable" in body && typeof body.isAvailable !== "boolean") throw new SupabaseDataError("El estado de disponibilidad no es válido.", 400);
      const data = {
        business_id: businessId,
        kind,
        name: requiredText(body.name, 160) || "",
        description: body.description === null || body.description === undefined ? null : requiredText(body.description, 600),
        price: Number(price.toFixed(2)),
        duration_minutes: kind === "service" ? Math.round(duration ?? 0) : null,
        stock_quantity: kind === "product" ? Math.round(stock ?? 0) : 0,
        track_stock: kind === "product" ? body.trackStock === true : false,
        is_available: body.isAvailable !== false,
      };
      if (!data.name) throw new SupabaseDataError("Escribe el nombre del producto o servicio.", 400);
      const path = id ? `catalog_items?id=eq.${enc(id)}&${businessFilter}` : "catalog_items";
      const rows = await supabaseDataRequest<UnknownRow[]>(path, { method: id ? "PATCH" : "POST", body: JSON.stringify(data), prefer: "return=representation" });
      return Response.json({ item: rows[0] }, { status: id ? 200 : 201 });
    }

    if (body.action === "deleteCatalogItem") {
      const id = validIdentifier(body.id);
      if (!id) throw new SupabaseDataError("El producto no es válido.", 400);
      await supabaseDataRequest(`catalog_items?id=eq.${enc(id)}&${businessFilter}`, { method: "DELETE", prefer: "return=minimal" });
      return Response.json({ ok: true });
    }

    if (body.action === "saveKnowledge") {
      const id = body.id ? validIdentifier(body.id) : null;
      if (body.id && !id) throw new SupabaseDataError("El identificador del contenido no es válido.", 400);
      const allowedKinds = ["faq", "policy", "instruction", "location", "payment_method", "other"];
      const kind = String(body.kind ?? "faq");
      if (!allowedKinds.includes(kind)) throw new SupabaseDataError("El tipo de contenido no es válido.", 400);
      const data = {
        business_id: businessId,
        kind,
        title: String(body.title ?? "").trim(),
        question: String(body.question ?? "").trim() || null,
        answer: String(body.answer ?? "").trim(),
        is_active: body.isActive !== false,
      };
      if ("isActive" in body && typeof body.isActive !== "boolean") throw new SupabaseDataError("El estado del contenido no es válido.", 400);
      if (!data.title || !data.answer) throw new SupabaseDataError("Completa el título y la respuesta.", 400);
      const path = id ? `knowledge_items?id=eq.${enc(id)}&${businessFilter}` : "knowledge_items";
      const rows = await supabaseDataRequest<UnknownRow[]>(path, { method: id ? "PATCH" : "POST", body: JSON.stringify(data), prefer: "return=representation" });
      return Response.json({ item: rows[0] }, { status: id ? 200 : 201 });
    }

    if (body.action === "deleteKnowledge") {
      const id = validIdentifier(body.id);
      if (!id) throw new SupabaseDataError("El contenido no es válido.", 400);
      await supabaseDataRequest(`knowledge_items?id=eq.${enc(id)}&${businessFilter}`, { method: "DELETE", prefer: "return=minimal" });
      return Response.json({ ok: true });
    }

    throw new SupabaseDataError("La acción solicitada no existe.", 400);
  } catch (error) { return jsonError(error); }
}
