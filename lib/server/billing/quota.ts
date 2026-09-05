import { SupabaseDataError, supabaseDataRequest, type DataRequest } from "@/lib/server/data/supabase";
import type { UsageKind } from "@/lib/server/usage/ledger";
import { TRIAL_DEFAULT_BUDGET_USD, TRIAL_DEFAULT_DURATION_DAYS } from "@/lib/server/billing/trial-limits";

export type QuotaCheck =
  | { allowed: true }
  | { allowed: false; reason: "trial_expired" | "budget_exhausted" | "suspended" | "cancelled" | "past_due" };

type PlanRow = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function planPath(businessId: string) {
  return `business_plans?business_id=eq.${encodeURIComponent(businessId)}`;
}

async function suspendTrial(businessId: string, request: DataRequest) {
  await request(`${planPath(businessId)}&status=eq.trial`, {
    method: "PATCH",
    body: JSON.stringify({ status: "suspended" }),
    prefer: "return=minimal",
  });
}

export async function checkQuota(businessId: string, request: DataRequest = supabaseDataRequest): Promise<QuotaCheck> {
  const rows = await request<PlanRow[]>(`${planPath(businessId)}&select=status,included_budget_usd,used_budget_usd,trial_ends_at&limit=1`);
  const plan = rows[0];
  if (!plan) {
    console.error("Progy quota check found no business plan", { businessId });
    return { allowed: false, reason: "suspended" };
  }

  const status = text(plan.status);
  if (status === "suspended" || status === "cancelled" || status === "past_due") {
    return { allowed: false, reason: status };
  }
  if (status === "active") return { allowed: true };
  if (status !== "trial") return { allowed: false, reason: "suspended" };

  const trialEndsAt = Date.parse(text(plan.trial_ends_at));
  if (!Number.isFinite(trialEndsAt) || trialEndsAt <= Date.now()) {
    await suspendTrial(businessId, request);
    return { allowed: false, reason: "trial_expired" };
  }
  if (number(plan.used_budget_usd) >= number(plan.included_budget_usd)) {
    await suspendTrial(businessId, request);
    return { allowed: false, reason: "budget_exhausted" };
  }
  return { allowed: true };
}

export async function initializeTrialPlan(businessId: string, request: DataRequest = supabaseDataRequest) {
  const trialStartsAt = new Date();
  const trialEndsAt = new Date(trialStartsAt.getTime() + TRIAL_DEFAULT_DURATION_DAYS * 24 * 60 * 60 * 1000);
  await request(`${planPath(businessId)}&status=eq.trial`, {
    method: "PATCH",
    body: JSON.stringify({
      included_budget_usd: TRIAL_DEFAULT_BUDGET_USD,
      used_budget_usd: 0,
      budget_period_starts_at: trialStartsAt.toISOString(),
      trial_starts_at: trialStartsAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    }),
    prefer: "return=minimal",
  });
}

export async function recordUsageAndEnforce(params: {
  businessId: string;
  kind: UsageKind;
  quantity: number;
  estimatedCostUsd: number;
  conversationId?: string;
  provider?: string;
  request: DataRequest;
}): Promise<void> {
  const quantity = Math.max(0, Math.round(Number(params.quantity) || 0));
  const estimatedCostUsd = Math.max(0, Number(Number(params.estimatedCostUsd || 0).toFixed(8)));
  if (!quantity && !estimatedCostUsd) return;

  try {
    await params.request("rpc/record_usage_and_update_budget", {
      method: "POST",
      body: JSON.stringify({
        p_business_id: params.businessId,
        p_kind: params.kind,
        p_quantity: quantity,
        p_estimated_cost_usd: estimatedCostUsd,
        p_conversation_id: params.conversationId || null,
        p_provider: params.provider || null,
      }),
      prefer: "return=representation",
    });
  } catch (error) {
    // Metering should not turn a completed provider response into a customer
    // error. The server log keeps the failure visible for operations.
    console.error("Progy atomic usage write failed", {
      businessId: params.businessId,
      kind: params.kind,
      error: error instanceof SupabaseDataError ? error.message : error,
    });
  }
}
