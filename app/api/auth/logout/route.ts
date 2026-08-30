import { NextResponse } from "next/server";
import { clearSupabaseSession, getSupabaseAccessToken } from "@/lib/auth/supabase";
import { integrationConfig } from "@/lib/config/env";

export async function POST() {
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
