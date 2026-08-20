import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("onboarding demo uses the live assistant flow instead of static conversation data", () => {
  const component = read("components/onboarding/ConversationPreview.tsx");
  const step = read("components/onboarding/steps/DemoStep.tsx");

  assert.match(component, /MediaRecorder/);
  assert.match(component, /getUserMedia/);
  assert.match(component, /\/api\/assistant\/session/);
  assert.match(component, /\/api\/assistant\/turn/);
  assert.match(component, /demoMode: true/);
  assert.match(component, /includeAudio: true/);
  assert.match(component, /Escuchar respuesta/);
  assert.match(component, /suggestionChip/);
  assert.doesNotMatch(component, /scenario\.reply/);
  assert.match(step, /businessId=\{draft\.businessId\}/);
  assert.match(step, /suggestions=\{scenarios\.map/);
});

test("onboarding assistant demo validates voice overrides and never executes actions", () => {
  const turnRoute = read("app/api/assistant/turn/route.ts");
  const sessionRoute = read("app/api/assistant/session/route.ts");
  const voiceService = read("lib/voice/elevenlabs.ts");

  assert.match(turnRoute, /demoMode = body\.demoMode === true/);
  assert.match(turnRoute, /resolveOnboardingVoiceId\(requestedVoiceId\)/);
  assert.match(turnRoute, /demoMode\s*\?\s*simulatedAction/);
  assert.doesNotMatch(turnRoute, /En esta demo el pedido solo se simula/);
  assert.doesNotMatch(turnRoute, /En esta demo la reserva solo se simula/);
  assert.match(turnRoute, /await executeAssistantDecision\(context, generated\.decision\)/);
  assert.match(sessionRoute, /body\.demoMode === true/);
  assert.match(sessionRoute, /source: demoMode \? "progy_onboarding_demo"/);
  assert.match(voiceService, /!voice \|\| isLibraryVoice\(voice\)/);
});

test("Responses API history uses output_text for previous assistant turns", () => {
  const openai = read("lib/ai/openai.ts");
  assert.match(openai, /entry\.role === "assistant" \? "output_text" : "input_text"/);
  assert.match(openai, /content: \[\{ type: "input_text", text: options\.userText/);
  assert.match(openai, /max_output_tokens: 900/);
  assert.match(openai, /missingInformation debe contener solo nombres cortos/);
});

test("onboarding keeps the visible greeting out of assistant history", () => {
  const component = read("components/onboarding/ConversationPreview.tsx");
  const context = read("lib/assistant/context.ts");
  assert.match(component, /filter\(\(turn\) => turn\.id !== "welcome"\)/);
  assert.match(context, /La interfaz ya mostró el saludo inicial/);
  assert.match(context, /No menciones demostraciones, pruebas, límites internos/);
});
