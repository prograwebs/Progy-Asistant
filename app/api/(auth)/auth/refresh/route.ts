import { getSupabaseRefreshToken, refreshSupabaseSession } from "@/lib/server/auth/supabase";
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

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const csrfResponse = validateAuthRequestOrigin(request);
  if (csrfResponse) return csrfResponse;

  try {
    const ipLimit = await checkAuthRateLimit([ipRateLimitRule(request, AUTH_RATE_LIMITS.refreshIp)]);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterSeconds);

    const refreshToken = await getSupabaseRefreshToken();
    if (refreshToken) {
      const tokenLimit = await checkAuthRateLimit([
        identifierRateLimitRule(refreshToken, AUTH_RATE_LIMITS.refreshToken),
      ]);
      if (!tokenLimit.allowed) return rateLimitResponse(tokenLimit.retryAfterSeconds);
    }

    const refreshed = await refreshSupabaseSession();

    if (!refreshed) {
      return Response.json(
        {
          ok: false,
          error: "No se pudo renovar la sesión.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

    return Response.json(
      {
        ok: true,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthRateLimitUnavailableError) return rateLimitUnavailableResponse();
    console.error("Progy auth refresh exception:", error);

    return Response.json(
      {
        ok: false,
        error: "No pudimos renovar la sesión.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }
}
