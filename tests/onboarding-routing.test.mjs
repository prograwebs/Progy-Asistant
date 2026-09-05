import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function importTypeScript(file) {
  const source = readFileSync(path.join(root, file), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

test("resolves every durable onboarding state to the correct destination", async () => {
  const { onboardingPathForStatus } = await importTypeScript("lib/shared/onboarding/paths.ts");
  assert.equal(onboardingPathForStatus("business_created", true), "/onboarding/demo");
  assert.equal(onboardingPathForStatus("demo_completed", true), "/onboarding/connect");
  assert.equal(onboardingPathForStatus("channel_skipped", true), "/panel");
  assert.equal(onboardingPathForStatus("channel_connected", true), "/panel");
  assert.equal(onboardingPathForStatus("onboarding_completed", true), "/panel");
  assert.equal(onboardingPathForStatus("", false), "/onboarding/business");
});
