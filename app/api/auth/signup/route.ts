import { NextResponse } from "next/server";
import { progyAuthCallbackUrl, safeErrorMessage, saveSupabaseSession, supabaseAuthRequest } from "../../../../lib/integrations";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    if (!body.name?.trim() || !body.email?.trim() || !body.password || body.password.length < 8) {
      return NextResponse.json({ error: "Completa tu nombre, correo y una contraseña de al menos 8 caracteres." }, { status: 400 });
    }

    const response = await supabaseAuthRequest(`signup?redirect_to=${encodeURIComponent(progyAuthCallbackUrl())}`, {
      method: "POST",
      body: JSON.stringify({
        email: body.email.trim().toLowerCase(),
        password: body.password,
        data: { full_name: body.name.trim() },
      }),
    });
    const payload = (await response.json()) as Record<string, unknown> & {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      user?: unknown;
    };
    if (!response.ok) {
      return NextResponse.json({ error: safeErrorMessage(payload, "No pudimos crear la cuenta.") }, { status: response.status });
    }
    await saveSupabaseSession(payload);
    return NextResponse.json({ ok: true, needsConfirmation: !payload.access_token });
  } catch (error) {
    const message = error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED"
      ? "Supabase todavía no está configurado en Progy."
      : "No pudimos crear la cuenta en este momento.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
