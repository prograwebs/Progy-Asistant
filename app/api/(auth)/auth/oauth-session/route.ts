import { NextResponse } from "next/server";
import { saveSupabaseSession } from "@/lib/server/auth/supabase";
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
import { integrationConfig } from "@/lib/server/config/env";
import { RequestBodyTooLargeError, readJsonBody, requestBodyTooLargeResponse } from "@/lib/server/http/body";
import { AUTH_MAX_EXPIRES_IN_SECONDS, AUTH_REQUEST_MAX_BYTES } from "@/lib/shared/config/auth";
import { isRecord } from "@/lib/shared/validation/input";

export async function POST(request: Request) {
  const csrfResponse = validateAuthRequestOrigin(request);
  if (csrfResponse) return csrfResponse;

  try {
    const ipLimit = await checkAuthRateLimit([ipRateLimitRule(request, AUTH_RATE_LIMITS.oauthIp)]);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const body = await readJsonBody(request, AUTH_REQUEST_MAX_BYTES);
    const accessToken = isRecord(body) && typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    const refreshToken = isRecord(body) && typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";
    const expiresIn = isRecord(body) ? body.expiresIn : null;
    const { supabaseUrl, supabaseAnonKey } = integrationConfig();

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase todavía no está configurado." }, { status: 503 });
    }
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: "Google no devolvió una sesión válida." }, { status: 400 });
    }
    if (
      typeof expiresIn !== "number" ||
      !Number.isFinite(expiresIn) ||
      !Number.isInteger(expiresIn) ||
      expiresIn <= 0 ||
      expiresIn > AUTH_MAX_EXPIRES_IN_SECONDS
    ) {
      return NextResponse.json({ error: "Google devolvió una duración de sesión no válida." }, { status: 400 });
    }

    const tokenLimit = await checkAuthRateLimit([
      identifierRateLimitRule(accessToken, AUTH_RATE_LIMITS.oauthToken),
    ]);
    if (!tokenLimit.allowed) return rateLimitResponse(tokenLimit.retryAfterSeconds);

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
    if (!userResponse.ok) {
      return NextResponse.json({ error: "No pudimos validar tu acceso con Google." }, { status: 401 });
    }

    const sessionSaved = await saveSupabaseSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    });
    if (!sessionSaved) {
      return NextResponse.json({ error: "No pudimos completar el acceso con Google." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return requestBodyTooLargeResponse();
    if (error instanceof AuthRateLimitUnavailableError) return rateLimitUnavailableResponse();
    return NextResponse.json({ error: "No pudimos completar el acceso con Google." }, { status: 500 });
  }
}
