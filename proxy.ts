import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isRecord } from "@/lib/shared/validation/input";
import { refreshSupabaseTokens } from "@/lib/server/auth/provider";
import {
  accessCookieOptions,
  refreshCookieOptions,
  sessionMaxAge,
  SUPABASE_ACCESS_COOKIE,
  SUPABASE_REFRESH_COOKIE,
} from "@/lib/server/auth/cookies";

function tokenExpiresSoon(token: string) {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return true;
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;
    return !isRecord(payload) || typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000) + 30;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(SUPABASE_ACCESS_COOKIE)?.value || "";
  const refreshToken = request.cookies.get(SUPABASE_REFRESH_COOKIE)?.value || "";

  if (refreshToken && (!accessToken || tokenExpiresSoon(accessToken))) {
    const payload = await refreshSupabaseTokens(refreshToken);
    const nextAccessToken = typeof payload?.access_token === "string" ? payload.access_token.trim() : "";
    const nextRefreshToken = typeof payload?.refresh_token === "string" && payload.refresh_token.trim()
      ? payload.refresh_token.trim()
      : refreshToken;

    if (nextAccessToken && nextRefreshToken) {
      request.cookies.set(SUPABASE_ACCESS_COOKIE, nextAccessToken);
      request.cookies.set(SUPABASE_REFRESH_COOKIE, nextRefreshToken);
      const response = NextResponse.next({ request });
      response.cookies.set(SUPABASE_ACCESS_COOKIE, nextAccessToken, accessCookieOptions(sessionMaxAge(payload?.expires_in)));
      response.cookies.set(SUPABASE_REFRESH_COOKIE, nextRefreshToken, refreshCookieOptions());
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/onboarding/:path*", "/admin/:path*"],
};
