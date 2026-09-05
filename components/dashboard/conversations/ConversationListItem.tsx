import type { Conversation } from "@/lib/shared/types/workspace";
import { DashboardIcon } from "../LineIcon";
import {
  conversationChannelLabel,
  conversationInitials,
  conversationLastActivity,
  conversationName,
  conversationPreview,
  conversationTime,
  statusLabel,
} from "./conversation-utils";
import styles from "./Conversations.module.css";

export function ConversationListItem({
  conversation,
  selected,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: () => void;
}) {
  const isVoice = conversation.channel === "web_voice";
  return (
    <button
      type="button"
      className={`${styles.conversationItem} ${selected ? styles.conversationItemSelected : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={styles.avatar} aria-hidden="true">{conversationInitials(conversation)}</span>
      <span className={styles.conversationItemBody}>
        <span className={styles.conversationItemTopline}>
          <strong>{conversationName(conversation)}</strong>
          <time dateTime={conversationLastActivity(conversation)}>{conversationTime(conversation)}</time>
        </span>
        <span className={styles.conversationItemPreview}>{conversationPreview(conversation)}</span>
        <span className={styles.conversationItemMeta}>
          <span><DashboardIcon name={isVoice ? "voice" : "whatsapp"} size={13} />{conversationChannelLabel(conversation.channel)}</span>
          <span className={`${styles.statusDot} ${styles[`status_${conversation.status}`] || ""}`} />
          <span>{statusLabel(conversation.status)}</span>
        </span>
      </span>
    </button>
  );
}
