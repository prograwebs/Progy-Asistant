import { cookies } from "next/headers";

const ACCESS_COOKIE = "progy_access_token";
const REFRESH_COOKIE = "progy_refresh_token";
const DEFAULT_PROGY_ORIGIN = "https://progy-negocios.haroldvegahv5.chatgpt.site";

export type ProgyUser = {
  id: string;
  email: string;
  name: string;
};

export function integrationConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "",
    // Supabase now calls this the publishable key. Keep the legacy name as a
    // fallback so older Progy installations continue to work unchanged.
    supabaseAnonKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      "",
    openAiKey: process.env.OPENAI_API_KEY ?? "",
    elevenLabsKey: process.env.ELEVENLABS_API_KEY ?? "",
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
  };
}

export function progyOrigin() {
  const configured = process.env.PROGY_APP_URL?.trim().replace(/\/$/, "");
  if (!configured) return DEFAULT_PROGY_ORIGIN;

  try {
    const url = new URL(configured);
    return url.origin;
  } catch {
    return DEFAULT_PROGY_ORIGIN;
  }
}

export function progyAuthCallbackUrl() {
  return `${progyOrigin()}/auth/callback`;
}

type ElevenLabsVoice = {
  voice_id?: string;
  name?: string;
  category?: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  permission_on_resource?: string;
  verified_languages?: Array<{
    language?: string;
    locale?: string;
    accent?: string;
    preview_url?: string;
  }>;
};

export type ProgyVoice = {
  id: string;
  name: string;
  description: string;
  previewUrl: string | null;
  labels: Record<string, string>;
  recommended: boolean;
};

const localPreviewVoices: ProgyVoice[] = [
  { id: "kdmDKE6EkgrWrrykO9Qt", name: "Alexandra", description: "Joven, natural y conversacional", previewUrl: null, labels: { gender: "female", use_case: "conversational" }, recommended: true },
  { id: "OYTbf65OHHFELVut7v2H", name: "Hope", description: "Cálida, clara y positiva", previewUrl: null, labels: { gender: "female", use_case: "customer_service" }, recommended: true },
  { id: "1SM7GgM6IMuvQlz2BwM3", name: "Mark", description: "Relajado, cercano y profesional", previewUrl: null, labels: { gender: "male", use_case: "conversational" }, recommended: true },
  { id: "56AoDkrOh6qfVPDXZ7Pt", name: "Cassidy", description: "Enérgica y expresiva", previewUrl: null, labels: { gender: "female", use_case: "conversational" }, recommended: true },
];

let discoveredElevenLabsVoices: Promise<ProgyVoice[]> | null = null;

export class ElevenLabsVoiceError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "ElevenLabsVoiceError";
    this.status = status;
  }
}

function voiceScore(voice: ElevenLabsVoice) {
  const searchable = [
    voice.name,
    voice.category,
    ...Object.entries(voice.labels ?? {}).flat(),
  ].join(" ").toLowerCase();

  let score = 0;
  if (/spanish|espanol|español|latam|latin/.test(searchable)) score += 6;
  if (/female|mujer|warm|calida|cálida|friendly/.test(searchable)) score += 3;
  if (/premade|default/.test(searchable)) score += 1;
  return score;
}

function describeVoice(voice: ElevenLabsVoice) {
  if (voice.description?.trim()) return voice.description.trim().slice(0, 120);
  const labels = voice.labels ?? {};
  return [labels.gender, labels.accent, labels.use_case ?? labels.usecase]
    .filter(Boolean)
    .join(" · ") || "Voz natural para atención al cliente";
}

function toProgyVoice(voice: ElevenLabsVoice): ProgyVoice | null {
  if (!voice.voice_id) return null;
  const spanishPreview = voice.verified_languages?.find((entry) =>
    /^(es|spa)/i.test(entry.language ?? entry.locale ?? ""),
  )?.preview_url;
  return {
    id: voice.voice_id,
    name: voice.name?.trim() || "Voz sin nombre",
    description: describeVoice(voice),
    previewUrl: spanishPreview || voice.preview_url || null,
    labels: voice.labels ?? {},
    recommended: voiceScore(voice) >= 6,
  };
}

