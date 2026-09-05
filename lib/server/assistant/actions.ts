import type {
  AssistantBookingDraft,
  AssistantDecision,
  AssistantOrderDraft,
} from "../ai/openai";
import { type DataRequest, supabaseDataRequest } from "@/lib/server/data/supabase";
import type { AgentContext } from "./context";

type UnknownRow = Record<string, unknown>;

export type AssistantActionResult = {
  type: "none" | "order" | "booking" | "handoff" | "email";
  executed: boolean;
  id?: string;
  total?: number;
  message?: string;
  details?: Record<string, unknown>;
};

export type AssistantActionOptions = {
  conversationId?: string | null;
  customerId?: string | null;
};

function normalized(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function featureEnabled(context: AgentContext, code: string) {
  return context.features.some((item) => item.feature_code === code && item.enabled !== false);
}

function matchCatalogItem(context: AgentContext, requestedName: string) {
  const needle = normalized(requestedName);
  if (!needle) return null;
  const available = context.catalog.filter((item) => item.is_available !== false);
  const exact = available.find((item) => normalized(item.name) === needle);
  if (exact) return exact;
  const candidates = available.filter((item) => {
    const name = normalized(item.name);
    return name.includes(needle) || needle.includes(name);
  });
  return candidates.length === 1 ? candidates[0] : null;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nullableText(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value.trim() || null : null;
}

function parseOrder(value: unknown): AssistantOrderDraft | null {
  const input = recordValue(value);
  const items = input?.items;
  if (!input || !Array.isArray(items) || items.length < 1 || items.length > 20) return null;
  const parsedItems = items.map((item) => {
    const row = recordValue(item);
    const name = typeof row?.name === "string" ? row.name.trim() : "";
    const quantity = Number(row?.quantity);
    return name && Number.isInteger(quantity) && quantity >= 1 && quantity <= 50 ? { name, quantity } : null;
  });
  if (parsedItems.some((item) => !item)) return null;
  const fulfillment = input.fulfillment;
  if (fulfillment !== "delivery" && fulfillment !== "pickup" && fulfillment !== "onsite") return null;
  return {
    items: parsedItems as Array<{ name: string; quantity: number }>,
    fulfillment,
    address: nullableText(input.address),
    customerName: nullableText(input.customerName),
    notes: nullableText(input.notes),
  };
}

function parseBooking(value: unknown): AssistantBookingDraft | null {
  const input = recordValue(value);
  if (!input || typeof input.startsAt !== "string") return null;
  const partySize = input.partySize === null || input.partySize === undefined ? null : Number(input.partySize);
  if (partySize !== null && (!Number.isInteger(partySize) || partySize < 1 || partySize > 100)) return null;
  return {
    startsAt: input.startsAt.trim() || null,
    customerName: nullableText(input.customerName),
    partySize,
    resourceName: nullableText(input.resourceName),
    notes: nullableText(input.notes),
  };
}

export async function createOrder(
  context: AgentContext,
  order: AssistantOrderDraft,
  request: DataRequest,
  options: AssistantActionOptions = {},
): Promise<AssistantActionResult> {
  if (!featureEnabled(context, "take_orders")) {
    return { type: "order", executed: false, message: "Puedo ayudarte con la información del negocio, pero los pedidos no están habilitados en este momento." };
  }
  if (!order.items.length) return { type: "order", executed: false, message: "Necesito confirmar qué productos deseas antes de registrar el pedido." };
  if (order.fulfillment === "delivery" && !order.address?.trim()) return { type: "order", executed: false, message: "Para el envío necesito confirmar la dirección de entrega." };

  const resolved: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }> = [];
  for (const requested of order.items) {
    const item = matchCatalogItem(context, requested.name);
    if (!item) return { type: "order", executed: false, message: `Necesito confirmar cuál producto corresponde a “${requested.name}” antes de registrar el pedido.` };
    const price = numberValue(item.sale_price ?? item.price);
    if (price === null) return { type: "order", executed: false, message: `El precio de ${String(item.name || requested.name)} todavía no está confirmado.` };
    const quantity = Math.max(1, Math.min(50, Math.round(Number(requested.quantity || 1))));
    resolved.push({ name: String(item.name || requested.name), quantity, unitPrice: price, subtotal: price * quantity });
  }

  const total = Number(resolved.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  const rows = await request<UnknownRow[]>("orders", {
    method: "POST",
    body: JSON.stringify({
      business_id: String(context.business.id),
      ...(options.customerId ? { customer_id: options.customerId } : {}),
      ...(options.conversationId ? { conversation_id: options.conversationId } : {}),
      customer_name: order.customerName?.trim() || "Cliente",
      status: "pending",
      fulfillment: order.fulfillment,
      delivery_address: order.address,
      notes: order.notes,
      subtotal: total,
      total,
    }),
    prefer: "return=representation",
  });
  if (!rows[0]?.id) return { type: "order", executed: false, message: "No pude guardar el pedido en este momento." };
  return { type: "order", executed: true, id: String(rows[0].id), total, details: { items: resolved, fulfillment: order.fulfillment, address: order.address, notes: order.notes } };
}

export async function createBooking(
  context: AgentContext,
  booking: AssistantBookingDraft,
  request: DataRequest,
  options: AssistantActionOptions = {},
): Promise<AssistantActionResult> {
  const category = String(context.business.category_code || "");
  const appointment = category === "clinic" || category === "beauty_salon";
  const requiredFeature = appointment ? "schedule_appointments" : "create_reservations";
  if (!featureEnabled(context, requiredFeature)) return { type: "booking", executed: false, message: appointment ? "Las citas no están habilitadas en este momento." : "Las reservas no están habilitadas en este momento." };
  if (!booking.startsAt) return { type: "booking", executed: false, message: "Necesito confirmar la fecha y la hora antes de registrar la reserva." };
  const startsAt = new Date(booking.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { type: "booking", executed: false, message: "No pude interpretar la fecha y la hora. ¿Puedes confirmarlas nuevamente?" };
  if (startsAt.getTime() < Date.now() - 5 * 60 * 1000) return { type: "booking", executed: false, message: "Esa fecha ya pasó. ¿Qué fecha y hora futuras prefieres?" };

  const type = appointment ? "appointment" : "reservation";
  const rows = await request<UnknownRow[]>("bookings", {
    method: "POST",
    body: JSON.stringify({
      business_id: String(context.business.id),
      ...(options.customerId ? { customer_id: options.customerId } : {}),
      ...(options.conversationId ? { conversation_id: options.conversationId } : {}),
      customer_name: booking.customerName?.trim() || "Cliente",
      type,
      status: "pending",
      starts_at: startsAt.toISOString(),
      party_size: booking.partySize,
      resource_name: booking.resourceName,
      notes: booking.notes,
    }),
    prefer: "return=representation",
  });
  if (!rows[0]?.id) return { type: "booking", executed: false, message: "No pude guardar la reserva en este momento." };
  return { type: "booking", executed: true, id: String(rows[0].id), details: { type, startsAt: startsAt.toISOString(), partySize: booking.partySize, resourceName: booking.resourceName, notes: booking.notes } };
}

export async function transferToHuman(
  context: AgentContext,
  args: unknown,
  request: DataRequest,
  options: AssistantActionOptions = {},
): Promise<AssistantActionResult> {
  const input = recordValue(args);
  const reasons = ["customer_request", "complaint", "out_of_scope", "sensitive_topic", "other"];
  const urgencies = ["low", "normal", "high"];
  const reason = typeof input?.reason === "string" && reasons.includes(input.reason) ? input.reason : null;
  const summary = typeof input?.summary === "string" ? input.summary.trim().slice(0, 500) : "";
  const urgency = typeof input?.urgency === "string" && urgencies.includes(input.urgency) ? input.urgency : null;
  if (!reason || !summary || !urgency || !options.conversationId) return { type: "handoff", executed: false, message: "Voy a comunicar tu solicitud a una persona del negocio." };
  await request(`conversations?id=eq.${encodeURIComponent(options.conversationId)}&business_id=eq.${encodeURIComponent(String(context.business.id))}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "transferred", outcome: reason, summary }),
    prefer: "return=minimal",
  });
  return { type: "handoff", executed: true, message: "Una persona del negocio continuará atendiendo tu solicitud.", details: { reason, summary, urgency } };
}

export async function sendEmailNotification(
  _context: AgentContext,
  args: unknown,
  _request: DataRequest,
): Promise<AssistantActionResult> {
  void _context;
  void _request;
  const input = recordValue(args);
  const purposes = ["order_confirmation", "booking_confirmation", "follow_up"];
  const recipients = ["business", "customer"];
  if (!input || typeof input.purpose !== "string" || !purposes.includes(input.purpose) || typeof input.recipient !== "string" || !recipients.includes(input.recipient)) return { type: "email", executed: false, message: "No pude preparar la notificación por correo." };
  return { type: "email", executed: true, details: { mode: "stub", purpose: input.purpose, recipient: input.recipient, referenceId: nullableText(input.referenceId) } };
}

/** Compatibility adapter for callers that still hold the old decision shape. */
export async function executeAssistantDecision(
  context: AgentContext,
  decision: AssistantDecision,
  request: DataRequest = supabaseDataRequest,
  options: AssistantActionOptions = {},
): Promise<AssistantActionResult> {
  if (decision.intent === "order" && decision.order) return createOrder(context, decision.order, request, options);
  if (decision.intent === "booking" && decision.booking) return createBooking(context, decision.booking, request, options);
  return { type: "none", executed: false };
}

export { parseBooking, parseOrder };
