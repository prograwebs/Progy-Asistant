import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("Tools Registry migration seeds exactly the first four tools and feature flags", () => {
  const migration = read("supabase/migrations/20260830000000_agent_tools_registry.sql");
  for (const code of ["create_order", "create_booking", "transfer_to_human", "send_email"]) {
    assert.match(migration, new RegExp(`'${code}'`));
  }
  assert.match(migration, /human_handoff/);
  assert.match(migration, /send_email_notifications/);
  assert.match(migration, /additionalProperties":false/);
  assert.match(migration, /create table public\.business_tool_settings/);
  assert.match(migration, /enable row level security/);
});

test("assistant uses tenant-filtered native function calling and audits tool calls", () => {
  const registry = read("lib/server/agent/tools/registry.ts");
  const openai = read("lib/server/ai/openai.ts");
  const inbound = read("lib/server/whatsapp/inbound.ts");
  const turn = read("app/api/assistant/turn/route.ts");
  const context = read("lib/server/data/supabase.ts");

  assert.match(registry, /getEnabledToolsForBusiness/);
  assert.match(registry, /businessToolSettings/);
  assert.match(registry, /agent_actions/);
  assert.match(registry, /action_name: toolCode/);
  assert.match(openai, /function_call/);
  assert.match(openai, /function_call_output/);
  assert.match(openai, /maxToolIterations = 3/);
  assert.match(openai, /tools\.length \? \{ tools \} : \{\}/);
  assert.match(inbound, /for \(const toolCall of toolCalls\)/);
  assert.match(turn, /for \(const toolCall of toolCalls\)/);
  assert.match(context, /agent_tools\?is_active=eq\.true/);
  assert.match(context, /business_tool_settings\?business_id=eq/);
});
