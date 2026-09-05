import type { FocusEvent, MouseEvent } from "react";
import type { Business, PanelUser } from "@/lib/shared/types/workspace";
import type { NavigationBadge, NavigationItem, NavigationStatus } from "./types";

export type SidebarTooltip = {
  label: string;
  top: number;
};

export type SidebarTooltipHandler = (
  event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>,
  label: string,
) => void;

export type NavItemProps = {
  item: NavigationItem;
  active: boolean;
  collapsed: boolean;
  badge?: NavigationBadge;
  status?: NavigationStatus;
  onNavigate: () => void;
  onTooltip: SidebarTooltipHandler;
  onClearTooltip: () => void;
};

export type WorkspaceSwitcherProps = {
  workspace: Business;
  categoryName?: string;
  currentPlan: string;
  businesses: Business[];
  collapsed: boolean;
  onChange: (businessId: string) => void;
};

export type UserMenuProps = {
  user: PanelUser;
  onLogout: () => void;
};

export type SidebarProps = {
  user: PanelUser;
  workspace: Business;
  categoryName?: string;
  currentPlan: string;
  businesses: Business[];
  mobileOpen: boolean;
  sidebarCollapsed: boolean;
  navigationBadges?: Partial<Record<NavigationItem["id"], NavigationBadge>>;
  navigationStatuses?: Partial<Record<NavigationItem["id"], NavigationStatus>>;
  onToggle: () => void;
  onCloseMobile: () => void;
  onWorkspaceChange: (businessId: string) => void;
  onLogout: () => void;
};
