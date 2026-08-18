import { Bot, MessageCircle, Play, Sparkles, UserRound } from "lucide-react";
import type { DemoScenario } from "./types";
import styles from "./Onboarding.module.css";

export default function ConversationPreview({ businessName, scenario }: { businessName: string; scenario: DemoScenario }) {
  return (
    <div className={styles.conversation} aria-live="polite">
      <div className={styles.conversationHint}><Sparkles size={14} /> Conversación de ejemplo</div>
      <div className={`${styles.messageRow} ${styles.customerRow}`}>
        <span className={styles.messageAvatar}><UserRound size={15} /></span>
        <div><small>Cliente</small><p>{scenario.prompt}</p></div>
      </div>
      <div className={styles.thinking}><span /><span /><span /> Progy está respondiendo…</div>
      <div className={`${styles.messageRow} ${styles.progyRow}`}>
        <span className={`${styles.messageAvatar} ${styles.progyAvatar}`}><Bot size={15} /></span>
        <div><small>Progy · {businessName}</small><p>{scenario.reply}</p><button type="button" className={styles.responseAudio}><Play size={12} fill="currentColor" /> Escuchar respuesta</button></div>
      </div>
      <div className={`${styles.messageRow} ${styles.customerRow}`}>
        <span className={styles.messageAvatar}><UserRound size={15} /></span>
        <div><small>Cliente</small><p>{scenario.followUp}</p></div>
      </div>
      <div className={`${styles.messageRow} ${styles.progyRow}`}>
        <span className={`${styles.messageAvatar} ${styles.progyAvatar}`}><MessageCircle size={15} /></span>
        <div><small>Progy</small><p>{scenario.followUpReply}</p></div>
      </div>
    </div>
  );
}
