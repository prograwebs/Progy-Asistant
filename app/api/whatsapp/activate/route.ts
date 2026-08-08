import { integrationConfig, requireApiUser, resolveElevenLabsVoiceId } from "../../../../lib/integrations";
import { buildAgentInstructions, loadAgentContext, SupabaseDataError, supabaseDataRequest } from "../../../../lib/supabase-data";

type WhatsAppAccount = {
  phone_number_id?: string;
  phone_number?: string;
  assigned_agent_id?: string | null;
  is_token_expired?: boolean;
};

function normalizedPhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `593${digits.slice(1)}`;
  return digits;
}

function providerError(status: number, raw: string, action: "agent" | "account") {
  const text = raw.toLowerCase();
  if (status === 401 || status === 403) return "La conexión no tiene los permisos necesarios para administrar agentes y WhatsApp en ElevenLabs.";
  if (status === 429 || /quota|credit|limit/.test(text)) return "Tu plan de ElevenLabs alcanzó un límite. Revisa el plan antes de activar WhatsApp.";
  if (/not available|not supported|subscription|plan/.test(text)) return `Esta función de ${action === "agent" ? "agentes" : "WhatsApp"} no está disponible en el plan actual de ElevenLabs.`;
  return action === "agent" ? "No pudimos preparar el agente de este negocio en ElevenLabs." : "No pudimos asignar Progy al número de WhatsApp.";
}

function voiceSettings(agent: Record<string, unknown>) {
  const settings = (agent.settings && typeof agent.settings === "object" ? agent.settings : {}) as Record<string, unknown>;
  const speedSlider = Math.max(25, Math.min(75, Number(settings.voice_speed ?? 50)));
  const expressionSlider = Math.max(20, Math.min(80, Number(settings.voice_expressiveness ?? 55)));
  const expression = (expressionSlider - 20) / 60;
  return {
    speed: 0.9 + ((speedSlider - 25) / 50) * 0.2,
    stability: 0.72 - expression * 0.3,
  };
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para activar WhatsApp." }, { status: 401 });
  const body = await request.json().catch(() => null) as { businessId?: string } | null;
  const businessId = String(body?.businessId ?? "");
  if (!businessId) return Response.json({ error: "Selecciona un negocio." }, { status: 400 });

  try {
    const owned = await supabaseDataRequest<Array<{ id: string; name: string; whatsapp_phone?: string | null }>>(
      `businesses?id=eq.${encodeURIComponent(businessId)}&owner_id=eq.${encodeURIComponent(user.id)}&select=id,name,whatsapp_phone`,
    );
    if (!owned[0]) throw new SupabaseDataError("No tienes acceso a este negocio.", 403);
    const savedNumber = normalizedPhone(owned[0].whatsapp_phone);
    if (!savedNumber) return Response.json({ error: "Guarda primero el número de WhatsApp del negocio." }, { status: 400 });

    const { elevenLabsKey } = integrationConfig();
    if (!elevenLabsKey) return Response.json({ error: "La activación de WhatsApp todavía no está disponible." }, { status: 503 });
    const headers = { "xi-api-key": elevenLabsKey, Accept: "application/json", "Content-Type": "application/json" };
    const accountsResponse = await fetch("https://api.elevenlabs.io/v1/convai/whatsapp-accounts", { headers, cache: "no-store" });
    if (!accountsResponse.ok) return Response.json({ error: providerError(accountsResponse.status, await accountsResponse.text(), "account") }, { status: accountsResponse.status });
    const accounts = (await accountsResponse.json()) as { items?: WhatsAppAccount[] };
    const account = (accounts.items ?? []).find((item) => normalizedPhone(item.phone_number) === savedNumber);
    if (!account?.phone_number_id) return Response.json({ error: "Meta todavía no ha autorizado este número. Completa el paso 2 y vuelve a comprobar." }, { status: 409 });
    if (account.is_token_expired) return Response.json({ error: "La autorización de Meta venció. Autoriza nuevamente la cuenta antes de continuar." }, { status: 409 });

    const context = await loadAgentContext(businessId);
    const agent = context.agent as Record<string, unknown>;
    const voiceId = String(agent.voice_id || await resolveElevenLabsVoiceId());
    if (!voiceId) return Response.json({ error: "Elige y guarda una voz antes de asignar Progy a WhatsApp." }, { status: 409 });
    const speech = voiceSettings(agent);
    const agentConfig = {
      conversation_config: {
        agent: {
          first_message: String(agent.greeting || `Hola, gracias por comunicarte con ${owned[0].name}. Soy Progy, ¿en qué puedo ayudarte?`),
          language: "es",
          prompt: {
            prompt: buildAgentInstructions(context),
            llm: "gpt-4o-mini",
            temperature: 0.2,
          },
        },
        tts: {
          voice_id: voiceId,
          model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5",
          speed: speech.speed,
          stability: speech.stability,
          similarity_boost: 0.75,
        },
        conversation: { max_duration_seconds: 600 },
      },
      name: `Progy - ${owned[0].name}`.slice(0, 120),
      tags: ["progy", `business:${businessId}`],
    };

    let agentId = String(agent.elevenlabs_agent_id || account.assigned_agent_id || "");
    const agentResponse = await fetch(
      agentId ? `https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}` : "https://api.elevenlabs.io/v1/convai/agents/create",
      { method: agentId ? "PATCH" : "POST", headers, body: JSON.stringify(agentConfig) },
    );
    if (!agentResponse.ok) return Response.json({ error: providerError(agentResponse.status, await agentResponse.text(), "agent") }, { status: agentResponse.status });
    if (!agentId) {
      const created = await agentResponse.json() as { agent_id?: string };
      agentId = String(created.agent_id || "");
    }
    if (!agentId) return Response.json({ error: "ElevenLabs no devolvió el agente creado." }, { status: 502 });

    const assignment = await fetch(`https://api.elevenlabs.io/v1/convai/whatsapp-accounts/${encodeURIComponent(account.phone_number_id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ assigned_agent_id: agentId, enable_messaging: true, enable_audio_message_response: false, enable_typing_indicator: true }),
    });
    if (!assignment.ok) return Response.json({ error: providerError(assignment.status, await assignment.text(), "account") }, { status: assignment.status });

    await supabaseDataRequest(`agent_configs?business_id=eq.${encodeURIComponent(businessId)}`, {
      method: "PATCH",
      body: JSON.stringify({ elevenlabs_agent_id: agentId, voice_id: voiceId }),
      prefer: "return=minimal",
    });
    return Response.json({ ok: true, agentReady: true });
  } catch (error) {
    if (error instanceof SupabaseDataError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: error instanceof Error ? error.message : "No pudimos completar la activación." }, { status: 500 });
  }
}
