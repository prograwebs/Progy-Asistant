import { integrationConfig, requireApiUser } from "../../../../lib/integrations";
import { SupabaseDataError, supabaseDataRequest } from "../../../../lib/supabase-data";

type WhatsAppAccount = {
  business_account_id?: string;
  phone_number_id?: string;
  business_account_name?: string;
  phone_number_name?: string;
  phone_number?: string;
  assigned_agent_id?: string | null;
  assigned_agent_name?: string | null;
  enable_messaging?: boolean;
  enable_audio_message_response?: boolean;
  is_token_expired?: boolean;
};

function normalizedPhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `593${digits.slice(1)}`;
  return digits;
}

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para revisar el número." }, { status: 401 });
  const businessId = new URL(request.url).searchParams.get("businessId") ?? "";
  if (!businessId) return Response.json({ error: "Selecciona un negocio." }, { status: 400 });

  try {
    const businesses = await supabaseDataRequest<Array<{ whatsapp_phone?: string | null }>>(
      `businesses?id=eq.${encodeURIComponent(businessId)}&owner_id=eq.${encodeURIComponent(user.id)}&select=whatsapp_phone`,
    );
    if (!businesses[0]) throw new SupabaseDataError("No tienes acceso a este negocio.", 403);
    const savedNumber = normalizedPhone(businesses[0].whatsapp_phone);
    if (!savedNumber) return Response.json({ numberSaved: false, connected: false });

    const { elevenLabsKey } = integrationConfig();
    if (!elevenLabsKey) return Response.json({ numberSaved: true, connected: false, checkAvailable: false, nextAction: "connection_unavailable" });
    const response = await fetch("https://api.elevenlabs.io/v1/convai/whatsapp-accounts", {
      headers: { "xi-api-key": elevenLabsKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json({
        numberSaved: true,
        connected: false,
        checkAvailable: false,
        nextAction: response.status === 401 || response.status === 403 ? "connection_permissions" : "try_again",
      });
    }
    const payload = (await response.json()) as { items?: WhatsAppAccount[] };
    const account = (payload.items ?? []).find((item) => normalizedPhone(item.phone_number) === savedNumber);
    if (!account) return Response.json({ numberSaved: true, connected: false, checkAvailable: true, nextAction: "authorize_meta" });

    const tokenReady = !account.is_token_expired;
    const agentReady = Boolean(account.assigned_agent_id);
    return Response.json({
      numberSaved: true,
      connected: tokenReady,
      messagingReady: tokenReady && account.enable_messaging !== false && agentReady,
      callingReady: tokenReady && agentReady,
      agentReady,
      phoneNumberId: account.phone_number_id ?? null,
      phoneNumberName: account.phone_number_name ?? null,
      businessAccountName: account.business_account_name ?? null,
      tokenExpired: Boolean(account.is_token_expired),
      nextAction: account.is_token_expired ? "reauthorize_meta" : agentReady ? "test_channel" : "assign_progy",
    });
  } catch (error) {
    if (error instanceof SupabaseDataError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "No pudimos comprobar el número en este momento." }, { status: 500 });
  }
}
