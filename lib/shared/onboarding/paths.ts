export type OnboardingDestination = "/onboarding/business" | "/onboarding/demo" | "/onboarding/connect" | "/panel";

export function onboardingPathForStatus(flowStatus: string, hasBusiness: boolean): OnboardingDestination {
  if (!hasBusiness) return "/onboarding/business";
  if (flowStatus === "business_created") return "/onboarding/demo";
  if (flowStatus === "demo_completed") return "/onboarding/connect";
  if (["channel_skipped", "channel_connected", "onboarding_completed"].includes(flowStatus)) return "/panel";
  return "/onboarding/business";
}
