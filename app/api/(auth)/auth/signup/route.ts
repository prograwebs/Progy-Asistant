import { NextResponse } from "next/server";
import { saveSupabaseSession, supabaseAuthRequest } from "@/lib/server/auth/supabase";
import { validateAuthRequestOrigin } from "@/lib/server/auth/csrf";
import {
  AUTH_RATE_LIMITS,
  AuthRateLimitUnavailableError,
  checkAuthRateLimit,
  identifierRateLimitRule,
  ipRateLimitRule,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/server/auth/rate-limit";
import { progyAuthCallbackUrl } from "@/lib/server/config/env";
import { safeErrorMessage } from "@/lib/server/http/errors";
import { isRecord, requiredText, validEmail } from "@/lib/shared/validation/input";

export async function POST(request: Request) {
  const csrfResponse = validateAuthRequestOrigin(request);
  if (csrfResponse) return csrfResponse;

  try {
    const ipLimit = await checkAuthRateLimit([ipRateLimitRule(request, AUTH_RATE_LIMITS.signupIp)]);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const body = await request.json().catch(() => null) as unknown;
    const name = isRecord(body) ? requiredText(body.name, 120) : null;
    const email = isRecord(body) ? validEmail(body.email) : null;
    const password = isRecord(body) && typeof body.password === "string" ? body.password : "";
    if (!name || !email || password.trim().length < 8) {
      return NextResponse.json({ error: "Completa tu nombre, correo y una contraseña de al menos 8 caracteres." }, { status: 400 });
    }

    const emailLimit = await checkAuthRateLimit([
      identifierRateLimitRule(email, AUTH_RATE_LIMITS.signupEmail),
    ]);
    if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfterSeconds);

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

    const hasAccessToken = typeof payload.access_token === "string" && payload.access_token.trim().length > 0;
    const hasRefreshToken = typeof payload.refresh_token === "string" && payload.refresh_token.trim().length > 0;
    if (hasAccessToken !== hasRefreshToken) {
      return NextResponse.json({ error: "No pudimos crear la cuenta en este momento." }, { status: 502 });
    }
    if (!hasAccessToken) {
      return NextResponse.json({ ok: true, needsConfirmation: true });
    }

    const sessionSaved = await saveSupabaseSession(payload);
    if (!sessionSaved) {
      return NextResponse.json({ error: "No pudimos crear la cuenta en este momento." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, needsConfirmation: false });
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) return rateLimitUnavailableResponse();
    const message = error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED"
      ? "Supabase todavía no está configurado en Progy."
      : "No pudimos crear la cuenta en este momento.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
