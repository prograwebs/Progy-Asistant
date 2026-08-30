import { NextResponse } from "next/server";
import { saveSupabaseSession, supabaseAuthRequest } from "@/lib/auth/supabase";
import { progyAuthCallbackUrl } from "@/lib/config/env";
import { safeErrorMessage } from "@/lib/http/errors";
import { isRecord, requiredText, validEmail } from "@shared/validation/input";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as unknown;
    const name = isRecord(body) ? requiredText(body.name, 120) : null;
    const email = isRecord(body) ? validEmail(body.email) : null;
    const password = isRecord(body) && typeof body.password === "string" ? body.password : "";
    if (!name || !email || password.trim().length < 8) {
      return NextResponse.json({ error: "Completa tu nombre, correo y una contraseña de al menos 8 caracteres." }, { status: 400 });
    }

    const response = await supabaseAuthRequest(`signup?redirect_to=${encodeURIComponent(progyAuthCallbackUrl())}`, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: { full_name: name },
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
