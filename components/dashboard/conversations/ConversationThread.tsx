import { DashboardIcon } from "../LineIcon";
import { dateTime } from "@/lib/shared/utils/formatters";
import type { Conversation } from "@/lib/shared/types/workspace";
import type { ConversationTurn, WhatsAppMessage } from "./conversation-types";
import { conversationDuration, conversationTurns, statusLabel } from "./conversation-utils";
import styles from "./Conversations.module.css";

function ThreadEmpty({ text }: { text: string }) {
  return <div className={styles.threadEmpty}><DashboardIcon name="conversation" size={22} /><p>{text}</p></div>;
}

function VoiceTurn({ turn }: { turn: ConversationTurn }) {
  const roleLabel = turn.role === "user" ? "Cliente" : turn.role === "human_agent" ? "Negocio" : "Progy";
  return (
    <div className={`${styles.threadRow} ${turn.role === "user" ? styles.threadRowInbound : styles.threadRowOutbound}`}>
      <div className={`${styles.bubble} ${turn.role === "user" ? styles.bubbleInbound : styles.bubbleOutbound}`}>
        <span className={styles.bubbleAuthor}>{roleLabel}</span>
        <p>{turn.text}</p>
        {turn.at && <time>{dateTime(turn.at)}</time>}
      </div>
    </div>
  );
}

export function ConversationThread({
  conversation,
  messages,
  loading,
}: {
  conversation: Conversation;
  messages: WhatsAppMessage[];
  loading: boolean;
}) {
  if (loading && !messages.length) return <div className={styles.threadLoading}><span className={styles.loadingPulse} /><span className={styles.loadingPulse} /><span className={styles.loadingPulse} /></div>;

  if (conversation.channel === "web_voice") {
    const turns = conversationTurns(conversation);
    return (
      <div className={styles.threadContent}>
        <div className={styles.voiceSummary}>
          <div><span>Duración</span><strong>{conversationDuration(conversation.duration_seconds)}</strong></div>
          <div><span>Resultado</span><strong>{conversation.outcome || "Prueba del asistente"}</strong></div>
          <div><span>Estado</span><strong>{statusLabel(conversation.status)}</strong></div>
        </div>
        {turns.length ? turns.map((turn, index) => <VoiceTurn key={`${turn.role}-${turn.at || index}`} turn={turn} />) : <ThreadEmpty text="Esta prueba no tiene una transcripción guardada." />}
      </div>
    );
  }

  if (!messages.length) return <ThreadEmpty text="Aún no hay mensajes guardados para esta conversación." />;
  return (
    <div className={styles.threadContent}>
      {messages.map((message) => (
        <div className={`${styles.threadRow} ${message.direction === "inbound" ? styles.threadRowInbound : styles.threadRowOutbound}`} key={message.id}>
          <div className={`${styles.bubble} ${message.direction === "inbound" ? styles.bubbleInbound : styles.bubbleOutbound}`}>
            <span className={styles.bubbleAuthor}>{message.direction === "inbound" ? "Cliente" : "Negocio"}</span>
            <p>{message.text || `Mensaje ${message.messageType}`}</p>
            <time>{dateTime(message.createdAt)} · {statusLabel(message.status)}</time>
          </div>
        </div>
      ))}
    </div>
  );
}
