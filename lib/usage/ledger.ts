import { supabaseDataRequest } from "../supabase-data";
import type { OpenAIUsage } from "../ai/openai";

export type UsageKind =
  | "openai_input_tokens"
  | "openai_output_tokens"
  | "openai_audio_input_tokens"
  | "elevenlabs_characters"
  | "catalog_import";

function envNumber(name: string) {
  const value = Number(process.env[name] || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function estimatedOpenAICost(usage: OpenAIUsage) {
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

async function insertUsage(businessId: string, kind: UsageKind, quantity: number, estimatedCostUsd: number) {
  if (!quantity || quantity < 0) return;
  try {
    await supabaseDataRequest("usage_ledger", {
      method: "POST",
      body: JSON.stringify({
        business_id: businessId,
        kind,
        quantity,
        estimated_cost_usd: Number(Math.max(0, estimatedCostUsd).toFixed(8)),
      }),
      prefer: "return=minimal",
    });
  } catch (error) {
    // Usage metering must never break a customer interaction. Keep the error
    // visible to developers while allowing the primary request to complete.
    console.error("Progy usage ledger write failed", { businessId, kind, error });
  }
}

export async function recordOpenAIUsage(businessId: string, usage: OpenAIUsage) {
  const estimatedCost = estimatedOpenAICost(usage);
  await Promise.all([
    insertUsage(businessId, "openai_input_tokens", usage.inputTokens, estimatedCost),
    insertUsage(businessId, "openai_output_tokens", usage.outputTokens, 0),
    insertUsage(businessId, "openai_audio_input_tokens", usage.audioInputTokens, 0),
  ]);
}

export async function recordElevenLabsUsage(businessId: string, characters: number) {
  const rate = envNumber("ELEVENLABS_USD_PER_1000_CHARS");
  await insertUsage(
    businessId,
    "elevenlabs_characters",
    Math.max(0, Math.round(characters)),
    (Math.max(0, characters) / 1000) * rate,
  );
}

export async function recordCatalogImport(businessId: string, extractedItems: number) {
  await insertUsage(businessId, "catalog_import", Math.max(1, extractedItems), 0);
}
