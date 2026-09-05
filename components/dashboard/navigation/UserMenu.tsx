"use client";

import { initials } from "@/lib/shared/utils/formatters";
import type { UserMenuProps } from "./component-types";
import styles from "../ProgyDashboard.module.css";

export default function UserMenu({ user, onLogout }: UserMenuProps) {
  return (
    <div className={styles.user}>
      <span className={styles.userAvatar}>{initials(user.name)}</span>
      <div className={styles.userDetails}><b>{user.name}</b><small>{user.email}</small></div>
      <button type="button" className={styles.logout} onClick={onLogout}>Salir</button>
    </div>
  );
}
