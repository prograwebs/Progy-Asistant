import {
  AUTH_DEFAULT_EXPIRES_IN_SECONDS,
  AUTH_MAX_EXPIRES_IN_SECONDS,
  AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/shared/config/auth";

export const SUPABASE_ACCESS_COOKIE = "progy_access_token";
export const SUPABASE_REFRESH_COOKIE = "progy_refresh_token";

export function sessionMaxAge(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= AUTH_MAX_EXPIRES_IN_SECONDS
    ? value
    : AUTH_DEFAULT_EXPIRES_IN_SECONDS;
}

export function accessCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function refreshCookieOptions() {
  return accessCookieOptions(AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS);
}
