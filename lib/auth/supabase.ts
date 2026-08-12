import { cookies } from "next/headers";
import { serverConfig } from "../config/env";

const ACCESS_COOKIE = "progy_access_token";
const REFRESH_COOKIE = "progy_refresh_token";

export type ProgyUser = {
  id: string;
  email: string;
  name: string;
};

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

export async function saveSupabaseSession(payload: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}) {
  if (!payload.access_token || !payload.refresh_token) return;
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };

  store.set(ACCESS_COOKIE, payload.access_token, {
    ...base,
    maxAge: payload.expires_in ?? 3600,
  });
  store.set(REFRESH_COOKIE, payload.refresh_token, {
    ...base,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSupabaseSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getSupabaseAccessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

export async function getSupabaseRefreshToken() {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}

export async function refreshSupabaseSession() {
  const refreshToken = await getSupabaseRefreshToken();
  if (!refreshToken) return false;

  const { supabaseUrl, supabaseAnonKey } = serverConfig();
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Progy Supabase refresh failed", { status: response.status });
    return false;
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!payload.access_token) return false;

  await saveSupabaseSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || refreshToken,
    expires_in: payload.expires_in || 3600,
  });
  return true;
}

export async function getSupabaseUser(): Promise<ProgyUser | null> {
  const token = await getSupabaseAccessToken();
  const { supabaseUrl, supabaseAnonKey } = serverConfig();
  if (!token || !supabaseUrl || !supabaseAnonKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const user = (await response.json()) as {
    id?: string;
    email?: string;
    user_metadata?: { full_name?: string; name?: string };
  };
  if (!user.id || !user.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email.split("@")[0],
  };
}

export async function requireApiUser() {
  const user = await getSupabaseUser();
  if (user) return user;
  if (process.env.NODE_ENV !== "production") {
    return { id: "preview-user", email: "preview@progy.local", name: "Harold" };
  }
  return null;
}
