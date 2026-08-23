import { supabaseAdminRequest } from "../supabase-admin";

type Row = Record<string, unknown>;

export type WhatsAppConnectionForWebhook = {
  business_id: string;
  waba_id: string;
  phone_number_id: string;
  phone_number?: string | null;
  access_token: string;
  token_expires_at: string | null;
};

export type WhatsAppConversation = {
  id: string;
  customer_phone?: string | null;
  customer_name?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type WhatsAppStoredMessage = {
  id: string;
  provider_message_id: string;
  direction: "inbound" | "outbound";
  message_type: string;
  text_body: string | null;
  status: string;
  created_at: string;
  provider_payload?: unknown;
};

export async function getWhatsAppConversation(
  businessId: string,
  conversationId: string,
) {
  const rows = await supabaseAdminRequest<WhatsAppConversation[]>(
    `conversations?select=id,customer_phone,customer_name,metadata&id=eq.${encodeURIComponent(
      conversationId,
    )}&business_id=eq.${encodeURIComponent(
      businessId,
    )}&channel=eq.whatsapp_chat&limit=1`,
  );
  return rows[0] || null;
}

export async function listWhatsAppMessages(
  businessId: string,
  conversationId: string,
) {
  return supabaseAdminRequest<WhatsAppStoredMessage[]>(
    `whatsapp_messages?select=id,provider_message_id,direction,message_type,text_body,status,created_at&business_id=eq.${encodeURIComponent(
      businessId,
    )}&conversation_id=eq.${encodeURIComponent(
      conversationId,
    )}&order=created_at.asc&limit=200`,
  );
}

export async function getConnectionForPhoneNumber(phoneNumberId: string) {
  const rows = await supabaseAdminRequest<WhatsAppConnectionForWebhook[]>(
    `whatsapp_connections?select=business_id,waba_id,phone_number_id,phone_number,access_token,token_expires_at&phone_number_id=eq.${
      encodeURIComponent(phoneNumberId)
    }&status=eq.connected&limit=1`,
  );
  return rows[0] || null;
}

export async function claimSynchronizedMessage(input: {
  providerMessageId: string;
  businessId: string;
  phoneNumberId: string;
  fromPhone: string;
  toPhone?: string | null;
  direction: "inbound" | "outbound";
  messageType: string;
  textBody?: string | null;
  status: "history" | "echo";
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
      direction: input.direction,
      message_type: input.messageType,
      text_body: input.textBody || null,
      status: input.status,
      provider_payload: input.providerPayload,
    }),
    prefer: "resolution=ignore-duplicates,return=representation",
  });

  return rows[0] || null;
}

export async function upsertWhatsAppContact(input: {
  businessId: string;
  phoneNumber: string;
  fullName?: string | null;
  firstName?: string | null;
  active: boolean;
}) {
  await supabaseAdminRequest(
    "whatsapp_contacts?on_conflict=business_id,phone_number",
    {
      method: "POST",
      body: JSON.stringify({
        business_id: input.businessId,
        phone_number: input.phoneNumber,
        full_name: input.fullName || null,
        first_name: input.firstName || null,
        status: input.active ? "active" : "inactive",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      prefer: "resolution=merge-duplicates,return=minimal",
    },
  );
}

export async function updateCoexistenceSyncStatus(input: {
  phoneNumberId: string;
  syncType: "history" | "contacts";
  status: string;
}) {
  const field = input.syncType === "history"
    ? "history_sync_status"
    : "contacts_sync_status";
  await supabaseAdminRequest(
    `whatsapp_connections?phone_number_id=eq.${encodeURIComponent(input.phoneNumberId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        [field]: input.status,
        updated_at: new Date().toISOString(),
      }),
      prefer: "return=minimal",
    },
  );
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
    "channel=eq.whatsapp_chat",
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
      channel: "whatsapp_chat",
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
    }&channel=eq.whatsapp_chat&select=id,metadata`,
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
    }&channel=eq.whatsapp_chat`,
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

export async function appendManualConversationTurn(input: {
  conversationId: string;
  businessId: string;
  text: string;
}) {
  const rows = await supabaseAdminRequest<Row[]>(
    `conversations?id=eq.${encodeURIComponent(
      input.conversationId,
    )}&business_id=eq.${encodeURIComponent(
      input.businessId,
    )}&channel=eq.whatsapp_chat&select=id,metadata`,
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
    { role: "human_agent", text: input.text.slice(0, 1500), at: now },
  ].slice(-20);

  await supabaseAdminRequest(
    `conversations?id=eq.${encodeURIComponent(
      input.conversationId,
    )}&business_id=eq.${encodeURIComponent(
      input.businessId,
    )}&channel=eq.whatsapp_chat`,
    {
      method: "PATCH",
      body: JSON.stringify({
        summary: input.text.slice(0, 500),
        metadata: {
          ...current,
          turns: nextTurns,
          last_message_at: now,
          last_message_source: "human_agent",
        },
      }),
      prefer: "return=minimal",
    },
  );
}
