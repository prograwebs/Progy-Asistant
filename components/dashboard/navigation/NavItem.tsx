"use client";

import Link from "next/link";
import { DashboardIcon } from "../LineIcon";
import type { NavigationStatus } from "./types";
import type { NavItemProps } from "./component-types";
import styles from "../ProgyDashboard.module.css";

function badgeClass(tone: NonNullable<NavItemProps["badge"]>["tone"]): string {
  if (tone === "success") return styles.navBadgeSuccess;
  if (tone === "attention") return styles.navBadgeAttention;
  return "";
}

function statusLabel(status: NavigationStatus): string {
  return status === "connected" ? "Conectado" : "Requiere atención";
}

export default function NavItem({ item, active, collapsed, badge, status, onNavigate, onTooltip, onClearTooltip }: NavItemProps) {
  const statusDescription = status ? statusLabel(status) : "";
  const badgeDescription = badge ? badge.label || String(badge.value) : "";
  const tooltipLabel = [item.label, badgeDescription, statusDescription].filter(Boolean).join(" · ");

  return (
    <Link
      href={item.href}
      className={`${active ? styles.active : ""}`}
      onClick={onNavigate}
      aria-label={tooltipLabel}
      aria-current={active ? "page" : undefined}
      title={collapsed ? tooltipLabel : undefined}
      onMouseEnter={(event) => onTooltip(event, tooltipLabel)}
      onMouseLeave={onClearTooltip}
      onFocus={(event) => onTooltip(event, tooltipLabel)}
      onBlur={onClearTooltip}
    >
      <span className={styles.navIcon}><DashboardIcon name={item.icon} /></span>
      <span className={styles.navText}>{item.label}</span>
      {badge && <span className={`${styles.navBadge} ${badgeClass(badge.tone)}`}>{badge.value}</span>}
      {status && <span className={`${styles.navStatus} ${status === "connected" ? styles.navStatusConnected : styles.navStatusAttention}`} role="img" aria-label={statusLabel(status)} />}
    </Link>
  );
}
