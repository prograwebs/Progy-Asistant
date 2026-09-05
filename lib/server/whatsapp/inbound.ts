import { generateAssistantDecision } from "../ai/openai";
import { executeTool, getEnabledToolsForBusiness } from "../agent/tools/registry";
import { getNicheProfile } from "../niche/profile";
import { checkQuota } from "../billing/quota";
import { type DataRequest, loadAgentContextWith } from "@/lib/server/data/supabase";
import { recordOpenAIUsage } from "../usage/ledger";
import { getWhatsAppConfig } from "./config";
import { sendWhatsAppText } from "./meta-client";
import {
  appendConversationTurn,
  claimIncomingMessage,
  claimSynchronizedMessage,
  getConnectionForPhoneNumber,
  getOrCreateConversation,
  saveOutboundMessage,
  updateCoexistenceSyncStatus,
  updateMessage,
  upsertWhatsAppContact,
  type WhatsAppConnectionForWebhook,
} from "./webhook-store";
import { isWhatsAppTokenExpired } from "./store";
import { supabaseAdminRequest } from "@/lib/server/data/supabase-admin";
import { finishTurnTrace, startTurnTrace, type TurnTrace } from "../observability/langfuse";

type WebhookMessage = {
  id?: string;
  from?: string;
  to?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  history_context?: { status?: string };
};

type HistoryChunk = {
  metadata?: { progress?: number };
  threads?: Array<{ id?: string; messages?: WebhookMessage[] }>;
  errors?: Array<{ code?: number; message?: string }>;
};

