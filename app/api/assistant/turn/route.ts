import { requireApiUser } from "../../../../lib/integrations";
import { generateAssistantDecision, OpenAIServiceError, transcribeAudio } from "../../../../lib/ai/openai";
import { buildCompactAgentInstructions } from "../../../../lib/assistant/context";
import { executeAssistantDecision } from "../../../../lib/assistant/actions";
import { entitlementsFor, voiceTrialAllowance } from "../../../../lib/billing/entitlements";
import { loadAgentContext, SupabaseDataError, supabaseDataRequest } from "../../../../lib/supabase-data";
import { recordElevenLabsUsage, recordOpenAIUsage } from "../../../../lib/usage/ledger";
import { synthesizeSpeech, VoiceServiceError } from "../../../../lib/voice/elevenlabs";

export const dynamic = "force-dynamic";

type UnknownRow = Record<string, unknown>;
type HistoryEntry = { role: "user" | "assistant"; text: string };

function jsonError(error: unknown) {
  if (error instanceof OpenAIServiceError || error instanceof VoiceServiceError || error instanceof SupabaseDataError) {
    return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  }
  console.error("Progy assistant turn error", error);
  return Response.json({ error: "No pudimos completar la conversación. Inténtalo nuevamente." }, { status: 500, headers: { "Cache-Control": "no-store" } });
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

async function trialAllowance(businessId: string, conversationId?: string | null) {
  const id = encodeURIComponent(businessId);
  const [plans, conversations] = await Promise.all([
    supabaseDataRequest<UnknownRow[]>(`business_plans?business_id=eq.${id}&select=plan_code,status`),
    supabaseDataRequest<UnknownRow[]>(`conversations?business_id=eq.${id}&channel=eq.web_voice&is_trial=eq.true&select=id,status,duration_seconds&limit=100`),
  ]);

  const planCode = String(plans[0]?.plan_code || "trial");
  if (planCode !== "trial") {
    return voiceTrialAllowance({ planCode, usedSessions: 0, usedSeconds: 0 });
  }

  const previous = conversations.filter((row) => String(row.id || "") !== String(conversationId || ""));
  const usedSessions = previous.filter((row) => row.status === "completed" || row.status === "failed").length;
  const usedSeconds = previous.reduce((sum, row) => sum + Math.max(0, Number(row.duration_seconds || 0)), 0);
  return voiceTrialAllowance({ planCode, usedSessions, usedSeconds });
}

async function persistConversationTurn(options: {
  businessId: string;
  conversationId?: string | null;
  userText: string;
  reply: string;
  action: Awaited<ReturnType<typeof executeAssistantDecision>>;
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
    let transcriptionUsage = null as Awaited<ReturnType<typeof transcribeAudio>>["usage"] | null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      businessId = String(form.get("businessId") || "").trim();
      conversationId = String(form.get("conversationId") || "").trim();
      wantsAudio = String(form.get("includeAudio") || "1") !== "0";
      const rawHistory = String(form.get("history") || "");
      if (rawHistory) {
        try { history = parseHistory(JSON.parse(rawHistory)); } catch { history = []; }
      }

      const audio = form.get("audio");
      if (!(audio instanceof File) || audio.size === 0) {
        throw new OpenAIServiceError("No recibimos audio para procesar.", 400);
      }
      if (audio.size > 8 * 1024 * 1024) {
        throw new OpenAIServiceError("La prueba de audio es demasiado larga. Habla en turnos más cortos.", 413);
      }

      const transcription = await transcribeAudio(audio, `progy-${user.id}`);
      userText = transcription.text;
      transcriptionUsage = transcription.usage;
    } else {
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (!body) throw new OpenAIServiceError("La solicitud no es válida.", 400);
      businessId = String(body.businessId || "").trim();
      conversationId = String(body.conversationId || "").trim();
      userText = String(body.text || "").trim().slice(0, 2000);
      history = parseHistory(body.history);
      wantsAudio = body.includeAudio === true;
    }

    if (!businessId) throw new SupabaseDataError("Selecciona un negocio antes de probar a Progy.", 400);
    if (!userText) throw new OpenAIServiceError("No logramos identificar qué deseas preguntar.", 422);

    const context = await loadAgentContext(businessId);
    const allowance = await trialAllowance(businessId, conversationId || null);
    if (!allowance.allowed) {
      return Response.json({
        error: "Ya utilizaste la prueba de voz incluida. Puedes seguir configurando Progy y activar un plan cuando quieras continuar probando.",
        code: "voice_trial_limit_reached",
        plan: allowance.entitlements.code,
        upgradeRequired: true,
      }, { status: 402, headers: { "Cache-Control": "no-store" } });
    }

    const instructions = buildCompactAgentInstructions(context, userText);
    const generated = await generateAssistantDecision({
      businessId,
      instructions,
      userText,
      history,
      safetyIdentifier: `progy-${user.id}`,
    });

    const action = await executeAssistantDecision(context, generated.decision);
    const reply = action.type !== "none" && !action.executed && action.message
      ? action.message
      : generated.decision.reply.trim();

    let audio: { base64: string; contentType: string; voiceId: string } | null = null;
    if (wantsAudio) {
      const voiceId = typeof context.agent.voice_id === "string" ? context.agent.voice_id : null;
      const speech = await synthesizeSpeech({
        text: reply,
        voiceId,
        speed: Number((context.agent.settings as Record<string, unknown> | undefined)?.voice_speed || 50),
        expression: Number((context.agent.settings as Record<string, unknown> | undefined)?.voice_expression || 55),
      });
      audio = {
        base64: audioBase64(speech.audio),
        contentType: speech.contentType,
        voiceId: speech.voiceId,
      };
      await recordElevenLabsUsage(businessId, speech.characters);
    }

    if (transcriptionUsage) await recordOpenAIUsage(businessId, transcriptionUsage);
    await recordOpenAIUsage(businessId, generated.usage);
    await persistConversationTurn({ businessId, conversationId, userText, reply, action });

    return Response.json({
      userText,
      reply,
      intent: generated.decision.intent,
      missingInformation: generated.decision.missingInformation,
      action,
      audio,
      limits: {
        maxSessionSeconds: entitlementsFor(allowance.entitlements.code).maxVoiceTestSeconds,
        sessionsRemaining: allowance.sessionsRemaining,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
