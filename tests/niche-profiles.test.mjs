import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("niche profiles are additive and reference only current business categories", () => {
  const migration = read("supabase/migrations/20260830010000_niche_profiles.sql");
  assert.match(migration, /create table public\.niche_profiles/);
  assert.match(migration, /references public\.business_categories\(code\)/);
  for (const code of ["beauty_salon", "clinic", "restaurant"]) assert.match(migration, new RegExp(`'${code}'`));
  assert.doesNotMatch(migration, /insert into public\.business_categories/);
  assert.match(migration, /'human_handoff'/);
  assert.match(migration, /'transfer_to_human'/);
});

test("niche terminology reaches both agent instructions and Results UI", () => {
  const profile = read("lib/server/niche/profile.ts");
  const context = read("lib/server/assistant/context.ts");
  const workspace = read("app/api/(private)/workspace/route.ts");
  const labels = read("hooks/niche/useNicheLabels.ts");
  const records = read("components/dashboard/sections/RecordsSections.tsx");

  assert.match(profile, /GENERIC_TERMINOLOGY/);
  assert.match(profile, /niche_profiles\?category_code=eq/);
  assert.match(context, /niche\.prompt_addendum/);
  assert.match(context, /orderPlural/);
  assert.match(context, /bookingPlural/);
  assert.match(workspace, /getNicheProfile/);
  assert.match(workspace, /nicheProfile/);
  assert.match(labels, /useNicheLabels/);
  assert.match(records, /labels\.orderPlural/);
  assert.match(records, /labels\.bookingPlural/);
});

test("onboarding applies niche feature and tool defaults", () => {
  const onboarding = read("lib/server/onboarding/service.ts");
  const legacyCreatePath = read("app/api/(private)/workspace/route.ts");
  assert.match(onboarding, /ensureNicheDefaults/);
  assert.match(onboarding, /default_feature_codes/);
  assert.match(onboarding, /default_tool_codes/);
  assert.match(onboarding, /business_tool_settings\?on_conflict=business_id,tool_code/);
  assert.match(legacyCreatePath, /ensureNicheDefaults\(businessId, categoryCode\)/);
});
