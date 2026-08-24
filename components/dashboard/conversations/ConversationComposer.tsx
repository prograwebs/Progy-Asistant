"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { DashboardIcon } from "../LineIcon";
import styles from "./Conversations.module.css";

export function ConversationComposer({
  value,
  sending,
  onChange,
  onSend,
}: {
  value: string;
  sending: boolean;
  onChange: (value: string) => void;
  onSend: () => Promise<void>;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSend();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sending && value.trim()) void onSend();
    }
  }

  return (
    <form className={styles.composer} onSubmit={submit}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 4096))}
        onKeyDown={handleKeyDown}
        placeholder="Escribe una respuesta…"
        aria-label="Respuesta manual"
        rows={2}
        disabled={sending}
      />
      <div className={styles.composerFooter}>
        <span>Enter para enviar · Shift + Enter para nueva línea</span>
        <button
          className={styles.sendButton}
          type="submit"
          disabled={sending || !value.trim()}
          aria-label={sending ? "Enviando respuesta" : "Enviar respuesta manual"}
          title={sending ? "Enviando respuesta" : "Enviar respuesta manual"}
        >
          <DashboardIcon name="send" size={17} />
        </button>
      </div>
    </form>
  );
}
