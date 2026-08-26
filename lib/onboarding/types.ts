export type TemplateIcon = "clinic" | "beautySalon" | "hardwareStore" | "hotel" | "restaurant" | "other";

export type OnboardingTemplate = {
  version: string;
  code: string;
  label: string;
  description: string;
  icon: TemplateIcon;
  capabilities: string[];
  features: string[];
  tone: string;
  hours: Array<{ dayOfWeek: number; opensAt: string | null; closesAt: string | null; isClosed: boolean }>;
  catalog: Array<{
    key: string;
    kind: "product" | "service";
    name: string;
    description: string;
    price: number;
    durationMinutes?: number | null;
    sortOrder: number;
  }>;
  knowledge: Array<{
    key: string;
    kind: "faq" | "policy" | "payment_method" | "instruction";
    title: string;
    question: string;
    answer: string;
    priority: number;
  }>;
  scenarios: Array<{
    id: string;
    prompt: string;
    reply: string;
    followUp: string;
    followUpReply: string;
  }>;
};

export type OnboardingFlowStatus =
  | "business_created"
  | "demo_completed"
  | "channel_skipped"
  | "channel_connected"
  | "onboarding_completed";

export type OnboardingStatus = OnboardingFlowStatus;

export type OnboardingActivationStatus = "preparing" | "ready" | "active";
export type ActivationStatus = OnboardingActivationStatus;
export type OnboardingChannelStatus = "pending" | "skipped" | "connected";
export type TemplateVersion = string;

export type OnboardingReadiness = {
  business: boolean;
  voice: boolean;
  hours: boolean;
  catalog: boolean;
  basicInfo: boolean;
  demo: boolean;
  channel: boolean;
  ready: boolean;
};

export type OnboardingRecord = {
  flow_status: OnboardingFlowStatus;
  activation_status: OnboardingActivationStatus;
  channel_status: OnboardingChannelStatus;
  template_version: string;
  selected_voice_id?: string | null;
  selected_scenario_key?: string | null;
  demo_completed_at?: string | null;
  channel_updated_at?: string | null;
  completed_at?: string | null;
  activated_at?: string | null;
};

export type OnboardingSnapshot = {
  business: Record<string, unknown>;
  onboarding: Record<string, unknown>;
  agent: Record<string, unknown> | null;
  hours: Record<string, unknown>[];
  catalogItems: Record<string, unknown>[];
  knowledge: Record<string, unknown>[];
  readiness: OnboardingReadiness;
};

export type OnboardingActionPayload =
  | { action: "createBusiness"; name: string; categoryCode: string; businessId?: string }
  | { action: "saveDemo"; businessId: string; voiceId: string; scenarioId: string }
  | { action: "channelSkipped"; businessId: string }
  | { action: "channelConnected"; businessId: string }
  | { action: "activate"; businessId: string };
