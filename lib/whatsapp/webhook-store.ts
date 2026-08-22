import { supabaseAdminRequest } from "../supabase-admin";

type Row = Record<string, unknown>;

export type WhatsAppConnectionForWebhook = {
  business_id: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
  token_expires_at: string | null;
};

export type WhatsAppConversation = {
  id: string;
  metadata?: Record<string, unknown> | null;
};

export async function getConnectionForPhoneNumber(phoneNumberId: string) {
  const rows = await supabaseAdminRequest<WhatsAppConnectionForWebhook[]>(
    `whatsapp_connections?select=business_id,waba_id,phone_number_id,access_token,token_expires_at&phone_number_id=eq.${
      encodeURIComponent(phoneNumberId)
    }&status=eq.connected&limit=1`,
  );
  return rows[0] || null;
}

export async function claimIncomingMessage(input: {
  providerMessageId: string;
  businessId: string;
  phoneNumberId: string;
  fromPhone: string;
  toPhone?: string | null;
  messageType: string;
  textBody?: string | null;
  providerPayload: unknown;
}) {
  const rows = await supabaseAdminRequest<Row[]>("whatsapp_messages", {
    method: "POST",
    body: JSON.stringify({
      provider_message_id: input.providerMessageId,
      business_id: input.businessId,
      phone_number_id: input.phoneNumberId,
      from_phone: input.fromPhone,
      to_phone: input.toPhone || null,
      direction: "inbound",
      message_type: input.messageType,
      text_body: input.textBody || null,
      status: "processing",
      provider_payload: input.providerPayload,
    }),
    prefer: "resolution=ignore-duplicates,return=representation",
  });

  return rows[0] || null;
}

export async function updateMessage(
  providerMessageId: string,
  data: Record<string, unknown>,
) {
  await supabaseAdminRequest(
    `whatsapp_messages?provider_message_id=eq.${
      encodeURIComponent(providerMessageId)
    }`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      prefer: "return=minimal",
    },
  );
}

export async function saveOutboundMessage(input: {
  providerMessageId: string;
  businessId: string;
  phoneNumberId: string;
  fromPhone: string;
  toPhone: string;
  textBody: string;
  conversationId?: string | null;
  providerPayload?: unknown;
}) {
  await supabaseAdminRequest("whatsapp_messages", {
    method: "POST",
    body: JSON.stringify({
      provider_message_id: input.providerMessageId,
      business_id: input.businessId,
      phone_number_id: input.phoneNumberId,
      from_phone: input.fromPhone,
      to_phone: input.toPhone,
      direction: "outbound",
      message_type: "text",
      text_body: input.textBody,
      status: "sent",
      conversation_id: input.conversationId || null,
      provider_payload: input.providerPayload || {},
    }),
    prefer: "resolution=ignore-duplicates,return=minimal",
  });
}

export async function getOrCreateConversation(input: {
  businessId: string;
  customerPhone: string;
  customerName?: string | null;
  phoneNumberId: string;
}) {
  const filter = [
    `business_id=eq.${encodeURIComponent(input.businessId)}`,
    "channel=eq.whatsapp",
    "status=eq.active",
    `customer_phone=eq.${encodeURIComponent(input.customerPhone)}`,
  ].join("&");
  const existing = await supabaseAdminRequest<Row[]>(
    `conversations?${filter}&select=id,metadata&order=started_at.desc&limit=1`,
  );
  if (existing[0]?.id) return existing[0] as WhatsAppConversation;

  const rows = await supabaseAdminRequest<Row[]>("conversations", {
    method: "POST",
    body: JSON.stringify({
      business_id: input.businessId,
      customer_name: input.customerName || "Cliente",
      customer_phone: input.customerPhone,
      channel: "whatsapp",
      status: "active",
      is_trial: false,
      metadata: {
        source: "whatsapp_webhook",
        phone_number_id: input.phoneNumberId,
        turns: [],
      },
    }),
    prefer: "return=representation",
  });
  if (!rows[0]?.id) throw new Error("Could not create WhatsApp conversation");
  return rows[0] as WhatsAppConversation;
}

export async function appendConversationTurn(input: {
  conversationId: string;
  businessId: string;
  userText: string;
  reply: string;
  action?: unknown;
}) {
  const rows = await supabaseAdminRequest<Row[]>(
    `conversations?id=eq.${
      encodeURIComponent(input.conversationId)
    }&business_id=eq.${
      encodeURIComponent(input.businessId)
    }&channel=eq.whatsapp&select=id,metadata`,
  );
  if (!rows[0]) return;

  const current = rows[0].metadata && typeof rows[0].metadata === "object" &&
      !Array.isArray(rows[0].metadata)
    ? rows[0].metadata as Record<string, unknown>
    : {};
  const turns = Array.isArray(current.turns) ? current.turns : [];
  const now = new Date().toISOString();
  const nextTurns = [
    ...turns,
    { role: "user", text: input.userText.slice(0, 1500), at: now },
    { role: "assistant", text: input.reply.slice(0, 1500), at: now },
  ].slice(-20);

  await supabaseAdminRequest(
    `conversations?id=eq.${
      encodeURIComponent(input.conversationId)
    }&business_id=eq.${
      encodeURIComponent(input.businessId)
    }&channel=eq.whatsapp`,
    {
      method: "PATCH",
      body: JSON.stringify({
        summary: input.reply.slice(0, 500),
        metadata: {
          ...current,
          turns: nextTurns,
          last_action: input.action || current.last_action,
          last_message_at: now,
        },
      }),
      prefer: "return=minimal",
    },
  );
}
