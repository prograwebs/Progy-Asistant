import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("trial budget migration adds USD fields and an atomic usage function", () => {
  const migration = read("supabase/migrations/20260830020000_trial_budget_quota.sql");
  assert.match(migration, /add column if not exists included_budget_usd numeric\(10,2\).*default 0\.25/);
  assert.match(migration, /add column if not exists used_budget_usd numeric\(10,2\)/);
  assert.match(migration, /budget_period_starts_at timestamptz/);
  assert.match(migration, /create or replace function public\.record_usage_and_update_budget/);
  assert.match(migration, /insert into public\.usage_ledger/);
  assert.match(migration, /set used_budget_usd = used_budget_usd \+ round/);
  assert.match(migration, /plan_status = 'trial'/);
  assert.match(migration, /set status = 'suspended'/);
});

test("quota settings are configurable and usage goes through the atomic path", () => {
  const limits = read("lib/shared/config/limits.ts");
  const trialLimits = read("lib/server/billing/trial-limits.ts");
  const quota = read("lib/server/billing/quota.ts");
  const ledger = read("lib/server/usage/ledger.ts");
  assert.match(limits, /MAX_PAYLOAD_MB/);
  assert.match(trialLimits, /TRIAL_DEFAULT_BUDGET_USD = 0\.25/);
  assert.match(trialLimits, /TRIAL_DEFAULT_DURATION_DAYS = 14/);
  assert.match(quota, /status === "active"\) return \{ allowed: true \}/);
  assert.match(quota, /trial_expired/);
  assert.match(quota, /budget_exhausted/);
  assert.match(quota, /record_usage_and_update_budget/);
  assert.match(ledger, /recordUsageAndEnforce/);
});

test("assistant entry points check quota before provider calls", () => {
  const turn = read("app/api/assistant/turn/route.ts");
  const inbound = read("lib/server/whatsapp/inbound.ts");
  assert.ok(turn.indexOf("checkQuota") < turn.indexOf("transcribeAudio(audio"));
  assert.ok(turn.indexOf("checkQuota") < turn.indexOf("generateAssistantDecision({"));
  assert.ok(inbound.indexOf("checkQuota") < inbound.indexOf("generateAssistantDecision({"));
  assert.match(inbound, /quota_notice_sent_at/);
  assert.match(inbound, /24 \* 60 \* 60 \* 1000/);
});
