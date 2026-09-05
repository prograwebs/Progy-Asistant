"use client";

import type { Conversation } from "@/shared/types/workspace";
import { DashboardIcon } from "../LineIcon";
import type { StreamStatus, WhatsAppMessage } from "./conversation-types";
import { conversationChannelLabel, conversationInitials, conversationName, isWhatsAppConversation } from "./conversation-utils";
import { ConversationComposer } from "./ConversationComposer";
import { ConversationThread } from "./ConversationThread";
import styles from "./Conversations.module.css";

function streamLabel(status: StreamStatus) {
  if (status === "connected") return "Sincronizado";
  if (status === "reconnecting") return "Reconectando";
  if (status === "connecting") return "Conectando";
  return "Realtime desactivado";
}

export function ConversationDetail({
  conversation,
  messages,
  loading,
  error,
  streamStatus,
  manualText,
  sending,
  onManualText,
  onSend,
  onBack,
}: {
  conversation: Conversation | null;
  messages: WhatsAppMessage[];
  loading: boolean;
  error: string;
  streamStatus: StreamStatus;
  manualText: string;
  sending: boolean;
  onManualText: (value: string) => void;
  onSend: () => Promise<void>;
  onBack: () => void;
}) {
  if (!conversation) {
    return <section className={`${styles.detailPanel} ${styles.detailEmpty}`}><DashboardIcon name="conversation" size={28} /><strong>Selecciona una conversación</strong><p>Elige un cliente para revisar su historial y actividad.</p></section>;
  }

  const isWhatsApp = isWhatsAppConversation(conversation);
  return (
    <section className={styles.detailPanel} aria-label="Detalle de conversación">
      <header className={styles.detailHeader}>
        <button className={styles.mobileBack} type="button" onClick={onBack} aria-label="Volver a la lista" title="Volver a la lista"><DashboardIcon name="back" size={18} /></button>
        <span className={styles.detailAvatar}>{conversationInitials(conversation)}</span>
        <div className={styles.detailIdentity}>
          <strong>{conversationName(conversation)}</strong>
          <span>{conversation.customer_phone || "Cliente identificado en el panel"}</span>
        </div>
        <div className={styles.detailTags}>
          <span className={styles.channelTag}><DashboardIcon name={isWhatsApp ? "whatsapp" : "voice"} size={14} />{conversationChannelLabel(conversation.channel)}</span>
          <span className={`${styles.connectionTag} ${streamStatus === "connected" ? styles.connectionConnected : ""}`}><i />{streamLabel(streamStatus)}</span>
        </div>
      </header>
      {error && <div className={styles.detailError} role="alert" aria-live="polite">{error}</div>}
      <ConversationThread key={`${conversation.id}-${conversation.channel}`} conversation={conversation} messages={messages} loading={loading} />
      {isWhatsApp ? (
        <ConversationComposer value={manualText} sending={sending} onChange={onManualText} onSend={onSend} />
      ) : (
        <div className={styles.readOnlyNote}><DashboardIcon name="voice" size={15} />Las pruebas de voz se muestran en modo lectura.</div>
      )}
    </section>
  );
}
