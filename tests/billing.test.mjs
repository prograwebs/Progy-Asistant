import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("billing migration creates the internal invoice model and compatibility plans", () => {
  const migration = read("supabase/migrations/20260902010000_billing_invoices.sql");
  assert.match(migration, /add column if not exists tax_id text/);
  assert.match(migration, /add column if not exists billing_email text/);
  assert.match(migration, /create table public\.plans/);
  assert.match(migration, /create table public\.invoices/);
  assert.match(migration, /constraint invoices_period_unique unique \(business_id, period_starts_at, period_ends_at\)/);
  assert.match(migration, /invoices_admin_read/);
  assert.match(migration, /invoices_admin_update/);
  for (const code of ["starter", "business", "pro"]) {
    assert.match(migration, new RegExp(`\\('${code}',`));
  }
  assert.match(migration, /19\.99, 5\.00, 1\.50, 30/);
});

test("billing calculations and transactional cycle functions are server-side", () => {
  const migration = read("supabase/migrations/20260902010000_billing_invoices.sql");
  const invoices = read("lib/server/billing/invoices.ts");
  assert.match(migration, /create or replace function public\.create_subscription_invoice/);
  assert.match(migration, /create or replace function public\.close_billing_period_and_create_invoice/);
  assert.match(migration, /create or replace function public\.mark_invoice_paid/);
  assert.match(migration, /create or replace function public\.enforce_billing_grace_period/);
  assert.match(migration, /greatest\(0, usage_cost - selected_plan\.included_budget_usd\) \* selected_plan\.overage_multiplier/);
  assert.match(migration, /on conflict \(business_id, period_starts_at, period_ends_at\) do nothing/);
  assert.match(migration, /status = 'past_due'/);
  assert.match(invoices, /supabaseAdminRequest/);
  assert.match(invoices, /runBillingCycle/);
});

test("billing routes protect administrative operations and the cron secret", () => {
  const adminRoute = read("app/api/(private)/billing/invoices/route.ts");
  const cronRoute = read("app/api/(private)/billing/run-cycle/route.ts");
  const env = read("lib/server/config/env.ts");
  assert.match(adminRoute, /requireApiUser/);
  assert.match(adminRoute, /assertAdmin/);
  assert.match(adminRoute, /markInvoicePaid/);
  assert.match(cronRoute, /billingCronSecret/);
  assert.match(cronRoute, /timingSafeEqual/);
  assert.match(cronRoute, /runBillingCycle/);
  assert.match(env, /billingCronSecret: clean\(process\.env\.BILLING_CRON_SECRET\)/);
});

test("starter preserves business functional entitlements", () => {
  const entitlements = read("lib/server/billing/entitlements.ts");
  assert.match(entitlements, /starter: \{/);
  assert.match(entitlements, /if \(normalized === "starter"\) return "starter"/);
  assert.match(entitlements, /maxCatalogItems: 500/);
  assert.match(entitlements, /maxVoiceTestSessions: 25/);
});
