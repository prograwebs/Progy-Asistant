import { NextResponse } from "next/server";
import { saveSupabaseSession } from "@/lib/server/auth/supabase";
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

export async function POST(request: Request) {
  try {
    const ipLimit = await checkAuthRateLimit([ipRateLimitRule(request, AUTH_RATE_LIMITS.oauthIp)]);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const body = (await request.json()) as {
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    };
    const { supabaseUrl, supabaseAnonKey } = integrationConfig();

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase todavía no está configurado." }, { status: 503 });
    }
    if (!body.accessToken || !body.refreshToken) {
      return NextResponse.json({ error: "Google no devolvió una sesión válida." }, { status: 400 });
    }

    const tokenLimit = await checkAuthRateLimit([
      identifierRateLimitRule(body.accessToken, AUTH_RATE_LIMITS.oauthToken),
    ]);
    if (!tokenLimit.allowed) return rateLimitResponse(tokenLimit.retryAfterSeconds);

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${body.accessToken}`,
      },
      cache: "no-store",
    });
    if (!userResponse.ok) {
      return NextResponse.json({ error: "No pudimos validar tu acceso con Google." }, { status: 401 });
    }

    const sessionSaved = await saveSupabaseSession({
      access_token: body.accessToken,
      refresh_token: body.refreshToken,
      expires_in: body.expiresIn,
    });
    if (!sessionSaved) {
      return NextResponse.json({ error: "No pudimos completar el acceso con Google." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) return rateLimitUnavailableResponse();
    return NextResponse.json({ error: "No pudimos completar el acceso con Google." }, { status: 500 });
  }
}
