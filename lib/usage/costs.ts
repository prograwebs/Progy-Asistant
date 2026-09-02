import type { OpenAIUsage } from "../ai/openai";

function envNumber(name: string) {
  const value = Number(process.env[name] || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Uses the same configurable rates as usage_ledger for observability parity. */
export function estimatedOpenAICost(usage: OpenAIUsage) {
  const inputRate = envNumber("OPENAI_INPUT_USD_PER_MILLION");
  const cachedRate = envNumber("OPENAI_CACHED_INPUT_USD_PER_MILLION");
  const outputRate = envNumber("OPENAI_OUTPUT_USD_PER_MILLION");
  const audioInputRate = envNumber("OPENAI_AUDIO_INPUT_USD_PER_MILLION");
  const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);

  return (
    (uncachedInput / 1_000_000) * inputRate +
    (usage.cachedInputTokens / 1_000_000) * cachedRate +
    (usage.outputTokens / 1_000_000) * outputRate +
    (usage.audioInputTokens / 1_000_000) * audioInputRate
  );
}

export function estimatedElevenLabsCost(characters: number) {
  return (Math.max(0, characters) / 1000) * envNumber("ELEVENLABS_USD_PER_1000_CHARS");
}
