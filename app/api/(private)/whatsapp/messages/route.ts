import { requireApiUser } from "@/lib/server/auth/supabase";
import { getWhatsAppConfig } from "@/lib/server/whatsapp/config";
import { DEFAULT_META_GRAPH_VERSION } from "@/lib/shared/whatsapp/constants";
import { sendWhatsAppText } from "@/lib/server/whatsapp/meta-client";
import {
  canManageBusiness,
  getWhatsAppConnection,
  isWhatsAppTokenExpired,
} from "@/lib/server/whatsapp/store";
import {
  appendManualConversationTurn,
  getWhatsAppConversation,
  listWhatsAppMessages,
  saveOutboundMessage,
} from "@/lib/server/whatsapp/webhook-store";

export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  getWhatsAppConfig().graphVersion || DEFAULT_META_GRAPH_VERSION;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE_HEADERS });
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: unknown) {
  return clean(value).replace(/\D/g, "");
}

async function assertAccess(userId: string, businessId: string, conversationId: string) {
  if (!businessId || !conversationId) {
    return { error: "Faltan el negocio o la conversación.", status: 400 } as const;
  }

  if (!await canManageBusiness(userId, businessId)) {
    return { error: "No tienes permiso para revisar esta conversación.", status: 403 } as const;
  }

  const conversation = await getWhatsAppConversation(businessId, conversationId);
  if (!conversation) {
    return { error: "No encontramos esta conversación de WhatsApp.", status: 404 } as const;
  }

  return { conversation } as const;
}

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return json({ error: "Inicia sesión para ver la conversación." }, 401);

  if (!getWhatsAppConfig().enabled) {
    return json({ error: "WhatsApp no está habilitado." }, 503);
  }

  const url = new URL(request.url);
  const businessId = clean(url.searchParams.get("businessId"));
  const conversationId = clean(url.searchParams.get("conversationId"));

  try {
    const access = await assertAccess(user.id, businessId, conversationId);
    if ("error" in access) return json({ error: access.error }, access.status);

    const messages = await listWhatsAppMessages(businessId, conversationId);
    return json({
      conversation: access.conversation,
      messages: messages.map((message) => ({
        id: message.id,
        providerMessageId: message.provider_message_id,
        direction: message.direction,
        messageType: message.message_type,
        text: message.text_body,
        status: message.status,
        createdAt: message.created_at,
      })),
    });
  } catch (error) {
    console.error("Progy WhatsApp conversation read failed", error);
    return json({ error: "No pudimos cargar los mensajes de esta conversación." }, 500);
  }
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return json({ error: "Inicia sesión para responder." }, 401);

  if (!getWhatsAppConfig().enabled) {
    return json({ error: "WhatsApp no está habilitado." }, 503);
  }

  const body = await request.json().catch(() => null) as {
    businessId?: unknown;
    conversationId?: unknown;
    text?: unknown;
  } | null;
  const businessId = clean(body?.businessId);
  const conversationId = clean(body?.conversationId);
  const messageText = clean(body?.text);

  if (!messageText || messageText.length > 4096) {
    return json({ error: "Escribe un mensaje de 1 a 4096 caracteres." }, 400);
  }

  try {
    const access = await assertAccess(user.id, businessId, conversationId);
    if ("error" in access) return json({ error: access.error }, access.status);

    const to = normalizePhone(access.conversation.customer_phone);
    if (to.length < 8 || to.length > 15) {
      return json({ error: "La conversación no tiene un teléfono válido." }, 409);
    }

    const connection = await getWhatsAppConnection(businessId);
    if (!connection?.access_token || !connection.phone_number_id) {
      return json({ error: "No encontramos una conexión activa de WhatsApp." }, 409);
    }
    if (isWhatsAppTokenExpired(connection.token_expires_at)) {
      return json({ error: "La conexión de WhatsApp expiró. Vuelve a conectarla." }, 409);
    }

    const sent = await sendWhatsAppText({
      graphVersion: GRAPH_VERSION,
      phoneNumberId: connection.phone_number_id,
      accessToken: connection.access_token,
      to,
      text: messageText,
    });
    const providerMessageId = sent.result.messages?.[0]?.id || "";
    if (!sent.response.ok || !providerMessageId) {
      console.error("Progy manual WhatsApp response rejected by Meta", {
        status: sent.response.status,
        code: sent.result.error?.code,
      });
      return json({
        error: "Meta no aceptó la respuesta manual. Comprueba la ventana de atención.",
      }, 502);
    }

    await saveOutboundMessage({
      providerMessageId,
      businessId,
      phoneNumberId: connection.phone_number_id,
      fromPhone: connection.phone_number || connection.phone_number_id,
      toPhone: to,
      textBody: messageText,
      conversationId,
      providerPayload: sent.result,
    });
    await appendManualConversationTurn({
      conversationId,
      businessId,
      text: messageText,
    });

    return json({
      ok: true,
      message: {
        providerMessageId,
        direction: "outbound",
        text: messageText,
        status: "sent",
        createdAt: new Date().toISOString(),
      },
    }, 201);
  } catch (error) {
    console.error("Progy manual WhatsApp response failed", error);
    return json({ error: "No pudimos enviar la respuesta manual." }, 500);
  }
}
