import { getOnboardingTemplate, listOnboardingTemplates } from "@/lib/shared/onboarding/templates";
import type { DemoScenario, OnboardingCategory } from "@/lib/shared/types/onboarding";

export const onboardingCategories: OnboardingCategory[] = listOnboardingTemplates().map((template) => ({
  code: template.code,
  label: template.label,
  description: template.description,
  icon: template.icon,
  capabilities: template.capabilities,
}));

export const defaultOnboardingDraft = {
  businessName: "",
  categoryCode: "clinic",
  voiceId: "",
  scenarioId: "clinic-availability",
  connectionChoice: null,
  businessId: "",
} as const;

export function getCategory(code: string) {
  return onboardingCategories.find((category) => category.code === code) ?? onboardingCategories[0];
}

export function getScenarios(categoryCode: string) {
  return getOnboardingTemplate(categoryCode).scenarios as DemoScenario[];
}

export function getScenario(categoryCode: string, scenarioId: string) {
  const categoryScenarios = getScenarios(categoryCode);
  return categoryScenarios.find((scenario) => scenario.id === scenarioId) ?? categoryScenarios[0];
}
