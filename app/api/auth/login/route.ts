import { NextResponse } from "next/server";
import { safeErrorMessage, saveSupabaseSession, supabaseAuthRequest } from "../../../../lib/integrations";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email?.trim() || !body.password) {
      return NextResponse.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
    }

    const response = await supabaseAuthRequest("token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email: body.email.trim().toLowerCase(), password: body.password }),
    });
    const payload = (await response.json()) as Record<string, unknown> & {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!response.ok) {
      return NextResponse.json({ error: safeErrorMessage(payload, "Correo o contraseña incorrectos.") }, { status: 401 });
    }
    await saveSupabaseSession(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED"
      ? "Supabase todavía no está configurado en Progy."
      : "No pudimos iniciar sesión en este momento.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
