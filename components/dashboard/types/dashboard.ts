import type { IntegrationStatus, PanelUser, SelectedWorkspace } from "@/lib/shared/types/workspace";

export type ProgyDashboardProps = {
  user: PanelUser;
  integrations: IntegrationStatus;
};

export type SettingsSectionProps = {
  user: PanelUser;
  workspace: SelectedWorkspace;
  integrations: IntegrationStatus;
};
