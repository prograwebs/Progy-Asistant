"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import BrandMark from "./BrandMark";
import { homeNavigationItem, navigationGroups } from "./config";
import NavItem from "./NavItem";
import { isNavigationItemActive } from "./route-matching";
import type { SidebarProps, SidebarTooltip, SidebarTooltipHandler } from "./component-types";
import UserMenu from "./UserMenu";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import styles from "../ProgyDashboard.module.css";

export default function Sidebar({
  user,
  workspace,
  categoryName,
  currentPlan,
  businesses,
  mobileOpen,
  sidebarCollapsed,
  navigationBadges,
  navigationStatuses,
  onToggle,
  onCloseMobile,
  onWorkspaceChange,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const [tooltip, setTooltip] = useState<SidebarTooltip | null>(null);
  const isCollapsed = sidebarCollapsed && !mobileOpen;
  const sidebarControlLabel = mobileOpen ? "Cerrar menú" : sidebarCollapsed ? "Expandir sidebar" : "Ocultar sidebar";

  const showTooltip: SidebarTooltipHandler = (event, label) => {
    if (!isCollapsed) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: bounds.top + bounds.height / 2 });
  };

  function navigate() {
    setTooltip(null);
    onCloseMobile();
  }

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Cerrar menú" className={styles.mobileOverlay} onClick={onCloseMobile} />}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}><BrandMark /><span className={styles.brandText}>Progy</span></div>
          <button
            className={styles.sidebarToggle}
            type="button"
            onClick={onToggle}
            aria-label={sidebarControlLabel}
            aria-expanded={mobileOpen ? true : !sidebarCollapsed}
            title={sidebarControlLabel}
          >
            <span className={styles.collapseIcon} aria-hidden="true">{sidebarCollapsed ? "›" : "‹"}</span>
            <span className={styles.closeIcon} aria-hidden="true">×</span>
          </button>
        </div>

        <WorkspaceSwitcher
          workspace={workspace}
          categoryName={categoryName}
          currentPlan={currentPlan}
          businesses={businesses}
          collapsed={isCollapsed}
          onChange={onWorkspaceChange}
        />

        <nav className={styles.nav} aria-label="Panel de Progy">
          <NavItem
            item={homeNavigationItem}
            active={isNavigationItemActive(pathname, homeNavigationItem.href)}
            collapsed={isCollapsed}
            badge={navigationBadges?.[homeNavigationItem.id]}
            status={navigationStatuses?.[homeNavigationItem.id]}
            onNavigate={navigate}
            onTooltip={showTooltip}
            onClearTooltip={() => setTooltip(null)}
          />
          {navigationGroups.map((group) => {
            const groupActive = group.items.some((item) => isNavigationItemActive(pathname, item.href));
            return (
              <div className={`${styles.navGroup} ${groupActive ? styles.navGroupActive : ""}`} key={group.id}>
                <div className={styles.navLabel}>{group.label}</div>
                <div className={styles.navGroupItems}>
                  {group.items.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      active={isNavigationItemActive(pathname, item.href)}
                      collapsed={isCollapsed}
                      badge={navigationBadges?.[item.id] ?? item.badge}
                      status={navigationStatuses?.[item.id] ?? item.status}
                      onNavigate={navigate}
                      onTooltip={showTooltip}
                      onClearTooltip={() => setTooltip(null)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        {isCollapsed && tooltip && <div className={styles.sidebarTooltip} role="tooltip" style={{ top: tooltip.top }}>{tooltip.label}</div>}
        <UserMenu user={user} onLogout={onLogout} />
      </aside>
    </>
  );
}
