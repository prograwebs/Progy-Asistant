import type { Conversation } from "../types";

export type ConversationTurnRole = "user" | "assistant" | "human_agent";

export type ConversationTurn = {
  role: ConversationTurnRole;
  text: string;
  at?: string;
};

export type WhatsAppMessage = {
  id: string;
  providerMessageId: string;
  direction: "inbound" | "outbound";
  messageType: string;
  text: string | null;
  status: string;
  createdAt: string;
};

export type WhatsAppMessagesResponse = {
  error?: string;
  messages?: WhatsAppMessage[];
};

export type ConversationChannelFilter = "all" | "whatsapp_chat" | "web_voice";
export type ConversationStatusFilter = "all" | "active" | "completed" | "failed";

export type ConversationFiltersState = {
  search: string;
  channel: ConversationChannelFilter;
  status: ConversationStatusFilter;
};

export type StreamStatus = "connecting" | "connected" | "reconnecting" | "disabled";

export type ConversationInboxProps = {
  workspace: {
    business: { id: string };
    conversations: Conversation[];
  };
  onRefresh: () => Promise<unknown>;
};
