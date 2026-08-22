import { generateAssistantDecision } from "../ai/openai";
import { executeAssistantDecision } from "../assistant/actions";
import { buildCompactAgentInstructions } from "../assistant/context";
import { type DataRequest, loadAgentContextWith } from "../supabase-data";
import { recordOpenAIUsage } from "../usage/ledger";
import { getWhatsAppConfig } from "./config";
import { sendWhatsAppText } from "./meta-client";
import {
  appendConversationTurn,
  claimIncomingMessage,
  getConnectionForPhoneNumber,
  getOrCreateConversation,
  saveOutboundMessage,
  updateMessage,
  type WhatsAppConnectionForWebhook,
} from "./webhook-store";
import { isWhatsAppTokenExpired } from "./store";
import { supabaseAdminRequest } from "../supabase-admin";

type WebhookMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type WebhookStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
};

type WebhookValue = {
  metadata?: {
    phone_number_id?: string;
    display_phone_number?: string;
  };
  contacts?: Array<{
    wa_id?: string;
    profile?: { name?: string };
  }>;
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
};

type WebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: WebhookValue;
    }>;
  }>;
};

type HistoryEntry = { role: "user" | "assistant"; text: string };

function asPayload(value: unknown) {
  return value as WebhookPayload;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function historyFromConversation(metadata: unknown): HistoryEntry[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const turns = (metadata as Record<string, unknown>).turns;
  if (!Array.isArray(turns)) return [];
  return turns
    .map((turn) => turn as Record<string, unknown>)
    .filter((turn) =>
      (turn.role === "user" || turn.role === "assistant") &&
      typeof turn.text === "string"
    )
    .map((turn) => ({
      role: turn.role as "user" | "assistant",
      text: String(turn.text).slice(0, 1200),
    }))
    .slice(-8);
}

async function requestAsAdmin<T>(
  path: string,
  options?: RequestInit & { prefer?: string },
) {
  return supabaseAdminRequest<T>(path, options);
}

const adminRequest: DataRequest = requestAsAdmin;

async function processInboundMessage(
  connection: WhatsAppConnectionForWebhook,
  value: WebhookValue,
  message: WebhookMessage,
) {
  const providerMessageId = text(message.id);
  const fromPhone = text(message.from).replace(/\D/g, "");
  if (!providerMessageId || !fromPhone) return "ignored" as const;

  const contact = value.contacts?.find((item) => item.wa_id === message.from) ||
    value.contacts?.[0];
  const customerName = text(contact?.profile?.name) || null;
  const messageText = message.type === "text"
    ? text(message.text?.body).slice(0, 2000)
    : "";

  const claimed = await claimIncomingMessage({
    providerMessageId,
    businessId: connection.business_id,
    phoneNumberId: connection.phone_number_id,
    fromPhone,
    toPhone: value.metadata?.display_phone_number || connection.phone_number_id,
    messageType: text(message.type) || "unknown",
    textBody: messageText || null,
    providerPayload: message,
  });

  if (!claimed) return "duplicate" as const;

  try {
    if (!messageText) {
      await updateMessage(providerMessageId, { status: "ignored" });
      return "ignored" as const;
    }

    if (isWhatsAppTokenExpired(connection.token_expires_at)) {
      throw new Error("WhatsApp connection token expired");
    }

    const conversation = await getOrCreateConversation({
      businessId: connection.business_id,
      customerPhone: fromPhone,
      customerName,
      phoneNumberId: connection.phone_number_id,
    });

    await updateMessage(providerMessageId, {
      conversation_id: conversation.id,
    });

    const context = await loadAgentContextWith(
      adminRequest,
      connection.business_id,
    );
    const generated = await generateAssistantDecision({
      businessId: connection.business_id,
      instructions: buildCompactAgentInstructions(context, messageText),
      userText: messageText,
      history: historyFromConversation(conversation.metadata),
      safetyIdentifier: `progy-whatsapp-${connection.business_id}`,
    });
    const action = await executeAssistantDecision(
      context,
      generated.decision,
      adminRequest,
    );
    const reply = action.type !== "none" && !action.executed && action.message
      ? action.message
      : generated.decision.reply.trim();

    await recordOpenAIUsage(
      connection.business_id,
      generated.usage,
      adminRequest,
    );
    await appendConversationTurn({
      conversationId: conversation.id,
      businessId: connection.business_id,
      userText: messageText,
      reply,
      action,
    });

    const sent = await sendWhatsAppText({
      graphVersion: getWhatsAppConfig().graphVersion,
      phoneNumberId: connection.phone_number_id,
      accessToken: connection.access_token,
      to: fromPhone,
      text: reply,
    });
    const outboundId = sent.result.messages?.[0]?.id || "";
    if (!sent.response.ok || !outboundId) {
      throw new Error("Meta did not accept the WhatsApp response");
    }

    await saveOutboundMessage({
      providerMessageId: outboundId,
      businessId: connection.business_id,
      phoneNumberId: connection.phone_number_id,
      fromPhone: value.metadata?.display_phone_number ||
        connection.phone_number_id,
      toPhone: fromPhone,
      textBody: reply,
      conversationId: conversation.id,
      providerPayload: sent.result,
    });
    await updateMessage(providerMessageId, {
      status: "processed",
      response_message_id: outboundId,
    });
    return "processed" as const;
  } catch (error) {
    console.error("Progy WhatsApp inbound processing failed", {
      businessId: connection.business_id,
      providerMessageId,
      error,
    });
    await updateMessage(providerMessageId, { status: "failed" }).catch(() =>
      undefined
    );
    return "failed" as const;
  }
}

export async function processWhatsAppWebhook(input: unknown) {
  const payload = asPayload(input);
  if (
    payload.object !== "whatsapp_business_account" ||
    !Array.isArray(payload.entry)
  ) {
    return { processed: 0, ignored: 0, duplicates: 0 };
  }

  let processed = 0;
  let ignored = 0;
  let duplicates = 0;

  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages" || !change.value) continue;
      const value = change.value;
      const phoneNumberId = text(value.metadata?.phone_number_id);

      for (const status of value.statuses || []) {
        const id = text(status.id);
        if (id) {
          await updateMessage(id, {
            status: text(status.status) || "unknown",
            provider_payload: status,
          }).catch((error) =>
            console.error("Progy WhatsApp status update failed", error)
          );
        }
      }

      if (!phoneNumberId) continue;
      const connection = await getConnectionForPhoneNumber(phoneNumberId);
      if (!connection || (entry.id && connection.waba_id !== entry.id)) {
        console.error("Progy WhatsApp webhook connection not found", {
          phoneNumberId,
          wabaId: entry.id,
        });
        ignored += (value.messages || []).length;
        continue;
      }

      for (const message of value.messages || []) {
        const result = await processInboundMessage(connection, value, message);
        if (result === "processed") processed += 1;
        if (result === "ignored" || result === "failed") ignored += 1;
        if (result === "duplicate") duplicates += 1;
      }
    }
  }

  return { processed, ignored, duplicates };
}
