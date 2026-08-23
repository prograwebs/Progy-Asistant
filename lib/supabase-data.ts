import { randomUUID } from "node:crypto";
import { getSupabaseAccessToken, integrationConfig } from "./integrations";
import { businessCreateErrorCode, providerErrorCode, publicDataError, type SupabasePublicErrorCode } from "./http/errors";
import { retryTransientPostgrestJwt } from "./http/postgrest-retry";

type DataRequestOptions = RequestInit & { prefer?: string };
export type DataRequest = <T = unknown>(
  path: string,
  options?: DataRequestOptions,
) => Promise<T>;
export class SupabaseDataError extends Error {
  status: number;
  publicCode?: SupabasePublicErrorCode;

  constructor(
    message: string,
    status = 500,
    publicCode?: SupabasePublicErrorCode,
  ) {
    super(message);
    this.name = "SupabaseDataError";
    this.status = status;
    this.publicCode = publicCode;
  }
}

function dataOperation(path: string) {
  const resource = path.split("?", 1)[0].replace(/^rpc\//, "rpc:");
  return /^[a-z0-9_:/-]{1,80}$/i.test(resource) ? resource : "unknown";
}

export async function supabaseDataRequest<T>(
  path: string,
  options: DataRequestOptions = {},
): Promise<T> {
  const token = await getSupabaseAccessToken();
  const { supabaseUrl, supabaseAnonKey } = integrationConfig();
  if (!token) {
    throw new SupabaseDataError(
      "Tu sesión terminó. Vuelve a iniciar sesión.",
      401,
      "session_refresh_required",
    );
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new SupabaseDataError("Supabase todavía no está configurado.", 503);
  }

  const headers = new Headers(options.headers);
  headers.set("apikey", supabaseAnonKey);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (options.prefer) headers.set("Prefer", options.prefer);

  const correlationId = randomUUID();
  const result = await retryTransientPostgrestJwt(async () => {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
    const raw = await response.text();
    let payload: unknown = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
    }
    return {
      value: { response, payload },
      status: response.status,
      code: providerErrorCode(payload),
    };
  });
  const { response, payload } = result;
  if (!response.ok) {
    const method = (options.method ?? "GET").toUpperCase();
    const providerCode = providerErrorCode(payload);
    console.error("Progy data request failed", {
      operation: dataOperation(path),
      status: response.status,
      code: providerCode,
      correlationId,
    });
    throw new SupabaseDataError(
      publicDataError(response.status, method, providerCode),
      response.status,
      response.status === 401
        ? "session_refresh_required"
        : dataOperation(path) === "rpc:create_business_for_current_user"
          ? businessCreateErrorCode(providerCode)
          : undefined,
    );
  }
  return payload as T;
}

export async function loadAgentContextWith(
  request: DataRequest,
  businessId: string,
) {
  const id = encodeURIComponent(businessId);
  const [businesses, agents, hours, catalog, knowledge, features] =
    await Promise.all([
      request<Record<string, unknown>[]>(
        `businesses?id=eq.${id}&select=id,name,category_code,description,address,city,province,phone,whatsapp_phone`,
      ),
      request<Record<string, unknown>[]>(
        `agent_configs?business_id=eq.${id}&select=*`,
      ),
      request<Record<string, unknown>[]>(
        `business_hours?business_id=eq.${id}&select=day_of_week,opens_at,closes_at,is_closed&order=day_of_week.asc`,
      ),
      request<Record<string, unknown>[]>(
        `catalog_items?business_id=eq.${id}&is_available=eq.true&select=name,description,price,sale_price,kind,duration_minutes&order=sort_order.asc&limit=80`,
      ),
      request<Record<string, unknown>[]>(
        `knowledge_items?business_id=eq.${id}&is_active=eq.true&select=kind,title,question,answer&order=priority.desc&limit=80`,
      ),
      request<Record<string, unknown>[]>(
        `business_features?business_id=eq.${id}&enabled=eq.true&select=feature_code`,
      ),
    ]);
  if (!businesses[0]) {
    throw new SupabaseDataError("No tienes acceso a este negocio.", 403);
  }
  return {
    business: businesses[0],
    agent: agents[0] ?? {},
    hours,
    catalog,
    knowledge,
    features,
  };
}

export async function loadAgentContext(businessId: string) {
  return loadAgentContextWith(supabaseDataRequest, businessId);
}

function line(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildAgentInstructions(
  context: Awaited<ReturnType<typeof loadAgentContext>>,
) {
  const businessName = line(context.business.name) || "el negocio";
  const storedAgentName = line(context.agent.agent_name);
  const agentName = storedAgentName.toLowerCase() === "kely"
    ? "Progy"
    : storedAgentName || "Progy";
  const greeting = line(context.agent.greeting);
  const tone = line(context.agent.tone) || "cálido, claro y profesional";
  const fallback = line(context.agent.fallback_message) ||
    "No tengo esa información confirmada. Puedo comunicarte con una persona del negocio.";
  const schedule = context.hours.map((h) =>
    `${String(h.day_of_week)}:${
      h.is_closed ? "cerrado" : `${h.opens_at}-${h.closes_at}`
    }`
  ).join(", ");
  const catalog = context.catalog.map((item) => {
    const price = item.sale_price ?? item.price;
    return `${line(item.name)} (${line(item.kind)}): $${price}${
      line(item.description) ? ` — ${line(item.description)}` : ""
    }`;
  }).join("\n");
  const knowledge = context.knowledge.map((item) =>
    `${line(item.title)}: ${line(item.answer)}`
  ).join("\n");
  const capabilities = context.features.map((item) => line(item.feature_code))
    .filter(Boolean).join(", ");

  return [
    `Eres ${agentName}, el asistente de voz de ${businessName}, un negocio de Ecuador.`,
    `Habla en español latino con un tono ${tone}. Responde de forma natural, breve y útil.`,
    greeting
      ? `Saludo aprobado: ${greeting}`
      : "Preséntate con amabilidad y pregunta cómo puedes ayudar.",
    `Capacidades habilitadas: ${
      capabilities || "responder consultas y transferir a una persona"
    }.`,
    schedule
      ? `Horarios (0=domingo, 6=sábado): ${schedule}.`
      : "Los horarios todavía no fueron configurados.",
    catalog
      ? `Catálogo o servicios confirmados:\n${catalog}`
      : "No hay productos o servicios confirmados todavía.",
    knowledge
      ? `Información adicional confirmada:\n${knowledge}`
      : "No hay preguntas frecuentes adicionales todavía.",
    `Regla obligatoria: no inventes precios, horarios, disponibilidad, políticas ni datos. Cuando falte información responde exactamente con la idea de: ${fallback}`,
    "En una prueba, confirma los datos importantes antes de cerrar y explica qué acción registrarías.",
  ].join("\n\n");
}
