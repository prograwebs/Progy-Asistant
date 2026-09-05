import { NextResponse } from "next/server";
import { saveSupabaseSession, supabaseAuthRequest } from "@/lib/server/auth/supabase";
import {
  AUTH_RATE_LIMITS,
  AuthRateLimitUnavailableError,
  checkAuthRateLimit,
  identifierRateLimitRule,
  ipRateLimitRule,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/server/auth/rate-limit";
import { safeErrorMessage } from "@/lib/server/http/errors";
import { isRecord, validEmail } from "@/lib/shared/validation/input";

export async function POST(request: Request) {
  try {
    const ipLimit = await checkAuthRateLimit([ipRateLimitRule(request, AUTH_RATE_LIMITS.loginIp)]);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const body = await request.json().catch(() => null) as unknown;
    const email = isRecord(body) ? validEmail(body.email) : null;
    const password = isRecord(body) && typeof body.password === "string" ? body.password : "";
    if (!email || !password.trim()) {
      return NextResponse.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
    }

    const emailLimit = await checkAuthRateLimit([
      identifierRateLimitRule(email, AUTH_RATE_LIMITS.loginEmail),
    ]);
    if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfterSeconds);

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
    const sessionSaved = await saveSupabaseSession(payload);
    if (!sessionSaved) {
      return NextResponse.json({ error: "No pudimos iniciar sesión en este momento." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) return rateLimitUnavailableResponse();
    const message = error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED"
      ? "Supabase todavía no está configurado en Progy."
      : "No pudimos iniciar sesión en este momento.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
