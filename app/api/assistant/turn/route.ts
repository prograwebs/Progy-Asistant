import { requireApiUser } from "@/lib/auth/supabase";
import { generateAssistantDecision, OpenAIServiceError, transcribeAudio } from "../../../../lib/ai/openai";
import { buildCompactAgentInstructions } from "../../../../lib/assistant/context";
import { getNicheProfile } from "../../../../lib/niche/profile";
import { executeAssistantDecision } from "../../../../lib/assistant/actions";
import { executeTool, getEnabledToolsForBusiness } from "../../../../lib/agent/tools/registry";
import { MAX_DEMO_QUESTIONS, normalizeDemoQuestion } from "../../../../lib/assistant/demo-limits";
import { developmentTestingMode, entitlementsFor, normalizePlanCode, voiceTrialAllowance } from "../../../../lib/billing/entitlements";
import { exceedsBase64SourceLimit, exceedsPayloadLimit, MAX_PAYLOAD_MB } from "../../../../lib/config/limits";
import { loadAgentContext, SupabaseDataError, supabaseDataRequest } from "@/lib/data/supabase";
import { recordElevenLabsUsage, recordOpenAIUsage } from "../../../../lib/usage/ledger";
import { resolveOnboardingVoiceId, synthesizeSpeech, VoiceServiceError } from "../../../../lib/voice/elevenlabs";

export const dynamic = "force-dynamic";

type UnknownRow = Record<string, unknown>;
type HistoryEntry = { role: "user" | "assistant"; text: string };
type AssistantAction = Awaited<ReturnType<typeof executeAssistantDecision>>;

type AudioWarning = {
  code: string;
  message: string;
};

class DemoTurnError extends Error {
  status: number;
  code: "demo_question_limit_reached" | "demo_duplicate_question";

  constructor(message: string, code: DemoTurnError["code"]) {
    super(message);
    this.name = "DemoTurnError";
    this.status = 409;
    this.code = code;
  }
}

