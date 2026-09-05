import { NextResponse } from "next/server";
import { clearSupabaseSession, getSupabaseAccessToken } from "@/lib/server/auth/supabase";
import { validateAuthRequestOrigin } from "@/lib/server/auth/csrf";
import { integrationConfig } from "@/lib/server/config/env";

export async function POST(request: Request) {
  const csrfResponse = validateAuthRequestOrigin(request);
  if (csrfResponse) return csrfResponse;

  const token = await getSupabaseAccessToken();
  const { supabaseUrl, supabaseAnonKey } = integrationConfig();
  if (token && supabaseUrl && supabaseAnonKey) {
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  await clearSupabaseSession();
  return NextResponse.json({ ok: true });
}
