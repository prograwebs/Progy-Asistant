import { LangfuseClient } from "@langfuse/client";
import {
  startObservation,
  type LangfuseObservation,
  type LangfuseSpan,
  type LangfuseGenerationAttributes,
} from "@langfuse/tracing";
import { serverConfig } from "@/lib/config/env";
import {
  buildCompactAgentInstructions,
  buildPromptVariables,
  type AgentContext,
} from "@/lib/assistant/context";
import { GENERIC_NICHE_PROFILE, type NicheProfile } from "@/lib/niche/profile";
import type { OpenAIUsage } from "@/lib/ai/openai";
import { estimatedOpenAICost } from "@/lib/usage/costs";

const PROMPT_NAME = "progy-agent-system";
const PROMPT_LABEL = "production";
const MAX_TRACE_VALUE = 8_000;

let client: LangfuseClient | null | undefined;

export type TurnTrace = {
  enabled: boolean;
  root?: LangfuseSpan;
};

export type CompiledSystemPrompt = {
  text: string;
  source: "langfuse" | "local";
  promptVersion?: number;
};

type TraceInput = {
  businessId: string;
  conversationId?: string | null;
  channel: "web" | "whatsapp";
  categoryCode?: string | null;
  userText: string;
  tags?: string[];
};

function getLangfuseClient() {
  if (client !== undefined) return client;
  const config = serverConfig();
  if (!config.langfusePublicKey || !config.langfuseSecretKey || !config.langfuseHost) {
    client = null;
    return client;
  }

  try {
    client = new LangfuseClient({
      publicKey: config.langfusePublicKey,
      secretKey: config.langfuseSecretKey,
      baseUrl: config.langfuseHost,
      timeout: 2,
    });
  } catch (error) {
    client = null;
    console.warn("Progy Langfuse client initialization failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
  return client;
}

function clipped(value: unknown, limit = MAX_TRACE_VALUE): unknown {
  if (typeof value === "string") return value.slice(0, limit);
  try {
    const json = JSON.stringify(value);
    return json.length > limit ? `${json.slice(0, limit)}…` : value;
  } catch {
    return "[unserializable]";
  }
}

function warn(operation: string, error: unknown) {
  console.warn(`Progy Langfuse ${operation} failed`, {
    error: error instanceof Error ? error.message : "unknown_error",
  });
}

export async function getCompiledSystemPrompt(
  context: AgentContext,
  userText: string,
  demoMode = false,
  niche: NicheProfile = GENERIC_NICHE_PROFILE,
): Promise<CompiledSystemPrompt> {
  const localPrompt = () => ({
    text: buildCompactAgentInstructions(context, userText, demoMode, niche),
    source: "local" as const,
  });
  const langfuse = getLangfuseClient();
  if (!langfuse) return localPrompt();

  try {
    const prompt = await langfuse.prompt.get(PROMPT_NAME, {
      label: PROMPT_LABEL,
      type: "text",
      fetchTimeoutMs: 1_500,
      maxRetries: 0,
    });
    const compiled = prompt.compile(buildPromptVariables(context, userText, demoMode, niche));
    if (!compiled.trim()) return localPrompt();
    return { text: compiled, source: "langfuse", promptVersion: prompt.version };
  } catch (error) {
    warn("prompt retrieval", error);
    return localPrompt();
  }
}

export function startTurnTrace(input: TraceInput): TurnTrace {
  const config = serverConfig();
  if (!config.langfusePublicKey || !config.langfuseSecretKey || !config.langfuseHost) {
    return { enabled: false };
  }

  try {
    const root = startObservation("progy-agent-turn", {
      input: { text: input.userText.slice(0, 2_000) },
      metadata: {
        businessId: input.businessId,
        conversationId: input.conversationId || null,
        channel: input.channel,
        categoryCode: input.categoryCode || null,
        tags: input.tags || [],
      },
    });
    root.update({
      metadata: {
        businessId: input.businessId,
        conversationId: input.conversationId || null,
        channel: input.channel,
        categoryCode: input.categoryCode || null,
        tags: input.tags || [],
      },
    });
    return { enabled: true, root };
  } catch (error) {
    warn("trace initialization", error);
    return { enabled: false };
  }
}

export async function logGeneration(
  trace: TurnTrace | undefined,
  input: {
    name: string;
    model: string;
    request: unknown;
    response: unknown;
    usage: OpenAIUsage;
    promptVersion?: number;
    promptSource?: "langfuse" | "local";
  },
) {
  if (!trace?.enabled || !trace.root) return;
  try {
    const cost = estimatedOpenAICost(input.usage);
    const attributes: LangfuseGenerationAttributes = {
      input: clipped(input.request),
      output: clipped(input.response),
      model: input.model,
      usageDetails: {
        input: input.usage.inputTokens,
        output: input.usage.outputTokens,
        total: input.usage.totalTokens,
        cachedInput: input.usage.cachedInputTokens,
        audioInput: input.usage.audioInputTokens,
      },
      costDetails: { totalCost: cost },
      ...(input.promptVersion ? {
        prompt: {
          name: PROMPT_NAME,
          version: input.promptVersion,
          isFallback: input.promptSource === "local",
        },
      } : {}),
    };
    const generation = trace.root.startObservation(input.name, attributes, { asType: "generation" });
    generation.end();
  } catch (error) {
    warn("generation logging", error);
  }
}

export async function logToolExecution(
  trace: TurnTrace | undefined,
  input: {
    toolCode: string;
    arguments: unknown;
    result: unknown;
    succeeded: boolean;
  },
) {
  if (!trace?.enabled || !trace.root) return;
  try {
    const tool = trace.root.startObservation(`tool:${input.toolCode}`, {
      input: { arguments: clipped(input.arguments) },
      output: { result: clipped(input.result), succeeded: input.succeeded },
    }, { asType: "tool" });
    tool.end();
  } catch (error) {
    warn("tool logging", error);
  }
}

export async function finishTurnTrace(
  trace: TurnTrace | undefined,
  output: unknown,
  error?: unknown,
) {
  if (!trace?.enabled || !trace.root) return;
  try {
    trace.root.update({
      output: clipped(error ? { ok: false, error: error instanceof Error ? error.message : "unknown_error" } : output),
      ...(error ? { level: "ERROR" as const } : {}),
    });
    trace.root.end();
  } catch (traceError) {
    warn("trace finalization", traceError);
  }
}

export async function flushLangfuse() {
  const langfuse = getLangfuseClient();
  if (!langfuse) return;
  try {
    await langfuse.flush();
  } catch (error) {
    warn("flush", error);
  }
}

export type { LangfuseObservation };