async function requestElevenLabsVoices(key: string, endpoint: string) {
  const response = await fetch(endpoint, {
    headers: { "xi-api-key": key, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    const detail = payload?.detail as Record<string, unknown> | undefined;
    const providerMessage = String(detail?.message ?? payload?.message ?? "").toLowerCase();
    if (response.status === 401 || response.status === 403) {
      throw new ElevenLabsVoiceError("La conexión de voz no tiene permiso para consultar las voces. Revisa los permisos de la clave de ElevenLabs.", 503);
    }
    if (response.status === 429 || /quota|credit|limit/.test(providerMessage)) {
      throw new ElevenLabsVoiceError("El plan de voz alcanzó temporalmente su límite. Inténtalo nuevamente cuando haya créditos disponibles.", 429);
    }
    throw new ElevenLabsVoiceError("No pudimos consultar las voces permitidas por tu plan de ElevenLabs.", 502);
  }
  const payload = (await response.json()) as { voices?: ElevenLabsVoice[] };
  return payload.voices ?? [];
}

export async function listElevenLabsVoices(refresh = false): Promise<ProgyVoice[]> {
  const { elevenLabsKey } = integrationConfig();
  if (!elevenLabsKey) {
    return process.env.NODE_ENV !== "production" ? localPreviewVoices : [];
  }

  if (refresh) discoveredElevenLabsVoices = null;
  if (!discoveredElevenLabsVoices) {
    discoveredElevenLabsVoices = (async () => {
      // Kely used the v1 catalogue, which includes the premade voices exposed to
      // older and free accounts. Query it first and only use the newer search
      // endpoint as a fallback. Restricted keys can be allowed on one endpoint
      // while returning 403 on the other, so a first failure must not stop the
      // catalogue from loading.
      const endpoints = [
        "https://api.elevenlabs.io/v1/voices?show_legacy=true",
        "https://api.elevenlabs.io/v2/voices?page_size=100&include_total_count=false",
      ];
      let voices: ElevenLabsVoice[] = [];
      const failures: ElevenLabsVoiceError[] = [];
      for (const endpoint of endpoints) {
        try {
          const candidate = await requestElevenLabsVoices(elevenLabsKey, endpoint);
          if (candidate.length) {
            voices = candidate;
            break;
          }
        } catch (error) {
          if (error instanceof ElevenLabsVoiceError) failures.push(error);
        }
      }
      if (!voices.length && failures.length) {
        const permissionFailure = failures.find((error) => error.status === 503);
        const quotaFailure = failures.find((error) => error.status === 429);
        throw permissionFailure ?? quotaFailure ?? failures[failures.length - 1];
      }
      const mapped = voices
        .map(toProgyVoice)
        .filter((voice): voice is ProgyVoice => Boolean(voice));
      mapped.sort((a, b) => {
        const originalA = voices.find((voice) => voice.voice_id === a.id);
        const originalB = voices.find((voice) => voice.voice_id === b.id);
        return voiceScore(originalB ?? {}) - voiceScore(originalA ?? {});
      });
      return mapped.slice(0, 100);
    })().catch((error) => {
      discoveredElevenLabsVoices = null;
      throw error;
    });
  }
  return discoveredElevenLabsVoices;
}

export async function resolveElevenLabsVoiceId() {
  const { elevenLabsKey, elevenLabsVoiceId } = integrationConfig();
  if (elevenLabsVoiceId) return elevenLabsVoiceId;
  if (!elevenLabsKey) return "";
  return (await listElevenLabsVoices())[0]?.id ?? "";
}

export function publicIntegrationStatus() {
  const config = integrationConfig();
  return {
    supabase: Boolean(config.supabaseUrl && config.supabaseAnonKey),
    openai: Boolean(config.openAiKey),
    elevenlabs: Boolean(config.elevenLabsKey),
    elevenlabsVoice: Boolean(config.elevenLabsVoiceId),
  };
}

export async function supabaseAuthRequest(
  path: string,
  init: RequestInit = {},
) {
  const { supabaseUrl, supabaseAnonKey } = integrationConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

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

  if (!refreshToken) {
    return false;
  }

  const { supabaseUrl, supabaseAnonKey } = integrationConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error(
      "Progy Supabase refresh error",
      response.status,
      await response.text().catch(() => ""),
    );

    return false;
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    return false;
  }

  await saveSupabaseSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || refreshToken,
    expires_in: payload.expires_in || 3600,
  });

  return true;
}

export async function getSupabaseUser(): Promise<ProgyUser | null> {
  const token = await getSupabaseAccessToken();
  const { supabaseUrl, supabaseAnonKey } = integrationConfig();
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

export function safeErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  const value = record.msg ?? record.message ?? record.error_description ?? record.error;
  return typeof value === "string" ? value : fallback;
}
