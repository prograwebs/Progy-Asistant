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
  assert.match(component, /UserRound/);
  assert.match(component, /MAX_DEMO_QUESTIONS/);
  assert.match(component, /normalizeDemoQuestion/);
  assert.match(component, /freeQuestionUsed/);
  assert.match(component, /usedSuggestionIds/);
  assert.match(component, /createPortal/);
  assert.match(component, /suggestionsTargetId/);
  assert.doesNotMatch(component, /Continúa la conversación|Prueba a Progy en vivo|waveform/);
  assert.doesNotMatch(component, /Prueba preguntando:/);
  assert.doesNotMatch(component, /conversationHint/);
  assert.doesNotMatch(component, /scenario\.reply/);
  assert.doesNotMatch(step, /ScenarioButton/);
  assert.doesNotMatch(step, /Prueba una situación/);
  assert.match(step, /2\. Prueba la demo/);
  assert.match(step, /businessId=\{draft\.businessId\}/);
  assert.match(step, /suggestions=\{scenarios\.map/);
});

test("onboarding demo normalizes voice labels and enforces server-side question limits", () => {
  const voiceCard = read("components/onboarding/VoiceCard.tsx");
  const styles = read("components/onboarding/Onboarding.module.css");
  const limits = read("lib/shared/assistant/demo-limits.ts");
  const turnRoute = read("app/api/(private)/assistant/turn/route.ts");

  assert.match(voiceCard, /split\(\/\\s\+\(\?:-\|–\|—\|\\\|\)/);
  assert.match(styles, /grid-template-columns: 39px minmax\(0, 1fr\) 20px/);
  assert.match(styles, /\.voiceCheck \{ position: static/);
  assert.match(styles, /\.leftSuggestionArea/);
  assert.match(styles, /min-height: 250px; max-height: 320px/);
  assert.match(limits, /MAX_DEMO_QUESTIONS = 3/);
  assert.match(limits, /normalizeDemoQuestion/);
  assert.match(turnRoute, /demo_question_limit_reached/);
  assert.match(turnRoute, /demo_duplicate_question/);
  assert.match(turnRoute, /demoConversationState/);
});

test("assistant context tolerates a stale schema cache for demo markers", () => {
  const data = read("lib/server/data/supabase.ts");

  assert.match(data, /contextRowsWithDemoMarker/);
  assert.match(data, /optionalContextRows/);
  assert.match(data, /error\.status !== 400/);
  assert.match(data, /hasDemoMarker/);
  assert.match(data, /activeBusiness && !catalogResult\.hasDemoMarker \? \[\] : catalogResult\.rows/);
  assert.match(data, /activeBusiness && !knowledgeResult\.hasDemoMarker \? \[\] : knowledgeResult\.rows/);
});

test("assistant data errors expose only a development operation hint", () => {
  const data = read("lib/server/data/supabase.ts");
  const turnRoute = read("app/api/(private)/assistant/turn/route.ts");

  assert.match(data, /operation\?: string/);
  assert.match(data, /dataOperation\(path\)/);
  assert.match(turnRoute, /process\.env\.NODE_ENV !== "production"/);
  assert.match(turnRoute, /operation: error\.operation/);
});

test("onboarding assistant demo validates voice overrides and never executes actions", () => {
  const turnRoute = read("app/api/(private)/assistant/turn/route.ts");
  const sessionRoute = read("app/api/(private)/assistant/session/route.ts");
  const voiceService = read("lib/server/voice/elevenlabs.ts");

  assert.match(turnRoute, /demoMode = body\.demoMode === true/);
  assert.match(turnRoute, /resolveOnboardingVoiceId\(requestedVoiceId\)/);
  assert.match(turnRoute, /demoMode\s*\?\s*simulatedAction/);
  assert.doesNotMatch(turnRoute, /En esta demo el pedido solo se simula/);
  assert.doesNotMatch(turnRoute, /En esta demo la reserva solo se simula/);
  assert.match(turnRoute, /onToolCalls/);
  assert.match(turnRoute, /executeTool/);
  assert.match(sessionRoute, /body\.demoMode === true/);
  assert.match(sessionRoute, /source: demoMode \? "progy_onboarding_demo"/);
  assert.match(voiceService, /!voice \|\| isLibraryVoice\(voice\)/);
});

test("Responses API history uses output_text for previous assistant turns", () => {
  const openai = read("lib/server/ai/openai.ts");
  assert.match(openai, /entry\.role === "assistant" \? "output_text" : "input_text"/);
  assert.match(openai, /content: \[\{ type: "input_text", text: options\.userText/);
  assert.match(openai, /max_output_tokens: 900/);
  assert.match(openai, /missingInformation debe contener solo nombres cortos/);
});

test("onboarding keeps the visible greeting out of assistant history", () => {
  const component = read("components/onboarding/ConversationPreview.tsx");
  const context = read("lib/server/assistant/context.ts");
  assert.match(component, /filter\(\(turn\) => turn\.id !== "welcome"\)/);
  assert.match(context, /La interfaz ya mostró el saludo inicial/);
  assert.match(context, /No menciones demostraciones, pruebas, límites internos/);
});
