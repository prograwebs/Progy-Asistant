"use client";

import { initials } from "@/lib/shared/utils/formatters";
import type { WorkspaceSwitcherProps } from "./component-types";
import styles from "../ProgyDashboard.module.css";

export default function WorkspaceSwitcher({ workspace, categoryName, currentPlan, businesses, collapsed, onChange }: WorkspaceSwitcherProps) {
  return (
    <>
      <div className={styles.businessSwitch} role="group" aria-label={`Workspace activo: ${workspace.name}`} title={collapsed ? workspace.name : undefined}>
        <span className={styles.businessAvatar}>{initials(workspace.name)}</span>
        <div className={styles.businessDetails}><b>{workspace.name}</b><small>{categoryName || "Negocio"} · {currentPlan}</small></div>
      </div>
      {businesses.length > 1 && (
        <select
          className={styles.businessSelect}
          value={workspace.id}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Cambiar de negocio"
          title={collapsed ? workspace.name : undefined}
        >
          {businesses.map((business) => <option value={business.id} key={business.id}>{business.name}</option>)}
        </select>
      )}
    </>
  );
}
