"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Conversation } from "../types";
import type {
  ConversationChannelFilter,
  ConversationFiltersState,
  ConversationStatusFilter,
  StreamStatus,
  WhatsAppMessage,
  WhatsAppMessagesResponse,
} from "./conversation-types";
import { filterConversations, isWhatsAppConversation } from "./conversation-utils";

export function useConversationInbox({
  businessId,
  conversations,
  onRefresh,
}: {
  businessId: string;
  conversations: Conversation[];
  onRefresh: () => Promise<unknown>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => filterConversations(conversations, {
    search: "",
    channel: "all",
    status: "all",
  })[0]?.id || null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState("");
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(
    process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true" ? "connecting" : "disabled",
  );
  const [filters, setFilters] = useState<ConversationFiltersState>({
    search: "",
    channel: "all",
    status: "all",
  });
  const selectedIdRef = useRef(selectedId);
  const liveRefreshRef = useRef<((conversationId?: string) => Promise<void>) | null>(null);
  const liveRefreshInFlightRef = useRef(false);
  const liveRefreshQueueRef = useRef(new Set<string>());

  const filteredConversations = useMemo(
    () => filterConversations(conversations, filters),
    [conversations, filters],
  );
  const effectiveSelectedId = selectedId && filteredConversations.some((conversation) => conversation.id === selectedId)
    ? selectedId
    : filteredConversations[0]?.id || null;
  const selectedConversation = conversations.find((conversation) => conversation.id === effectiveSelectedId) || null;

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadMessages = useCallback(async (conversationId = selectedIdRef.current) => {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversationId || !isWhatsAppConversation(conversation)) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setError("");
    try {
      const response = await fetch(
        `/api/whatsapp/messages?businessId=${encodeURIComponent(businessId)}&conversationId=${encodeURIComponent(conversationId)}`,
        { cache: "no-store" },
      );
      const result = await response.json().catch(() => ({})) as WhatsAppMessagesResponse;
      if (!response.ok) throw new Error(result.error || "No pudimos cargar los mensajes.");
      if (selectedIdRef.current === conversationId) setMessages(result.messages || []);
    } catch (cause) {
      if (selectedIdRef.current === conversationId) {
        setError(cause instanceof Error ? cause.message : "No pudimos cargar los mensajes.");
        setMessages([]);
      }
    } finally {
      if (selectedIdRef.current === conversationId) setLoadingMessages(false);
    }
  }, [businessId, conversations]);

  useEffect(() => {
    selectedIdRef.current = effectiveSelectedId;
    void loadMessages(effectiveSelectedId);
  }, [effectiveSelectedId, loadMessages]);

  const selectConversation = useCallback((conversationId: string) => {
    selectedIdRef.current = conversationId;
    setSelectedId(conversationId);
    setManualText("");
    setError("");
    void loadMessages(conversationId);
  }, [loadMessages]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      await onRefresh();
      await loadMessages();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos actualizar las conversaciones.");
    } finally {
      setRefreshing(false);
    }
  }, [loadMessages, onRefresh]);

  useEffect(() => {
    liveRefreshRef.current = async (conversationId?: string) => {
      if (conversationId) liveRefreshQueueRef.current.add(conversationId);
      if (liveRefreshInFlightRef.current) return;

      liveRefreshInFlightRef.current = true;
      try {
        do {
          const affected = new Set(liveRefreshQueueRef.current);
          liveRefreshQueueRef.current.clear();
          await onRefresh();
          const selected = selectedIdRef.current;
          if (selected && (affected.size === 0 || affected.has(selected))) await loadMessages(selected);
        } while (liveRefreshQueueRef.current.size);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos sincronizar las conversaciones.");
      } finally {
        liveRefreshInFlightRef.current = false;
      }
    };
  }, [loadMessages, onRefresh]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_WHATSAPP_ENABLED !== "true") {
      return;
    }

    const source = new EventSource(`/api/whatsapp/stream?businessId=${encodeURIComponent(businessId)}`);
    let refreshTimer: number | null = null;
    const affectedConversationIds = new Set<string>();

    const scheduleRefresh = (conversationId?: string) => {
      if (conversationId) affectedConversationIds.add(conversationId);
      if (refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        const ids = [...affectedConversationIds];
        affectedConversationIds.clear();
        if (!ids.length) {
          void liveRefreshRef.current?.();
          return;
        }
        ids.forEach((id) => liveRefreshQueueRef.current.add(id));
        void liveRefreshRef.current?.();
      }, 250);
    };

    source.addEventListener("whatsapp-stream", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { status?: "connected" | "reconnecting" };
        if (payload.status) setStreamStatus(payload.status);
      } catch {
        setStreamStatus("reconnecting");
      }
    });
    source.addEventListener("whatsapp-update", (event) => {
      setStreamStatus("connected");
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { conversationId?: string };
        scheduleRefresh(payload.conversationId);
      } catch {
        scheduleRefresh();
      }
    });
    source.onerror = () => setStreamStatus("reconnecting");

    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      source.close();
      affectedConversationIds.clear();
    };
  }, [businessId]);

  async function sendManualMessage() {
    const text = manualText.trim();
    if (!selectedConversation || !isWhatsAppConversation(selectedConversation) || !text) return;

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, conversationId: selectedConversation.id, text }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos enviar la respuesta.");
      setManualText("");
      await loadMessages(selectedConversation.id);
      await onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos enviar la respuesta.");
    } finally {
      setSending(false);
    }
  }

  function updateSearch(search: string) {
    setFilters((current) => ({ ...current, search }));
  }

  function updateChannel(channel: ConversationChannelFilter) {
    setFilters((current) => ({ ...current, channel }));
  }

  function updateStatus(status: ConversationStatusFilter) {
    setFilters((current) => ({ ...current, status }));
  }

  return {
    conversations: filteredConversations,
    totalConversations: conversations.length,
    selectedId: effectiveSelectedId,
    selectedConversation,
    selectConversation,
    messages,
    loadingMessages,
    refreshing,
    sending,
    manualText,
    setManualText,
    error,
    streamStatus,
    filters,
    updateSearch,
    updateChannel,
    updateStatus,
    refresh,
    sendManualMessage,
  };
}
