import { cookies } from "next/headers";
import { accessCookieOptions, refreshCookieOptions, sessionMaxAge, SUPABASE_ACCESS_COOKIE, SUPABASE_REFRESH_COOKIE } from "@/lib/server/auth/cookies";
import { fetchSupabaseUser, refreshSupabaseTokens } from "@/lib/server/auth/provider";
import type { ProgyUser, SupabaseSessionPayload, SupabaseUserPayload } from "@/lib/server/auth/types/supabase";
import { serverConfig } from "@/lib/server/config/env";

export async function supabaseAuthRequest(path: string, init: RequestInit = {}) {
  const { supabaseUrl, supabaseAnonKey } = serverConfig();
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("SUPABASE_NOT_CONFIGURED");

  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseAnonKey);
  headers.set("Authorization", `Bearer ${supabaseAnonKey}`);
  headers.set("Content-Type", "application/json");

  return fetch(`${supabaseUrl}/auth/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function saveSupabaseSession(payload: SupabaseSessionPayload): Promise<boolean> {
  if (
    typeof payload.access_token !== "string" ||
    !payload.access_token.trim() ||
    typeof payload.refresh_token !== "string" ||
    !payload.refresh_token.trim()
  ) return false;

  const store = await cookies();
  store.set(SUPABASE_ACCESS_COOKIE, payload.access_token, accessCookieOptions(sessionMaxAge(payload.expires_in)));
  store.set(SUPABASE_REFRESH_COOKIE, payload.refresh_token, refreshCookieOptions());
  return true;
}

export async function clearSupabaseSession() {
  const store = await cookies();
  store.delete(SUPABASE_ACCESS_COOKIE);
  store.delete(SUPABASE_REFRESH_COOKIE);
}

export async function getSupabaseAccessToken() {
  return (await cookies()).get(SUPABASE_ACCESS_COOKIE)?.value ?? null;
}

export async function getSupabaseRefreshToken() {
  return (await cookies()).get(SUPABASE_REFRESH_COOKIE)?.value ?? null;
}

export async function refreshSupabaseSession() {
  const refreshToken = await getSupabaseRefreshToken();
  if (!refreshToken) return false;

  const payload = await refreshSupabaseTokens(refreshToken);
  if (!payload) return false;
  if (typeof payload.refresh_token !== "string" || !payload.refresh_token.trim()) {
    payload.refresh_token = refreshToken;
  }
  return saveSupabaseSession(payload);
}

export async function getSupabaseUser(): Promise<ProgyUser | null> {
  const token = await getSupabaseAccessToken();
  if (!token) return null;

  let result = await fetchSupabaseUser(token);
  if (result.status === 401) {
    const refreshToken = await getSupabaseRefreshToken();
    if (refreshToken) {
      const refreshed = await refreshSupabaseTokens(refreshToken);
      const refreshedAccessToken = typeof refreshed?.access_token === "string" ? refreshed.access_token.trim() : "";
      if (refreshedAccessToken) {
        if (typeof refreshed?.refresh_token !== "string" || !refreshed.refresh_token.trim()) {
          if (refreshed) refreshed.refresh_token = refreshToken;
        }
        try {
          await saveSupabaseSession(refreshed);
        } catch {
          // Server Components can read cookies but cannot persist refreshed cookies during render.
        }
        result = await fetchSupabaseUser(refreshedAccessToken);
      }
    }
  }

  return userFromSupabasePayload(result.payload);
}

function userFromSupabasePayload(payload: SupabaseUserPayload | null): ProgyUser | null {
  const id = typeof payload?.id === "string" ? payload.id : "";
  const email = typeof payload?.email === "string" ? payload.email : "";
  if (!id || !email) return null;

  const fullName = payload.user_metadata?.full_name;
  const name = payload.user_metadata?.name;
  return {
    id,
    email,
    name: typeof fullName === "string" && fullName ? fullName : typeof name === "string" && name ? name : email.split("@")[0],
  };
}
