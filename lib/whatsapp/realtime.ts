import { createClient } from "@supabase/supabase-js";

function config() {
  const url = process.env.SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!url || !key) {
    throw new Error("Supabase server configuration missing");
  }

  return { url, key, isSecretKey: key.startsWith("sb_secret_") };
}

export function createWhatsAppRealtimeClient() {
  const { url, key, isSecretKey } = config();
  const headers: Record<string, string> = { apikey: key };

  if (!isSecretKey) {
    headers.Authorization = `Bearer ${key}`;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { headers },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });
}
