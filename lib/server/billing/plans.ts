import { supabaseDataRequest, type DataRequest } from "@/lib/server/data/supabase";

export type BillingPlan = {
  code: string;
  name: string;
  base_price_usd: number;
  included_budget_usd: number;
  overage_multiplier: number;
  billing_period_days: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

function asPlan(row: Record<string, unknown>): BillingPlan {
  return {
    code: String(row.code || ""),
    name: String(row.name || row.code || "Plan"),
    base_price_usd: Number(row.base_price_usd || 0),
    included_budget_usd: Number(row.included_budget_usd || 0),
    overage_multiplier: Number(row.overage_multiplier || 0),
    billing_period_days: Number(row.billing_period_days || 0),
    is_active: Boolean(row.is_active),
    ...(row.created_at ? { created_at: String(row.created_at) } : {}),
    ...(row.updated_at ? { updated_at: String(row.updated_at) } : {}),
  };
}

export async function getPlan(
  code: string,
  request: DataRequest = supabaseDataRequest,
) {
  const rows = await request<Record<string, unknown>[]>(
    `plans?code=eq.${encodeURIComponent(code)}&is_active=eq.true&select=*&limit=1`,
  );
  if (!rows[0]) throw new Error("El plan solicitado no está disponible.");
  return asPlan(rows[0]);
}

export async function listActivePlans(
  request: DataRequest = supabaseDataRequest,
) {
  const rows = await request<Record<string, unknown>[]>(
    "plans?is_active=eq.true&select=*&order=base_price_usd.asc,code.asc",
  );
  return rows.map(asPlan);
}
