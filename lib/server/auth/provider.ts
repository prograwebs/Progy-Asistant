import { isRecord } from "@/lib/shared/validation/input";
import { serverConfig } from "@/lib/server/config/env";
import type { SupabaseSessionPayload, SupabaseUserPayload } from "@/lib/server/auth/types/supabase";

export async function refreshSupabaseTokens(refreshToken: string): Promise<SupabaseSessionPayload | null> {
  const { supabaseUrl, supabaseAnonKey } = serverConfig();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
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
    if (!response.ok) return null;

    const payload = await response.json().catch(() => null) as unknown;
    return isRecord(payload) ? payload as SupabaseSessionPayload : null;
  } catch {
    return null;
  }
}

export async function fetchSupabaseUser(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = serverConfig();
  if (!supabaseUrl || !supabaseAnonKey) return { status: 503, payload: null as SupabaseUserPayload | null };

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as unknown;
    return {
      status: response.status,
      payload: isRecord(payload) ? payload as SupabaseUserPayload : null,
    };
  } catch {
    return { status: 503, payload: null as SupabaseUserPayload | null };
  }
}
