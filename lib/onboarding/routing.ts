import type { OnboardingDraft } from "../../components/onboarding/types";
import { supabaseDataRequest } from "../supabase-data";
import { onboardingPathForStatus } from "./paths";

type Row = Record<string, unknown>;

export type OnboardingResume = {
  businessId: string;
  businessName: string;
  categoryCode: string;
  flowStatus: string;
  activationStatus: string;
  channelStatus: string;
  nextPath: "/onboarding/business" | "/onboarding/demo" | "/onboarding/connect" | "/panel";
  draft: OnboardingDraft;
};

function text(row: Row | null | undefined, key: string) {
  return String(row?.[key] ?? "");
}

function enc(value: string) {
  return encodeURIComponent(value);
}

function draftFor(business: Row, onboarding: Row): OnboardingDraft {
  const categoryCode = text(business, "category_code") || "clinic";
  const flowStatus = text(onboarding, "flow_status");
  return {
    businessName: text(business, "name"),
    categoryCode,
    voiceId: text(onboarding, "selected_voice_id"),
    scenarioId: text(onboarding, "selected_scenario_key") || (categoryCode === "clinic" ? "clinic-availability" : ""),
    connectionChoice: ["channel_skipped", "channel_connected", "onboarding_completed"].includes(flowStatus)
      ? (text(onboarding, "channel_status") === "connected" ? "connected" : "skipped")
      : null,
    businessId: text(business, "id"),
  };
}

export async function getOnboardingResume(userId: string): Promise<OnboardingResume | null> {
  const businesses = await supabaseDataRequest<Row[]>(
    `businesses?owner_id=eq.${enc(userId)}&select=id,name,category_code,status,created_at&order=created_at.desc`,
  );
  if (!businesses.length) return null;

  const candidates = await Promise.all(businesses.map(async (business) => {
    const businessId = text(business, "id");
    const rows = await supabaseDataRequest<Row[]>(
      `business_onboarding?business_id=eq.${enc(businessId)}&select=flow_status,activation_status,channel_status,selected_voice_id,selected_scenario_key`,
    );
    const onboarding = rows[0] ?? {
      flow_status: text(business, "status") === "active" ? "onboarding_completed" : "business_created",
      activation_status: text(business, "status") === "active" ? "active" : "preparing",
      channel_status: "pending",
    };
    return { business, onboarding, flowStatus: text(onboarding, "flow_status") };
  }));

  const selected = candidates.find(({ flowStatus }) => !["channel_skipped", "channel_connected", "onboarding_completed"].includes(flowStatus)) ?? candidates[0];
  const { business, onboarding, flowStatus } = selected;
  return {
    businessId: text(business, "id"),
    businessName: text(business, "name"),
    categoryCode: text(business, "category_code"),
    flowStatus,
    activationStatus: text(onboarding, "activation_status"),
    channelStatus: text(onboarding, "channel_status"),
    nextPath: onboardingPathForStatus(flowStatus, true),
    draft: draftFor(business, onboarding),
  };
}

export async function resolveUserRoute(userId: string) {
  const resume = await getOnboardingResume(userId);
  return { resume, path: resume?.nextPath ?? "/onboarding/business" as const };
}