type StateSyncEntry = {
  action?: string;
  contact?: {
    full_name?: string;
    first_name?: string;
    phone_number?: string;
  };
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
  history?: HistoryChunk[];
  state_sync?: StateSyncEntry[];
  message_echoes?: WebhookMessage[];
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

function phone(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function messageText(message: WebhookMessage) {
  return message.type === "text"
    ? text(message.text?.body).slice(0, 2000)
    : "";
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
      (turn.role === "user" || turn.role === "assistant" || turn.role === "human_agent") &&
      typeof turn.text === "string"
    )
    .map((turn): HistoryEntry => ({
      role: turn.role === "user" ? "user" : "assistant",
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

const QUOTA_FALLBACK = "En este momento no puedo continuar la conversación. Por favor contacta directamente al negocio.";

async function markQuotaNotice(conversationId: string, businessId: string, metadata: unknown) {
  const current = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {};
  const lastNotice = Date.parse(text(current.quota_notice_sent_at));
  if (Number.isFinite(lastNotice) && Date.now() - lastNotice < 24 * 60 * 60 * 1000) return false;
  await supabaseAdminRequest(`conversations?id=eq.${encodeURIComponent(conversationId)}&business_id=eq.${encodeURIComponent(businessId)}&channel=eq.whatsapp_chat`, {
    method: "PATCH",
    body: JSON.stringify({
      summary: QUOTA_FALLBACK,
      metadata: { ...current, quota_notice_sent_at: new Date().toISOString() },
    }),
    prefer: "return=minimal",
  });
  return true;
}

async function processInboundMessage(
  connection: WhatsAppConnectionForWebhook,
  value: WebhookValue,
  message: WebhookMessage,
) {
  const providerMessageId = text(message.id);
  const fromPhone = phone(message.from);
  if (!providerMessageId || !fromPhone) return "ignored" as const;

  const contact = value.contacts?.find((item) => item.wa_id === message.from) ||
    value.contacts?.[0];
  const customerName = text(contact?.profile?.name) || null;
  const bodyText = messageText(message);
  let failureStage = "claim";
  let hasClaim = false;
  let turnTrace: TurnTrace | undefined;
  try {
    const claimed = await claimIncomingMessage({
      providerMessageId,
      businessId: connection.business_id,
      phoneNumberId: connection.phone_number_id,
      fromPhone,
      toPhone: value.metadata?.display_phone_number || connection.phone_number_id,
      messageType: text(message.type) || "unknown",
      textBody: bodyText || null,
      providerPayload: message,
    });

    if (!claimed) return "duplicate" as const;
    hasClaim = true;

    if (!bodyText) {
      failureStage = "validation";
      await updateMessage(providerMessageId, { status: "ignored" });
      return "ignored" as const;
    }

    failureStage = "validation";
    if (isWhatsAppTokenExpired(connection.token_expires_at)) {
      throw new Error("WhatsApp connection token expired");
    }

    failureStage = "context";
    const conversation = await getOrCreateConversation({
      businessId: connection.business_id,
      customerPhone: fromPhone,
      customerName,
      phoneNumberId: connection.phone_number_id,
    });

    failureStage = "persist_inbound";
    await updateMessage(providerMessageId, {
      conversation_id: conversation.id,
    });

    failureStage = "quota";
    const quota = await checkQuota(connection.business_id, adminRequest);
    if (!quota.allowed) {
      const shouldNotify = await markQuotaNotice(conversation.id, connection.business_id, conversation.metadata);
      if (shouldNotify) {
        const sent = await sendWhatsAppText({
          graphVersion: getWhatsAppConfig().graphVersion,
          phoneNumberId: connection.phone_number_id,
          accessToken: connection.access_token,
          to: fromPhone,
          text: QUOTA_FALLBACK,
        });
        const outboundId = sent.result.messages?.[0]?.id || "";
        if (!sent.response.ok || !outboundId) throw new Error("Meta did not accept the quota response");
        await saveOutboundMessage({
          providerMessageId: outboundId,
          businessId: connection.business_id,
          phoneNumberId: connection.phone_number_id,
          fromPhone: value.metadata?.display_phone_number || connection.phone_number_id,
          toPhone: fromPhone,
          textBody: QUOTA_FALLBACK,
          conversationId: conversation.id,
          providerPayload: sent.result,
        });
        await updateMessage(providerMessageId, { status: "processed", response_message_id: outboundId });
      } else {
        await updateMessage(providerMessageId, { status: "processed" });
      }
      return "processed" as const;
    }

    failureStage = "context";
    const context = await loadAgentContextWith(
      adminRequest,
      connection.business_id,
    );
    const niche = await getNicheProfile(String(context.business.category_code || ""), adminRequest);
    turnTrace = startTurnTrace({
      businessId: connection.business_id,
      conversationId: conversation.id,
      channel: "whatsapp",
      categoryCode: String(context.business.category_code || ""),
      userText: bodyText,
      tags: ["production", "whatsapp"],
    });
    failureStage = "openai";
    const tools = getEnabledToolsForBusiness(context);
    const generated = await generateAssistantDecision({
      businessId: connection.business_id,
      context,
      niche,
      trace: turnTrace,
      userText: bodyText,
      history: historyFromConversation(conversation.metadata),
      safetyIdentifier: `progy-whatsapp-${connection.business_id}`,
      tools,
      onToolCalls: async (toolCalls) => {
        const results: unknown[] = [];
        for (const toolCall of toolCalls) {
          const configuredTool = context.agentTools.find((tool) => String(tool.code || "") === toolCall.name);
          results.push(await executeTool(
            String(configuredTool?.handler_key || toolCall.name),
            context,
            toolCall.arguments,
            adminRequest,
            { toolCode: toolCall.name, conversationId: conversation.id },
          ));
        }
        return results;
      },
    });
    failureStage = "action";
    const action = generated.tool_calls
      .map((call) => call.result)
      .filter((result): result is Awaited<ReturnType<typeof executeTool>> => Boolean(result))
      .at(-1) || { type: "none" as const, executed: false };
    const reply = (action.type !== "none" && !action.executed && action.message
      ? action.message
      : generated.decision.reply.trim()) ||
      text(context.agent.fallback_message) ||
      "No tengo esa información confirmada. Puedo comunicarte con una persona del negocio.";

    failureStage = "usage";
    await recordOpenAIUsage(
      connection.business_id,
      generated.usage,
      adminRequest,
    );
    failureStage = "persist_conversation";
    await appendConversationTurn({
      conversationId: conversation.id,
      businessId: connection.business_id,
      userText: bodyText,
      reply,
      action,
    });

    failureStage = "send_meta";
    const sent = await sendWhatsAppText({
      graphVersion: getWhatsAppConfig().graphVersion,
      phoneNumberId: connection.phone_number_id,
      accessToken: connection.access_token,
      to: fromPhone,
      text: reply,
    });
    const outboundId = sent.result.messages?.[0]?.id || "";
    if (!sent.response.ok || !outboundId) {
      console.error("Progy WhatsApp Meta response rejected", {
        status: sent.response.status,
        code: sent.result.error?.code,
        subcode: sent.result.error?.error_subcode,
        type: sent.result.error?.type,
        message: "Meta rechazó el mensaje o no devolvió un identificador.",
        replyLength: reply.length,
      });
      throw new Error("Meta did not accept the WhatsApp response");
    }

    failureStage = "persist_outbound";
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
    failureStage = "mark_processed";
    await updateMessage(providerMessageId, {
      status: "processed",
      response_message_id: outboundId,
    });
    await finishTurnTrace(turnTrace, { reply, intent: generated.decision.intent, action });
    return "processed" as const;
  } catch (error) {
    await finishTurnTrace(turnTrace, null, error);
    console.error("Progy WhatsApp inbound processing failed", {
      businessId: connection.business_id,
      providerMessageId,
      stage: failureStage,
      error: error instanceof Error ? error.message : "unknown",
    });
    if (hasClaim) {
      await updateMessage(providerMessageId, { status: "failed" }).catch(() =>
        undefined
      );
    }
    return "failed" as const;
  }
}

async function processHistoryEvent(
  connection: WhatsAppConnectionForWebhook,
  value: WebhookValue,
) {
  const businessPhone = phone(value.metadata?.display_phone_number) ||
    phone(connection.phone_number);
  let processed = 0;
  let completed = false;
  let failed = false;

  for (const chunk of value.history || []) {
    if (chunk.errors?.length) failed = true;
    if ((chunk.metadata?.progress || 0) >= 100) completed = true;

    for (const thread of chunk.threads || []) {
      const threadPhone = phone(thread.id);
      if (!threadPhone) continue;

      for (const message of thread.messages || []) {
        const providerMessageId = text(message.id);
        const fromPhone = phone(message.from) || businessPhone;
        const toPhone = phone(message.to) || threadPhone;
        if (!providerMessageId || !fromPhone) continue;

        const outbound = Boolean(businessPhone && fromPhone === businessPhone);
        const claimed = await claimSynchronizedMessage({
          providerMessageId,
          businessId: connection.business_id,
          phoneNumberId: connection.phone_number_id,
          fromPhone,
          toPhone,
          direction: outbound ? "outbound" : "inbound",
          messageType: text(message.type) || "unknown",
          textBody: messageText(message) || null,
          status: "history",
          providerPayload: message,
        });
        if (!claimed) continue;

        const conversation = await getOrCreateConversation({
          businessId: connection.business_id,
          customerPhone: outbound ? threadPhone : fromPhone,
          phoneNumberId: connection.phone_number_id,
        });
        await updateMessage(providerMessageId, {
          conversation_id: conversation.id,
        });
        processed += 1;
      }
    }
  }

  await updateCoexistenceSyncStatus({
    phoneNumberId: connection.phone_number_id,
    syncType: "history",
    status: failed ? "failed" : completed ? "completed" : "received",
  });
  return processed;
}

async function processContactSyncEvent(
  connection: WhatsAppConnectionForWebhook,
  value: WebhookValue,
) {
  let processed = 0;
  for (const entry of value.state_sync || []) {
    const contactPhone = phone(entry.contact?.phone_number);
    if (!contactPhone) continue;
    const action = text(entry.action).toLowerCase();
    await upsertWhatsAppContact({
      businessId: connection.business_id,
      phoneNumber: contactPhone,
      fullName: text(entry.contact?.full_name) || null,
      firstName: text(entry.contact?.first_name) || null,
      active: action !== "delete" && action !== "deleted" && action !== "remove",
    });
    processed += 1;
  }

  await updateCoexistenceSyncStatus({
    phoneNumberId: connection.phone_number_id,
    syncType: "contacts",
    status: "completed",
  });
  return processed;
}

async function processMessageEchoes(
  connection: WhatsAppConnectionForWebhook,
  value: WebhookValue,
) {
  const businessPhone = phone(value.metadata?.display_phone_number) ||
    phone(connection.phone_number);
  let processed = 0;

  for (const message of value.message_echoes || []) {
    const providerMessageId = text(message.id);
    const fromPhone = phone(message.from) || businessPhone;
    const toPhone = phone(message.to);
    if (!providerMessageId || !fromPhone || !toPhone) continue;

    const claimed = await claimSynchronizedMessage({
      providerMessageId,
      businessId: connection.business_id,
      phoneNumberId: connection.phone_number_id,
      fromPhone,
      toPhone,
      direction: "outbound",
      messageType: text(message.type) || "unknown",
      textBody: messageText(message) || null,
      status: "echo",
      providerPayload: message,
    });
    if (!claimed) continue;

    const conversation = await getOrCreateConversation({
      businessId: connection.business_id,
      customerPhone: toPhone,
      phoneNumberId: connection.phone_number_id,
    });
    await updateMessage(providerMessageId, {
      conversation_id: conversation.id,
    });
    processed += 1;
  }

  return processed;
}

export async function processWhatsAppWebhook(input: unknown) {
  const payload = asPayload(input);
  if (
    payload.object !== "whatsapp_business_account" ||
    !Array.isArray(payload.entry)
  ) {
    return { processed: 0, ignored: 0, duplicates: 0, failed: 0 };
  }

  let processed = 0;
  let ignored = 0;
  let duplicates = 0;
  let failed = 0;
  let synchronized = 0;

  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      if (!change.value) continue;
      const value = change.value;
      const phoneNumberId = text(value.metadata?.phone_number_id);

      if (!phoneNumberId) continue;

      const connection = await getConnectionForPhoneNumber(phoneNumberId);
      if (!connection || (entry.id && connection.waba_id !== entry.id)) {
        console.error("Progy WhatsApp webhook connection not found", {
          phoneNumberId,
          wabaId: entry.id,
          field: change.field,
        });
        continue;
      }

      if (change.field === "history") {
        synchronized += await processHistoryEvent(connection, value);
        continue;
      }

      if (change.field === "smb_app_state_sync") {
        synchronized += await processContactSyncEvent(connection, value);
        continue;
      }

      if (change.field === "smb_message_echoes") {
        synchronized += await processMessageEchoes(connection, value);
        continue;
      }

      if (change.field !== "messages") continue;

      for (const status of value.statuses || []) {
        const id = text(status.id);
        if (id) {
          await updateMessage(id, {
            status: text(status.status) || "unknown",
            provider_payload: status,
          }).catch((error) =>
            console.error("Progy WhatsApp status update failed", {
              error: error instanceof Error ? error.message : "unknown",
            })
          );
        }
      }

      for (const message of value.messages || []) {
        const result = await processInboundMessage(connection, value, message);
        if (result === "processed") processed += 1;
        if (result === "ignored") ignored += 1;
        if (result === "failed") failed += 1;
        if (result === "duplicate") duplicates += 1;
      }
    }
  }

  return { processed, ignored, duplicates, failed, synchronized };
}
