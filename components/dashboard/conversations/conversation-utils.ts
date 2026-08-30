import type { Conversation } from "../types";
import { dateTime } from "@shared/utils/formatters";
import type {
  ConversationFiltersState,
  ConversationTurn,
  ConversationTurnRole,
} from "./conversation-types";

type Metadata = Record<string, unknown>;

function metadataOf(conversation: Conversation): Metadata {
  return conversation.metadata && typeof conversation.metadata === "object" && !Array.isArray(conversation.metadata)
    ? conversation.metadata
    : {};
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

export function conversationTurns(conversation: Conversation): ConversationTurn[] {
  const turns = metadataOf(conversation).turns;
  if (!Array.isArray(turns)) return [];

  return turns.flatMap((value): ConversationTurn[] => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const turn = value as Record<string, unknown>;
      const role = turn.role;
      if (role !== "user" && role !== "assistant" && role !== "human_agent") return [];
      if (typeof turn.text !== "string" || !turn.text.trim()) return [];
      return [{
        role: role as ConversationTurnRole,
        text: turn.text,
        at: isDate(turn.at) ? turn.at : undefined,
      }];
    });
}

export function conversationName(conversation: Conversation) {
  return conversation.customer_name?.trim() || conversation.customer_phone?.trim() || "Cliente sin identificar";
}

export function conversationInitials(conversation: Conversation) {
  const name = conversationName(conversation);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "C";
}

export function conversationChannelLabel(channel: string) {
  if (channel === "whatsapp_chat") return "WhatsApp";
  if (channel === "web_voice") return "Voz web";
  return channel.replaceAll("_", " ") || "Canal";
}

export function statusLabel(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  const labels: Record<string, string> = {
    active: "En curso",
    completed: "Completada",
    failed: "Fallida",
    pending: "Pendiente",
    confirmed: "Confirmado",
    cancelled: "Cancelado",
    canceled: "Cancelado",
    processing: "En proceso",
    ready: "Listo",
    delivered: "Entregado",
    sent: "Enviado",
    delivered_to_meta: "Entregado",
    read: "Leído",
  };
  return labels[normalized] || status || "Sin estado";
}

export function conversationLastActivity(conversation: Conversation) {
  const value = metadataOf(conversation).last_message_at;
  return isDate(value) ? value : conversation.started_at;
}

export function conversationPreview(conversation: Conversation) {
  const turns = conversationTurns(conversation);
  const lastTurn = turns.at(-1)?.text;
  return lastTurn || conversation.summary || conversation.outcome || "Sin actividad registrada";
}

export function conversationTime(conversation: Conversation) {
  return dateTime(conversationLastActivity(conversation));
}

export function conversationDuration(seconds: number) {
  const duration = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.floor(duration / 60);
  const remainingSeconds = duration % 60;
  return minutes ? `${minutes} min ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort(
    (a, b) => new Date(conversationLastActivity(b)).getTime() - new Date(conversationLastActivity(a)).getTime(),
  );
}

export function filterConversations(
  conversations: Conversation[],
  filters: ConversationFiltersState,
) {
  const query = filters.search.trim().toLocaleLowerCase();
  return sortConversations(conversations).filter((conversation) => {
    if (filters.channel !== "all" && conversation.channel !== filters.channel) return false;
    if (filters.status !== "all" && conversation.status !== filters.status) return false;
    if (!query) return true;

    const searchable = [
      conversationName(conversation),
      conversation.customer_phone || "",
      conversation.summary || "",
      conversation.outcome || "",
      ...conversationTurns(conversation).map((turn) => turn.text),
    ].join(" ").toLocaleLowerCase();
    return searchable.includes(query);
  });
}

export function isWhatsAppConversation(conversation?: Conversation | null) {
  return conversation?.channel === "whatsapp_chat";
}
