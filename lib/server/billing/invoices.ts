import { SupabaseDataError, supabaseDataRequest, type DataRequest } from "@/lib/server/data/supabase";
import { supabaseAdminRequest } from "@/lib/server/data/supabase-admin";
import type { BillingPlan } from "./plans";

export type BillingInvoice = {
  id: string;
  business_id: string;
  plan_code: string;
  period_starts_at: string;
  period_ends_at: string;
  base_amount_usd: number;
  usage_cost_usd: number;
  included_budget_usd: number;
  overage_amount_usd: number;
  total_amount_usd: number;
  status: "pending" | "paid" | "void";
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  marked_paid_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  business?: {
    id: string;
    name: string;
    legal_name: string | null;
    billing_email: string | null;
    email: string | null;
  };
};

type InvoiceRow = Record<string, unknown>;

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value;
}

function asInvoice(row: InvoiceRow): BillingInvoice {
  return {
    id: String(row.id || ""),
    business_id: String(row.business_id || ""),
    plan_code: String(row.plan_code || ""),
    period_starts_at: String(row.period_starts_at || ""),
    period_ends_at: String(row.period_ends_at || ""),
    base_amount_usd: Number(row.base_amount_usd || 0),
    usage_cost_usd: Number(row.usage_cost_usd || 0),
    included_budget_usd: Number(row.included_budget_usd || 0),
    overage_amount_usd: Number(row.overage_amount_usd || 0),
    total_amount_usd: Number(row.total_amount_usd || 0),
    status: (String(row.status || "pending") as BillingInvoice["status"]),
    payment_method: row.payment_method ? String(row.payment_method) : null,
    payment_reference: row.payment_reference ? String(row.payment_reference) : null,
    paid_at: row.paid_at ? String(row.paid_at) : null,
    marked_paid_by: row.marked_paid_by ? String(row.marked_paid_by) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function asError(message: string, status = 400) {
  return new SupabaseDataError(message, status);
}

export async function assertAdmin(request: DataRequest = supabaseDataRequest) {
  const result = await request<boolean | boolean[]>("rpc/is_admin", {
    method: "POST",
    body: JSON.stringify({}),
    prefer: "return=representation",
  });
  const isAdmin = Array.isArray(result) ? result[0] === true : result === true;
  if (!isAdmin) throw asError("No tienes permisos para administrar cobros.", 403);
}

export async function listPendingInvoices(
  request: DataRequest = supabaseDataRequest,
) {
  const rows = await request<InvoiceRow[]>(
    "invoices?status=eq.pending&select=*&order=created_at.asc",
  );
  if (!rows.length) return [];

  const businessIds = [...new Set(rows.map((row) => String(row.business_id || "")).filter(Boolean))];
  const businesses = await request<InvoiceRow[]>(
    `businesses?id=in.(${businessIds.join(",")})&select=id,name,legal_name,billing_email,email`,
  );
  const businessById = new Map(businesses.map((business) => [String(business.id), business]));

  return rows.map((row) => {
    const invoice = asInvoice(row);
    const business = businessById.get(invoice.business_id);
    return business ? {
      ...invoice,
      business: {
        id: String(business.id),
        name: String(business.name || "Negocio"),
        legal_name: business.legal_name ? String(business.legal_name) : null,
        billing_email: business.billing_email ? String(business.billing_email) : null,
        email: business.email ? String(business.email) : null,
      },
    } : invoice;
  });
}

export async function createSubscriptionInvoice(
  businessId: string,
  planCode: string,
  request: DataRequest = supabaseDataRequest,
) {
  const result = await request<InvoiceRow | InvoiceRow[] | null>("rpc/create_subscription_invoice", {
    method: "POST",
    body: JSON.stringify({ p_business_id: businessId, p_plan_code: planCode }),
    prefer: "return=representation",
  });
  const invoice = first(result);
  if (!invoice) throw asError("No pudimos crear la factura de suscripción.", 500);
  return asInvoice(invoice);
}

export async function closeBillingPeriodAndInvoice(
  businessId: string,
  request: DataRequest = supabaseDataRequest,
) {
  const result = await request<InvoiceRow | InvoiceRow[] | null>("rpc/close_billing_period_and_create_invoice", {
    method: "POST",
    body: JSON.stringify({ p_business_id: businessId }),
    prefer: "return=representation",
  });
  const invoice = first(result);
  return invoice ? asInvoice(invoice) : null;
}

export async function markInvoicePaid(
  invoiceId: string,
  adminUserId: string,
  method = "bank_transfer",
  reference = "",
  request: DataRequest = supabaseDataRequest,
) {
  const cleanMethod = method.trim().slice(0, 40) || "bank_transfer";
  const cleanReference = reference.trim().slice(0, 160);
  if (!invoiceId || !adminUserId) throw asError("La factura o el administrador no son válidos.");
  const result = await request<InvoiceRow | InvoiceRow[] | null>("rpc/mark_invoice_paid", {
    method: "POST",
    body: JSON.stringify({
      p_invoice_id: invoiceId,
      p_admin_user_id: adminUserId,
      p_payment_method: cleanMethod,
      p_payment_reference: cleanReference || null,
    }),
    prefer: "return=representation",
  });
  const invoice = first(result);
  if (!invoice) throw asError("No pudimos registrar el pago.", 500);
  return asInvoice(invoice);
}

export async function enforceGracePeriod(
  graceDays = 5,
  request: DataRequest = supabaseAdminRequest,
) {
  const result = await request<number>("rpc/enforce_billing_grace_period", {
    method: "POST",
    body: JSON.stringify({ p_grace_days: graceDays }),
    prefer: "return=representation",
  });
  return Number(result || 0);
}

export async function runBillingCycle(request: DataRequest = supabaseAdminRequest) {
  const now = encodeURIComponent(new Date().toISOString());
  const duePlans = await request<Array<{ business_id: string }>>(
    `business_plans?status=eq.active&current_period_ends_at=lte.${now}&select=business_id`,
  );
  const closed: BillingInvoice[] = [];
  const errors: string[] = [];

  for (const plan of duePlans) {
    try {
      const invoice = await closeBillingPeriodAndInvoice(plan.business_id, request);
      if (invoice) closed.push(invoice);
    } catch (error) {
      errors.push(plan.business_id);
      console.error("Progy billing cycle close failed", {
        businessId: plan.business_id,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  const pastDue = await enforceGracePeriod(5, request);
  return { closed, pastDue, errors };
}

export type { BillingPlan };
