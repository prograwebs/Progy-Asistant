"use client";

import { useState } from "react";
import { Card } from "../ui";
import { DashboardIcon } from "../LineIcon";
import type { ConversationInboxProps } from "./conversation-types";
import { ConversationDetail } from "./ConversationDetail";
import { ConversationFilters } from "./ConversationFilters";
import { ConversationList } from "./ConversationList";
import { useConversationInbox } from "./useConversationInbox";
import styles from "./Conversations.module.css";

export function ConversationInbox({ workspace, onRefresh }: ConversationInboxProps) {
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const inbox = useConversationInbox({
    businessId: workspace.business.id,
    conversations: workspace.conversations,
    onRefresh,
  });

  return (
    <Card className={`${styles.inboxCard} ${mobileDetailOpen ? styles.mobileDetailOpen : ""}`}>
      <div className={styles.inboxToolbar}>
        <div>
          <span className={styles.panelEyebrow}>CENTRO DE ATENCIÓN</span>
          <p>Revisa rápidamente la actividad de tus clientes desde un solo lugar.</p>
        </div>
        <div className={styles.toolbarActions}>
          <span className={styles.liveStatus} aria-live="polite"><i className={inbox.streamStatus === "connected" ? styles.liveDot : ""} />{inbox.streamStatus === "connected" ? "En vivo" : inbox.streamStatus === "reconnecting" ? "Reconectando" : inbox.streamStatus === "connecting" ? "Conectando" : "Realtime apagado"}</span>
          <button className={styles.iconButton} type="button" onClick={() => void inbox.refresh()} disabled={inbox.refreshing} aria-label="Actualizar conversaciones" title="Actualizar conversaciones"><DashboardIcon name="refresh" size={17} /></button>
        </div>
      </div>
      <ConversationFilters filters={inbox.filters} onSearch={inbox.updateSearch} onChannel={inbox.updateChannel} onStatus={inbox.updateStatus} />
      <div className={styles.inboxLayout}>
        <ConversationList conversations={inbox.conversations} selectedId={inbox.selectedId} total={inbox.totalConversations} onSelect={(id) => { inbox.selectConversation(id); setMobileDetailOpen(true); }} />
        <ConversationDetail
          conversation={inbox.selectedConversation}
          messages={inbox.messages}
          loading={inbox.loadingMessages}
          error={inbox.error}
          streamStatus={inbox.streamStatus}
          manualText={inbox.manualText}
          sending={inbox.sending}
          onManualText={inbox.setManualText}
          onSend={inbox.sendManualMessage}
          onBack={() => setMobileDetailOpen(false)}
        />
      </div>
    </Card>
  );
}
