import { requireApiUser } from "@/lib/auth/supabase";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import {
  canManageBusiness,
  getWhatsAppConnection,
  isWhatsAppTokenExpired,
  updateWhatsAppConnection,
} from "@/lib/whatsapp/store";
import {
  registerWhatsAppPhone,
  subscribeWhatsAppBusinessAccount,
} from "@/lib/whatsapp/meta-client";

export const dynamic = "force-dynamic";

const GRAPH_VERSION = getWhatsAppConfig().graphVersion;
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

type RegisterPayload = {
  businessId?: string;
  pin?: string;
};

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return Response.json(
      { error: "Inicia sesión para registrar WhatsApp." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  if (!getWhatsAppConfig().enabled) {
    return Response.json(
      { error: "La conexión de WhatsApp no está habilitada." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  let body: RegisterPayload;
  try {
    body = (await request.json()) as RegisterPayload;
  } catch {
    return Response.json(
      { error: "La solicitud de registro no es válida." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const businessId = typeof body.businessId === "string"
    ? body.businessId.trim()
    : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  if (!businessId) {
    return Response.json(
      { error: "Falta el negocio." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (!/^\d{6}$/.test(pin)) {
    return Response.json(
      { error: "El PIN de registro debe tener exactamente 6 dígitos." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    if (!await canManageBusiness(user.id, businessId)) {
      return Response.json(
        { error: "No tienes permiso para configurar este negocio." },
        { status: 403, headers: NO_STORE_HEADERS },
      );
    }

    const connection = await getWhatsAppConnection(businessId);
    if (!connection) {
      return Response.json(
        { error: "Conecta primero WhatsApp." },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    if (connection.is_on_biz_app || connection.onboarding_flow === "business_app") {
      return Response.json(
        {
          error: "Este número ya está registrado mediante Coexistence; no necesita PIN.",
          registrationStatus: "coexistence",
        },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    if (isWhatsAppTokenExpired(connection.token_expires_at)) {
      return Response.json(
        { error: "La conexión de WhatsApp expiró. Vuelve a conectarla." },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    const subscription = await subscribeWhatsAppBusinessAccount({
      graphVersion: GRAPH_VERSION,
      wabaId: connection.waba_id,
      accessToken: connection.access_token,
    });

    if (!subscription.response.ok) {
      const detail = subscription.result.error?.message ||
        "Meta no permitió suscribir la cuenta a los webhooks.";
      await updateWhatsAppConnection(businessId, {
        registration_status: "failed",
        last_meta_error: detail.slice(0, 500),
      }).catch(() => undefined);
      return Response.json(
        { error: detail },
        { status: 502, headers: NO_STORE_HEADERS },
      );
    }

    const subscribedAt = new Date().toISOString();
    const registration = await registerWhatsAppPhone({
      graphVersion: GRAPH_VERSION,
      phoneNumberId: connection.phone_number_id,
      accessToken: connection.access_token,
      pin,
    });

    if (!registration.response.ok) {
      const detail = registration.result.error?.message ||
        "Meta no permitió registrar el número para Cloud API.";
      await updateWhatsAppConnection(businessId, {
        webhook_subscribed_at: subscribedAt,
        registration_status: "failed",
        last_meta_error: detail.slice(0, 500),
      }).catch(() => undefined);
      return Response.json(
        { error: detail },
        { status: 502, headers: NO_STORE_HEADERS },
      );
    }

    const registeredAt = new Date().toISOString();
    await updateWhatsAppConnection(businessId, {
      webhook_subscribed_at: subscribedAt,
      phone_registered_at: registeredAt,
      registration_status: "registered",
      last_meta_error: null,
    });

    return Response.json(
      {
        ok: true,
        webhookSubscribedAt: subscribedAt,
        phoneRegisteredAt: registeredAt,
        registrationStatus: "registered",
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("Progy WhatsApp phone registration failed", error);
    return Response.json(
      { error: "No pudimos registrar el número de WhatsApp." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
