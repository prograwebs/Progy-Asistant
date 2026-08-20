import { NextResponse } from "next/server";
import { safeErrorMessage, saveSupabaseSession, supabaseAuthRequest } from "../../../../lib/integrations";
import { isRecord, validEmail } from "../../../../lib/validation/input";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as unknown;
    const email = isRecord(body) ? validEmail(body.email) : null;
    const password = isRecord(body) && typeof body.password === "string" ? body.password : "";
    if (!email || !password.trim()) {
      return NextResponse.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
    }

    const response = await supabaseAuthRequest("token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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
