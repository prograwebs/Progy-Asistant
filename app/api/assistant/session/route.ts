import { requireApiUser } from "@/lib/auth/supabase";
import { developmentTestingMode, entitlementsFor, normalizePlanCode } from "../../../../lib/billing/entitlements";
import { SupabaseDataError, supabaseDataRequest } from "@/lib/data/supabase";
import { resolveOnboardingVoiceId, VoiceServiceError } from "../../../../lib/voice/elevenlabs";

export const dynamic = "force-dynamic";

type UnknownRow = Record<string, unknown>;

function enc(value: string) {
  return encodeURIComponent(value);
}

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function jsonError(error: unknown) {
  if (error instanceof SupabaseDataError || error instanceof VoiceServiceError) {
    return Response.json({ error: error.message, code: error instanceof VoiceServiceError ? error.code : undefined }, { status: error.status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
  console.error("Progy assistant session error", error);
  return Response.json({ error: "No pudimos preparar la prueba de Progy." }, { status: 500, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

async function planFor(businessId: string) {
  const rows = await supabaseDataRequest<UnknownRow[]>(
    `business_plans?business_id=eq.${enc(businessId)}&select=plan_code,status,used_voice_seconds,included_voice_seconds`,
  );
  return rows[0] || { plan_code: "trial", status: "active", used_voice_seconds: 0, included_voice_seconds: 0 };
}

async function assertBusinessAccess(businessId: string, userId: string) {
  const rows = await supabaseDataRequest<UnknownRow[]>(
    `businesses?id=eq.${enc(businessId)}&owner_id=eq.${enc(userId)}&select=id`,
  );
  if (!rows[0]) throw new SupabaseDataError("No tienes acceso a este negocio.", 403);
}

async function startSession(businessId: string, user: { id: string; name: string }, scenario: string, demoMode: boolean, requestedVoiceId?: string) {
  await assertBusinessAccess(businessId, user.id);
  if (demoMode) await resolveOnboardingVoiceId(requestedVoiceId);
  const plan = await planFor(businessId);
  const planCode = normalizePlanCode(String(plan.plan_code || "trial"));
  const entitlements = entitlementsFor(planCode);
  const testingMode = developmentTestingMode();
  const id = enc(businessId);

  const usagePath = planCode === "trial"
    ? `conversations?business_id=eq.${id}&channel=eq.web_voice&is_trial=eq.true&select=id,status,started_at&limit=100`
    : `conversations?business_id=eq.${id}&channel=eq.web_voice&started_at=gte.${enc(monthStartIso())}&select=id,status,started_at&limit=500`;
  const previous = await supabaseDataRequest<UnknownRow[]>(usagePath);

  if (!testingMode && previous.length >= entitlements.maxVoiceTestSessions) {
    return Response.json({
      error: planCode === "trial"
        ? "Ya utilizaste la prueba de voz incluida. Puedes seguir configurando Progy y activar un plan cuando quieras continuar probando."
        : "Alcanzaste las pruebas de voz incluidas en tu plan para este período.",
      code: "voice_trial_limit_reached",
      upgradeRequired: true,
      plan: planCode,
      sessionsRemaining: 0,
    }, { status: 402, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  const rows = await supabaseDataRequest<UnknownRow[]>("conversations", {
    method: "POST",
    body: JSON.stringify({
      business_id: businessId,
      customer_id: user.id,
      customer_name: user.name,
      channel: "web_voice",
      status: "active",
      is_trial: planCode === "trial",
      outcome: scenario,
      metadata: {
        source: demoMode ? "progy_onboarding_demo" : "progy_voice_test",
        scenario,
        demo_mode: demoMode,
        plan_code: planCode,
        development_testing: testingMode,
      },
    }),
    prefer: "return=representation",
  });

  if (!rows[0]?.id) throw new SupabaseDataError("No pudimos registrar el inicio de la prueba.", 500);
  return Response.json({
    conversation: rows[0],
    limits: {
      maxSessionSeconds: testingMode ? Math.max(300, entitlements.maxVoiceTestSeconds) : entitlements.maxVoiceTestSeconds,
      sessionsRemaining: testingMode ? 9999 : Math.max(0, entitlements.maxVoiceTestSessions - previous.length - 1),
      testingMode,
    },
  }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

async function endSession(businessId: string, conversationId: string, durationSeconds: number, status: "completed" | "failed") {
  const duration = Math.max(0, Math.min(3600, Math.round(durationSeconds)));
  const businessFilter = `business_id=eq.${enc(businessId)}`;
  const rows = await supabaseDataRequest<UnknownRow[]>(
    `conversations?id=eq.${enc(conversationId)}&${businessFilter}&channel=eq.web_voice`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
      }),
      prefer: "return=representation",
    },
  );
  if (!rows[0]) throw new SupabaseDataError("No pudimos cerrar la prueba.", 404);

  try {
    const plan = await planFor(businessId);
    const used = Math.max(0, Number(plan.used_voice_seconds || 0));
    await supabaseDataRequest(`business_plans?${businessFilter}`, {
      method: "PATCH",
      body: JSON.stringify({ used_voice_seconds: used + duration }),
      prefer: "return=minimal",
    });
  } catch (error) {
    console.error("Progy voice plan usage update failed", error);
  }

  return Response.json({ conversation: rows[0] }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para probar a Progy." }, { status: 401 });

  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) throw new SupabaseDataError("La solicitud no es válida.", 400);
    const businessId = String(body.businessId || "").trim();
    if (!businessId) throw new SupabaseDataError("Selecciona un negocio antes de probar a Progy.", 400);

    if (body.action === "start") {
      const scenario = String(body.scenario || "Prueba guiada de voz").trim().slice(0, 160);
      return await startSession(businessId, user, scenario, body.demoMode === true, String(body.voiceId || "").trim() || undefined);
    }

    if (body.action === "end") {
      await assertBusinessAccess(businessId, user.id);
      const conversationId = String(body.conversationId || "").trim();
      if (!conversationId) throw new SupabaseDataError("La conversación no es válida.", 400);
      return await endSession(
        businessId,
        conversationId,
        Number(body.durationSeconds || 0),
        body.status === "failed" ? "failed" : "completed",
      );
    }

    throw new SupabaseDataError("La acción solicitada no existe.", 400);
  } catch (error) {
    return jsonError(error);
  }
}
