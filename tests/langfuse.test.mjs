import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("the Langfuse prompt contract has exactly the 13 approved variables", () => {
  const context = read("lib/server/assistant/context.ts");
  const expected = [
    "agentName", "businessName", "tone", "nicheAddendum", "greetingLine",
    "scheduleLine", "catalogBlock", "knowledgeBlock", "fallbackPolicy",
    "orderPlural", "bookingPlural", "resourceLabel", "demoRulesBlock",
  ];
  const block = context.match(/export type AgentPromptVariables = \{([\s\S]*?)\n\};/)?.[1] || "";
  assert.deepEqual(
    [...block.matchAll(/^\s+([A-Za-z]+): string;/gm)].map((match) => match[1]),
    expected,
  );
  assert.match(context, /nicheAddendum: text\(niche\.prompt_addendum\)/);
  assert.match(context, /demoRulesBlock: demoRules/);
  assert.match(context, /booking_singular: bookingSingular/);
  assert.match(context, /order_singular: orderSingular/);
});

test("Langfuse is optional and both assistant channels use one post-quota trace", () => {
  const observability = read("lib/server/observability/langfuse.ts");
  const config = read("lib/server/config/env.ts");
  const openai = read("lib/server/ai/openai.ts");
  const web = read("app/api/assistant/turn/route.ts");
  const whatsapp = read("lib/server/whatsapp/inbound.ts");

  for (const variable of ["LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY", "LANGFUSE_HOST"]) {
    assert.match(config, new RegExp(variable));
  }
  assert.match(observability, /progy-agent-system/);
  assert.match(observability, /label: PROMPT_LABEL/);
  assert.match(observability, /buildCompactAgentInstructions/);
  assert.match(observability, /fetchTimeoutMs: 1_500/);
  assert.match(openai, /getCompiledSystemPrompt/);
  assert.match(openai, /logGeneration/);
  assert.match(openai, /logToolExecution/);
  assert.match(web, /startTurnTrace/);
  assert.match(whatsapp, /startTurnTrace/);
  assert.ok(web.indexOf("checkQuota") < web.indexOf("startTurnTrace"));
  assert.ok(whatsapp.indexOf("checkQuota") < whatsapp.indexOf("startTurnTrace"));
});

test("OpenAI turn keeps the three-iteration tool loop and shared cost estimator", () => {
  const openai = read("lib/server/ai/openai.ts");
  const costs = read("lib/server/usage/costs.ts");
  const ledger = read("lib/server/usage/ledger.ts");
  assert.match(openai, /const maxToolIterations = 3/);
  assert.match(openai, /openai-assistant-iteration-\$\{iteration \+ 1\}/);
  assert.match(openai, /logToolExecution\(options\.trace/);
  assert.match(costs, /export function estimatedOpenAICost/);
  assert.match(ledger, /import \{ estimatedElevenLabsCost, estimatedOpenAICost \}/);
});
