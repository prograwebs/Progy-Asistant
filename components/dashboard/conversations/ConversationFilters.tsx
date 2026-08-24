"use client";

import { DashboardIcon } from "../LineIcon";
import type {
  ConversationChannelFilter,
  ConversationFiltersState,
  ConversationStatusFilter,
} from "./conversation-types";
import styles from "./Conversations.module.css";

export function ConversationFilters({
  filters,
  onSearch,
  onChannel,
  onStatus,
}: {
  filters: ConversationFiltersState;
  onSearch: (value: string) => void;
  onChannel: (value: ConversationChannelFilter) => void;
  onStatus: (value: ConversationStatusFilter) => void;
}) {
  return (
    <div className={styles.filters}>
      <label className={styles.searchField}>
        <DashboardIcon name="search" size={16} />
        <span className={styles.srOnly}>Buscar conversaciones</span>
        <input
          value={filters.search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar cliente, teléfono o mensaje"
          type="search"
        />
      </label>
      <div className={styles.filterGroup} aria-label="Filtrar por canal">
        {([
          ["all", "Todos"],
          ["whatsapp_chat", "WhatsApp"],
          ["web_voice", "Voz"],
        ] as const).map(([value, label]) => (
          <button
            className={filters.channel === value ? styles.filterActive : styles.filterButton}
            key={value}
            type="button"
            onClick={() => onChannel(value)}
            aria-pressed={filters.channel === value}
          >
            {label}
          </button>
        ))}
      </div>
      <label className={styles.selectField}>
        <DashboardIcon name="filter" size={14} />
        <span className={styles.srOnly}>Filtrar por estado</span>
        <select value={filters.status} onChange={(event) => onStatus(event.target.value as ConversationStatusFilter)}>
          <option value="all">Todos los estados</option>
          <option value="active">En curso</option>
          <option value="completed">Completadas</option>
          <option value="failed">Fallidas</option>
        </select>
      </label>
    </div>
  );
}
