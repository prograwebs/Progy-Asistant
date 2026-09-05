import { type DataRequest, supabaseDataRequest } from "@/lib/server/data/supabase";
import { recordUsageAndEnforce } from "@/lib/server/billing/quota";
import type { OpenAIUsage } from "../ai/openai";
import { estimatedElevenLabsCost, estimatedOpenAICost } from "./costs";

export type UsageKind =
  | "openai_input_tokens"
  | "openai_output_tokens"
  | "openai_audio_input_tokens"
  | "elevenlabs_characters"
  | "catalog_import";

async function insertUsage(
  businessId: string,
  kind: UsageKind,
  quantity: number,
  estimatedCostUsd: number,
  request: DataRequest,
  provider?: string,
) {
  if (!quantity || quantity < 0) return;
  await recordUsageAndEnforce({ businessId, kind, quantity, estimatedCostUsd, provider, request });
}

export async function recordOpenAIUsage(
  businessId: string,
  usage: OpenAIUsage,
  request: DataRequest = supabaseDataRequest,
) {
  const estimatedCost = estimatedOpenAICost(usage);
  await Promise.all([
    insertUsage(
      businessId,
      "openai_input_tokens",
      usage.inputTokens,
      estimatedCost,
      request,
      "openai",
    ),
    insertUsage(
      businessId,
      "openai_output_tokens",
      usage.outputTokens,
      0,
      request,
      "openai",
    ),
    insertUsage(
      businessId,
      "openai_audio_input_tokens",
      usage.audioInputTokens,
      0,
      request,
      "openai",
    ),
  ]);
}

export async function recordElevenLabsUsage(
  businessId: string,
  characters: number,
  request: DataRequest = supabaseDataRequest,
) {
  await insertUsage(
    businessId,
    "elevenlabs_characters",
    Math.max(0, Math.round(characters)),
    estimatedElevenLabsCost(characters),
    request,
    "elevenlabs",
  );
}

export async function recordCatalogImport(
  businessId: string,
  extractedItems: number,
  request: DataRequest = supabaseDataRequest,
) {
  await insertUsage(
    businessId,
    "catalog_import",
    Math.max(1, extractedItems),
    0,
    request,
    "openai",
  );
}