function jsonError(error: unknown) {
  if (error instanceof DemoTurnError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
  if (error instanceof OpenAIServiceError || error instanceof VoiceServiceError || error instanceof SupabaseDataError) {
    const debug = error instanceof SupabaseDataError && process.env.NODE_ENV !== "production" && error.operation
      ? { operation: error.operation }
      : {};
    return Response.json(
      { error: error.message, code: error instanceof VoiceServiceError ? error.code : undefined, ...debug },
      { status: error.status, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
  console.error("Progy assistant turn error", error);
  return Response.json({ error: "No pudimos completar la conversación. Inténtalo nuevamente." }, { status: 500, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

function parseHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => entry as Record<string, unknown>)
    .filter((entry) => (entry.role === "user" || entry.role === "assistant") && typeof entry.text === "string")
    .map((entry) => ({ role: entry.role as "user" | "assistant", text: String(entry.text).slice(0, 1200) }))
    .slice(-8);
}

function audioBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function simulatedAction(intent: "none" | "answer" | "order" | "booking" | "handoff"): AssistantAction {
  if (intent === "order") {
    return { type: "order", executed: false };
  }
  if (intent === "booking") {
    return { type: "booking", executed: false };
  }
  return { type: "none", executed: false };
}

async function trialAllowance(businessId: string, conversationId?: string | null) {
  const id = encodeURIComponent(businessId);
  const [plans, conversations] = await Promise.all([
    supabaseDataRequest<UnknownRow[]>(`business_plans?business_id=eq.${id}&select=plan_code,status`),
    supabaseDataRequest<UnknownRow[]>(`conversations?business_id=eq.${id}&channel=eq.web_voice&is_trial=eq.true&select=id,status,duration_seconds&limit=100`),
  ]);

  const planCode = normalizePlanCode(String(plans[0]?.plan_code || "trial"));
  if (developmentTestingMode()) {
    const allowance = voiceTrialAllowance({ planCode, usedSessions: 0, usedSeconds: 0 });
    return { ...allowance, allowed: true, sessionsRemaining: 9999, secondsRemaining: Math.max(300, allowance.secondsRemaining) };
  }

  if (planCode !== "trial") {
    return voiceTrialAllowance({ planCode, usedSessions: 0, usedSeconds: 0 });
  }

  const previous = conversations.filter((row) => String(row.id || "") !== String(conversationId || ""));
  const usedSessions = previous.filter((row) => row.status === "completed" || row.status === "failed").length;
  const usedSeconds = previous.reduce((sum, row) => sum + Math.max(0, Number(row.duration_seconds || 0)), 0);
  return voiceTrialAllowance({ planCode, usedSessions, usedSeconds });
}

async function demoConversationState(businessId: string, conversationId: string) {
  const rows = await supabaseDataRequest<UnknownRow[]>(
    `conversations?id=${encodeURIComponent(conversationId)}&business_id=${encodeURIComponent(businessId)}&select=id,metadata`,
  );
  if (!rows[0]) return null;
  const metadata = rows[0]?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return { isDemo: false, userTexts: [] };
  const metadataObject = metadata as Record<string, unknown>;
  const turns = Array.isArray(metadataObject.turns) ? metadataObject.turns : [];
  const userTexts = turns
    .map((turn) => turn as Record<string, unknown>)
    .filter((turn) => turn.role === "user" && typeof turn.text === "string")
    .map((turn) => String(turn.text));
  return { isDemo: metadataObject.demo_mode === true, userTexts };
}

async function persistConversationTurn(options: {
  businessId: string;
  conversationId?: string | null;
  userText: string;
  reply: string;
  action: Awaited<ReturnType<typeof executeAssistantDecision>>;
  audioWarning?: AudioWarning | null;
}) {
  if (!options.conversationId) return;
  const businessId = encodeURIComponent(options.businessId);
  const conversationId = encodeURIComponent(options.conversationId);

  try {
    const rows = await supabaseDataRequest<UnknownRow[]>(
      `conversations?id=eq.${conversationId}&business_id=eq.${businessId}&select=id,metadata`,
    );
    if (!rows[0]) return;

    const existingMetadata = rows[0].metadata && typeof rows[0].metadata === "object" && !Array.isArray(rows[0].metadata)
      ? rows[0].metadata as Record<string, unknown>
      : {};
    const existingTurns = Array.isArray(existingMetadata.turns) ? existingMetadata.turns : [];
    const turns = [
      ...existingTurns,
      { role: "user", text: options.userText.slice(0, 1500), at: new Date().toISOString() },
      { role: "assistant", text: options.reply.slice(0, 1500), at: new Date().toISOString() },
    ].slice(-20);

    const metadata = {
      ...existingMetadata,
      turns,
      last_action: options.action.type === "none" ? existingMetadata.last_action : options.action,
      ...(options.audioWarning ? { last_voice_warning: { code: options.audioWarning.code, at: new Date().toISOString() } } : {}),
    };

    await supabaseDataRequest(`conversations?id=eq.${conversationId}&business_id=eq.${businessId}`, {
      method: "PATCH",
      body: JSON.stringify({
        summary: options.reply.slice(0, 500),
        metadata,
      }),
      prefer: "return=minimal",
    });
  } catch (error) {
    console.error("Progy conversation transcript write failed", error);
  }
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para probar a Progy." }, { status: 401 });

  try {
    const contentType = request.headers.get("content-type") || "";
    let businessId = "";
    let conversationId = "";
    let userText = "";
    let history: HistoryEntry[] = [];
    let wantsAudio = false;
    let demoMode = false;
    let requestedVoiceId = "";
    let transcriptionUsage = null as Awaited<ReturnType<typeof transcribeAudio>>["usage"] | null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      businessId = String(form.get("businessId") || "").trim();
      conversationId = String(form.get("conversationId") || "").trim();
      demoMode = String(form.get("demoMode") || "") === "1";
      requestedVoiceId = String(form.get("voiceId") || "").trim();
      wantsAudio = String(form.get("includeAudio") || "1") !== "0";
      const rawHistory = String(form.get("history") || "");
      if (rawHistory) {
        try { history = parseHistory(JSON.parse(rawHistory)); } catch { history = []; }
      }

      const audio = form.get("audio");
      if (!(audio instanceof File) || audio.size === 0) {
        throw new OpenAIServiceError("No recibimos audio para procesar.", 400);
      }
      if (exceedsPayloadLimit(audio.size)) {
        throw new OpenAIServiceError(`El audio supera el límite de ${MAX_PAYLOAD_MB} MB. Habla en turnos más cortos.`, 413);
      }

      const transcription = await transcribeAudio(audio, `progy-${user.id}`);
      userText = transcription.text;
      transcriptionUsage = transcription.usage;
    } else {
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (!body) throw new OpenAIServiceError("La solicitud no es válida.", 400);
      businessId = String(body.businessId || "").trim();
      conversationId = String(body.conversationId || "").trim();
      demoMode = body.demoMode === true;
      requestedVoiceId = String(body.voiceId || "").trim();
      userText = String(body.text || "").trim().slice(0, 2000);
      history = parseHistory(body.history);
      wantsAudio = body.includeAudio === true;
    }

    if (!businessId) throw new SupabaseDataError("Selecciona un negocio antes de probar a Progy.", 400);
    if (!userText) throw new OpenAIServiceError("No logramos identificar qué deseas preguntar.", 422);
    if (conversationId && !demoMode) {
      try {
        if ((await demoConversationState(businessId, conversationId))?.isDemo) demoMode = true;
      } catch (error) {
        // Conversation mode is a safety enhancement, not a reason to interrupt
        // an existing dashboard turn when a remote schema/RLS read is degraded.
        console.warn("Progy conversation demo-mode lookup failed", {
          businessId,
          conversationId,
          error: error instanceof SupabaseDataError ? error.message : "unknown_error",
        });
      }
    }

    if (demoMode) {
      if (!conversationId) throw new SupabaseDataError("La conversación demo no es válida.", 400);
      const state = await demoConversationState(businessId, conversationId);
      if (!state?.isDemo) throw new SupabaseDataError("La conversación demo no es válida.", 403);
      if (state.userTexts.length >= MAX_DEMO_QUESTIONS) {
        throw new DemoTurnError("Ya usaste las 3 preguntas de esta demo. Puedes volver a escuchar las respuestas.", "demo_question_limit_reached");
      }
      const normalizedQuestion = normalizeDemoQuestion(userText);
      if (normalizedQuestion && state.userTexts.some((previous) => normalizeDemoQuestion(previous) === normalizedQuestion)) {
        throw new DemoTurnError("Ya hiciste esa pregunta. Puedes volver a escuchar su respuesta.", "demo_duplicate_question");
      }
    }

    const context = await loadAgentContext(businessId);
    const niche = await getNicheProfile(String(context.business.category_code || ""));
    const voiceId = demoMode
      ? await resolveOnboardingVoiceId(requestedVoiceId)
      : (typeof context.agent.voice_id === "string" ? context.agent.voice_id : null);
    const allowance = await trialAllowance(businessId, conversationId || null);
    if (!allowance.allowed) {
      return Response.json({
        error: "Ya utilizaste la prueba de voz incluida. Puedes seguir configurando Progy y activar un plan cuando quieras continuar probando.",
        code: "voice_trial_limit_reached",
        plan: allowance.entitlements.code,
        upgradeRequired: true,
      }, { status: 402, headers: { "Cache-Control": "private, no-store, max-age=0" } });
    }

    const instructions = buildCompactAgentInstructions(context, userText, demoMode, niche);
    const tools = getEnabledToolsForBusiness(context);
    const generated = await generateAssistantDecision({
      businessId,
      instructions,
      userText,
      history,
      safetyIdentifier: `progy-${user.id}`,
      tools,
      onToolCalls: async (toolCalls) => {
        const results: unknown[] = [];
        for (const toolCall of toolCalls) {
          if (demoMode) {
            results.push({ executed: false, type: toolCall.name === "create_order" ? "order" : toolCall.name === "create_booking" ? "booking" : "none", message: "La acción está simulada durante la demo." });
            continue;
          }
          const configuredTool = context.agentTools.find((tool) => String(tool.code || "") === toolCall.name);
          results.push(await executeTool(
            String(configuredTool?.handler_key || toolCall.name),
            context,
            toolCall.arguments,
            supabaseDataRequest,
            { toolCode: toolCall.name, conversationId: conversationId || null, customerId: user.id },
          ));
        }
        return results;
      },
    });

    const action = demoMode
      ? simulatedAction(generated.decision.intent)
      : (generated.tool_calls.map((call) => call.result).filter((result): result is AssistantAction => Boolean(result)).at(-1) || { type: "none", executed: false });
    const generatedReply = generated.decision.reply.trim();
    const reply = !demoMode && action.type !== "none" && action.message
      ? `${generatedReply} ${action.message}`.trim()
      : generatedReply;

    let audio: { base64: string; contentType: string; voiceId: string } | null = null;
    let audioWarning: AudioWarning | null = null;

    if (wantsAudio) {
      try {
        const speech = await synthesizeSpeech({
          text: reply,
          voiceId,
          speed: Number((context.agent.settings as Record<string, unknown> | undefined)?.voice_speed || 50),
          expression: Number((context.agent.settings as Record<string, unknown> | undefined)?.voice_expression || 55),
        });
        if (exceedsBase64SourceLimit(speech.audio.byteLength)) {
          audioWarning = {
            code: "voice_response_too_large",
            message: `La respuesta quedó escrita, pero el audio supera el límite de ${MAX_PAYLOAD_MB} MB.`,
          };
        } else {
          audio = {
            base64: audioBase64(speech.audio),
            contentType: speech.contentType,
            voiceId: speech.voiceId,
          };
          await recordElevenLabsUsage(businessId, speech.characters);
        }
      } catch (error) {
        if (!(error instanceof VoiceServiceError)) throw error;
        audioWarning = {
          code: error.code,
          message: error.message,
        };
        console.warn("Progy voice degraded to text response", {
          code: error.code,
          status: error.status,
        });
      }
    }

    if (transcriptionUsage) await recordOpenAIUsage(businessId, transcriptionUsage);
    await recordOpenAIUsage(businessId, generated.usage);
    await persistConversationTurn({ businessId, conversationId, userText, reply, action, audioWarning });

    const testingMode = developmentTestingMode();
    return Response.json({
      userText,
      reply,
      intent: generated.decision.intent,
      missingInformation: generated.decision.missingInformation,
      action,
      audio,
      audioWarning,
      limits: {
        maxSessionSeconds: testingMode ? Math.max(300, entitlementsFor(allowance.entitlements.code).maxVoiceTestSeconds) : entitlementsFor(allowance.entitlements.code).maxVoiceTestSeconds,
        sessionsRemaining: testingMode ? 9999 : allowance.sessionsRemaining,
        testingMode,
      },
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return jsonError(error);
  }
}
