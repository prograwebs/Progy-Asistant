export type ProgyEntitlements = {
  code: string;
  label: string;
  maxBusinesses: number;
  maxVoiceTestSessions: number;
  maxVoiceTestSeconds: number;
  maxCatalogItems: number;
  maxCatalogImportsPerMonth: number;
  conversationHistoryDays: number;
  whatsappEnabled: boolean;
  automationEnabled: boolean;
};

const planEntitlements: Record<string, ProgyEntitlements> = {
  trial: {
    code: "trial",
    label: "Prueba",
    maxBusinesses: 1,
    maxVoiceTestSessions: 1,
    maxVoiceTestSeconds: 120,
    maxCatalogItems: 80,
    maxCatalogImportsPerMonth: 1,
    conversationHistoryDays: 7,
    whatsappEnabled: false,
    automationEnabled: false,
  },
  business: {
    code: "business",
    label: "Negocio",
    maxBusinesses: 1,
    maxVoiceTestSessions: 25,
    maxVoiceTestSeconds: 300,
    maxCatalogItems: 500,
    maxCatalogImportsPerMonth: 10,
    conversationHistoryDays: 90,
    whatsappEnabled: true,
    automationEnabled: false,
  },
  pro: {
    code: "pro",
    label: "Pro",
    maxBusinesses: 5,
    maxVoiceTestSessions: 100,
    maxVoiceTestSeconds: 600,
    maxCatalogItems: 2500,
    maxCatalogImportsPerMonth: 50,
    conversationHistoryDays: 365,
    whatsappEnabled: true,
    automationEnabled: true,
  },
};

export function normalizePlanCode(planCode?: string | null) {
  const normalized = String(planCode || "trial").trim().toLowerCase().replaceAll("-", "_");
  if (["trial", "free_trial", "free", "prueba"].includes(normalized)) return "trial";
  if (["business", "negocio"].includes(normalized)) return "business";
  if (["pro", "professional"].includes(normalized)) return "pro";
  return normalized;
}

export function developmentTestingMode() {
  const explicit = String(process.env.PROGY_UNLIMITED_VOICE_TESTS || "").trim();
  if (explicit === "1" || explicit.toLowerCase() === "true") return true;
  if (explicit === "0" || explicit.toLowerCase() === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function entitlementsFor(planCode?: string | null) {
  const normalized = normalizePlanCode(planCode);
  return planEntitlements[normalized] || planEntitlements.trial;
}

export function voiceTrialAllowance(options: {
  planCode?: string | null;
  usedSessions: number;
  usedSeconds?: number;
}) {
  const entitlements = entitlementsFor(options.planCode);
  const sessionsRemaining = Math.max(0, entitlements.maxVoiceTestSessions - Math.max(0, options.usedSessions));
  const secondsRemaining = Math.max(0, entitlements.maxVoiceTestSeconds - Math.max(0, options.usedSeconds || 0));

  return {
    entitlements,
    allowed: sessionsRemaining > 0 && secondsRemaining > 0,
    sessionsRemaining,
    secondsRemaining,
  };
}

export function catalogImportAllowance(options: {
  planCode?: string | null;
  importsThisMonth: number;
  currentCatalogItems: number;
}) {
  const entitlements = entitlementsFor(options.planCode);
  return {
    entitlements,
    allowed: options.importsThisMonth < entitlements.maxCatalogImportsPerMonth && options.currentCatalogItems < entitlements.maxCatalogItems,
    importsRemaining: Math.max(0, entitlements.maxCatalogImportsPerMonth - options.importsThisMonth),
    itemsRemaining: Math.max(0, entitlements.maxCatalogItems - options.currentCatalogItems),
  };
}

export const publicPlanCatalog = Object.values(planEntitlements).map((plan) => ({
  code: plan.code,
  label: plan.label,
  maxBusinesses: plan.maxBusinesses,
  maxVoiceTestSessions: plan.maxVoiceTestSessions,
  maxCatalogItems: plan.maxCatalogItems,
  conversationHistoryDays: plan.conversationHistoryDays,
  whatsappEnabled: plan.whatsappEnabled,
  automationEnabled: plan.automationEnabled,
}));
