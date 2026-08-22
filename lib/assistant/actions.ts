import type {
  AssistantBookingDraft,
  AssistantDecision,
  AssistantOrderDraft,
} from "../ai/openai";
import { type DataRequest, supabaseDataRequest } from "../supabase-data";
import type { AgentContext } from "./context";

type UnknownRow = Record<string, unknown>;

export type AssistantActionResult = {
  type: "none" | "order" | "booking";
  executed: boolean;
  id?: string;
  total?: number;
  message?: string;
  details?: Record<string, unknown>;
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
  return context.features.some((item) =>
    item.feature_code === code && item.enabled !== false
  );
}

function matchCatalogItem(context: AgentContext, requestedName: string) {
  const needle = normalized(requestedName);
  if (!needle) return null;

  const available = context.catalog.filter((item) =>
    item.is_available !== false
  );
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

async function createOrder(
  context: AgentContext,
  order: AssistantOrderDraft,
  request: DataRequest,
): Promise<AssistantActionResult> {
  if (!featureEnabled(context, "take_orders")) {
    return {
      type: "order",
      executed: false,
      message:
        "Puedo ayudarte con la información del negocio, pero los pedidos no están habilitados en este momento.",
    };
  }
  if (!order.items.length) {
    return {
      type: "order",
      executed: false,
      message:
        "Necesito confirmar qué productos deseas antes de registrar el pedido.",
    };
  }
  if (order.fulfillment === "delivery" && !order.address?.trim()) {
    return {
      type: "order",
      executed: false,
      message: "Para el envío necesito confirmar la dirección de entrega.",
    };
  }

  const resolved: Array<
    { name: string; quantity: number; unitPrice: number; subtotal: number }
  > = [];
  for (const requested of order.items) {
    const item = matchCatalogItem(context, requested.name);
    if (!item) {
      return {
        type: "order",
        executed: false,
        message:
          `Necesito confirmar cuál producto corresponde a “${requested.name}” antes de registrar el pedido.`,
      };
    }

    const price = numberValue(item.sale_price ?? item.price);
    if (price === null) {
      return {
        type: "order",
        executed: false,
        message: `El precio de ${
          String(item.name || requested.name)
        } todavía no está confirmado.`,
      };
    }

    const quantity = Math.max(
      1,
      Math.min(50, Math.round(Number(requested.quantity || 1))),
    );
    resolved.push({
      name: String(item.name || requested.name),
      quantity,
      unitPrice: price,
      subtotal: price * quantity,
    });
  }

  const total = resolved.reduce((sum, item) => sum + item.subtotal, 0);
  const rows = await request<UnknownRow[]>("orders", {
    method: "POST",
    body: JSON.stringify({
      business_id: String(context.business.id),
      customer_name: order.customerName?.trim() || "Cliente",
      status: "pending",
      fulfillment: order.fulfillment,
      total: Number(total.toFixed(2)),
    }),
    prefer: "return=representation",
  });

  if (!rows[0]?.id) {
    return {
      type: "order",
      executed: false,
      message: "No pude guardar el pedido en este momento.",
    };
  }

  return {
    type: "order",
    executed: true,
    id: String(rows[0].id),
    total: Number(total.toFixed(2)),
    details: {
      items: resolved,
      fulfillment: order.fulfillment,
      address: order.address,
      notes: order.notes,
    },
  };
}

async function createBooking(
  context: AgentContext,
  booking: AssistantBookingDraft,
  request: DataRequest,
): Promise<AssistantActionResult> {
  const category = String(context.business.category_code || "");
  const appointment = category === "clinic" || category === "beauty_salon";
  const requiredFeature = appointment
    ? "schedule_appointments"
    : "create_reservations";
  if (!featureEnabled(context, requiredFeature)) {
    return {
      type: "booking",
      executed: false,
      message: appointment
        ? "Las citas no están habilitadas en este momento."
        : "Las reservas no están habilitadas en este momento.",
    };
  }
  if (!booking.startsAt) {
    return {
      type: "booking",
      executed: false,
      message:
        "Necesito confirmar la fecha y la hora antes de registrar la reserva.",
    };
  }

  const startsAt = new Date(booking.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return {
      type: "booking",
      executed: false,
      message:
        "No pude interpretar la fecha y la hora. ¿Puedes confirmarlas nuevamente?",
    };
  }
  if (startsAt.getTime() < Date.now() - 5 * 60 * 1000) {
    return {
      type: "booking",
      executed: false,
      message: "Esa fecha ya pasó. ¿Qué fecha y hora futuras prefieres?",
    };
  }

  const type = appointment ? "appointment" : "reservation";
  const rows = await request<UnknownRow[]>("bookings", {
    method: "POST",
    body: JSON.stringify({
      business_id: String(context.business.id),
      customer_name: booking.customerName?.trim() || "Cliente",
      type,
      status: "pending",
      starts_at: startsAt.toISOString(),
      party_size: booking.partySize,
      resource_name: booking.resourceName,
    }),
    prefer: "return=representation",
  });

  if (!rows[0]?.id) {
    return {
      type: "booking",
      executed: false,
      message: "No pude guardar la reserva en este momento.",
    };
  }

  return {
    type: "booking",
    executed: true,
    id: String(rows[0].id),
    details: {
      type,
      startsAt: startsAt.toISOString(),
      partySize: booking.partySize,
      resourceName: booking.resourceName,
      notes: booking.notes,
    },
  };
}

export async function executeAssistantDecision(
  context: AgentContext,
  decision: AssistantDecision,
  request: DataRequest = supabaseDataRequest,
): Promise<AssistantActionResult> {
  if (decision.intent === "order" && decision.order) {
    return createOrder(context, decision.order, request);
  }
  if (decision.intent === "booking" && decision.booking) {
    return createBooking(context, decision.booking, request);
  }
  return { type: "none", executed: false };
}
