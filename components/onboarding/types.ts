export type OnboardingStep = "business" | "demo" | "connect";

export type ConnectionChoice = "connected" | "skipped";

export type OnboardingIconName =
  | "clinic"
  | "beautySalon"
  | "hardwareStore"
  | "hotel"
  | "restaurant"
  | "other";

export type OnboardingCategory = {
  code: string;
  label: string;
  description: string;
  icon: OnboardingIconName;
  capabilities: string[];
};

export type OnboardingVoice = {
  id: string;
  name: string;
};

export type DemoScenario = {
  id: string;
  prompt: string;
  reply: string;
  followUp: string;
  followUpReply: string;
};

export type OnboardingDraft = {
  businessName: string;
  categoryCode: string;
  voiceId: string;
  scenarioId: string;
  connectionChoice: ConnectionChoice | null;
  businessId: string;
};
