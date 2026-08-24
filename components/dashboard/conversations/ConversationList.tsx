import type { Conversation } from "../types";
import { EmptyState } from "../ui";
import { ConversationListItem } from "./ConversationListItem";
import styles from "./Conversations.module.css";

export function ConversationList({
  conversations,
  selectedId,
  total,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  total: number;
  onSelect: (id: string) => void;
}) {
  return (
    <section className={styles.listPanel} aria-label="Lista de conversaciones">
      <div className={styles.listPanelHeader}>
        <div>
          <span className={styles.panelEyebrow}>BANDEJA</span>
          <h2>Clientes</h2>
        </div>
        <span className={styles.countBadge}>{conversations.length}{conversations.length !== total ? ` / ${total}` : ""}</span>
      </div>
      <div className={styles.conversationList}>
        {conversations.length ? conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            selected={selectedId === conversation.id}
            onSelect={() => onSelect(conversation.id)}
          />
        )) : (
          <EmptyState
            title={total ? "Sin coincidencias" : "Aún no hay conversaciones"}
            text={total ? "Prueba con otra búsqueda o cambia los filtros." : "Las conversaciones de tus clientes aparecerán aquí."}
          />
        )}
      </div>
    </section>
  );
}
