import { serverConfig } from "@/lib/server/config/env";

type ElevenLabsVoice = {
  voice_id?: string;
  name?: string;
  category?: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  sharing?: {
    public_owner_id?: string;
    public_voice_id?: string;
  };
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
  providerCategory?: string;
  availableForTiers?: string[];
  sharedVoice?: boolean;
};

const localPreviewVoices: ProgyVoice[] = [
  { id: "kdmDKE6EkgrWrrykO9Qt", name: "Alexandra", description: "Joven, natural y conversacional", previewUrl: null, labels: { gender: "female", use_case: "conversational" }, recommended: true },
  { id: "OYTbf65OHHFELVut7v2H", name: "Hope", description: "Cálida, clara y positiva", previewUrl: null, labels: { gender: "female", use_case: "customer_service" }, recommended: true },
  { id: "1SM7GgM6IMuvQlz2BwM3", name: "Mark", description: "Relajado, cercano y profesional", previewUrl: null, labels: { gender: "male", use_case: "conversational" }, recommended: true },
  { id: "56AoDkrOh6qfVPDXZ7Pt", name: "Cassidy", description: "Enérgica y expresiva", previewUrl: null, labels: { gender: "female", use_case: "conversational" }, recommended: true },
];

let discoveredVoices: Promise<ProgyVoice[]> | null = null;

export class ElevenLabsVoiceError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "ElevenLabsVoiceError";
    this.status = status;
  }
}

function voiceScore(voice: ElevenLabsVoice) {
  const searchable = [voice.name, voice.category, ...Object.entries(voice.labels ?? {}).flat()]
    .join(" ")
    .toLowerCase();
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
    providerCategory: voice.category?.trim().toLowerCase(),
    availableForTiers: voice.available_for_tiers,
    sharedVoice: Boolean(voice.sharing?.public_owner_id || voice.sharing?.public_voice_id),
  };
}

export function isLibraryVoice(voice: ProgyVoice) {
  const categoryIsLibrary = /library/.test(voice.providerCategory ?? "");
  const freeTierAvailable = voice.availableForTiers?.some((tier) => /free|trial/i.test(tier));
  const tierRestricted = Array.isArray(voice.availableForTiers) && voice.availableForTiers.length > 0 && !freeTierAvailable;
  return Boolean(voice.sharedVoice) || (categoryIsLibrary && !freeTierAvailable) || tierRestricted;
}

async function requestVoices(key: string, endpoint: string) {
  const response = await fetch(endpoint, {
    headers: { "xi-api-key": key, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    const detail = payload?.detail as Record<string, unknown> | undefined;
    const providerMessage = String(detail?.message ?? payload?.message ?? "").toLowerCase();
    if (response.status === 401 || response.status === 403) {
      throw new ElevenLabsVoiceError("La conexión de voz no tiene permiso para consultar las voces.", 503);
    }
    if (response.status === 429 || /quota|credit|limit/.test(providerMessage)) {
      throw new ElevenLabsVoiceError("El plan de voz alcanzó temporalmente su límite.", 429);
    }
    throw new ElevenLabsVoiceError("No pudimos consultar las voces disponibles.", 502);
  }
  const payload = (await response.json()) as { voices?: ElevenLabsVoice[] };
  return payload.voices ?? [];
}

export async function listElevenLabsVoices(refresh = false): Promise<ProgyVoice[]> {
  const { elevenLabsKey } = serverConfig();
  if (!elevenLabsKey) return process.env.NODE_ENV !== "production" ? localPreviewVoices : [];

  if (refresh) discoveredVoices = null;
  if (!discoveredVoices) {
    discoveredVoices = (async () => {
      const endpoints = [
        "https://api.elevenlabs.io/v1/voices?show_legacy=true",
        "https://api.elevenlabs.io/v2/voices?page_size=100&include_total_count=false",
      ];
      let voices: ElevenLabsVoice[] = [];
      const failures: ElevenLabsVoiceError[] = [];
      for (const endpoint of endpoints) {
        try {
          const candidate = await requestVoices(elevenLabsKey, endpoint);
          if (candidate.length) {
            voices = candidate;
            break;
          }
        } catch (error) {
          if (error instanceof ElevenLabsVoiceError) failures.push(error);
        }
      }
      if (!voices.length && failures.length) {
        throw failures.find((error) => error.status === 503)
          ?? failures.find((error) => error.status === 429)
          ?? failures[failures.length - 1];
      }
      return voices
        .map(toProgyVoice)
        .filter((voice): voice is ProgyVoice => Boolean(voice))
        .sort((a, b) => {
          const originalA = voices.find((voice) => voice.voice_id === a.id);
          const originalB = voices.find((voice) => voice.voice_id === b.id);
          return voiceScore(originalB ?? {}) - voiceScore(originalA ?? {});
        })
        .slice(0, 100);
    })().catch((error) => {
      discoveredVoices = null;
      throw error;
    });
  }
  return discoveredVoices;
}

export async function resolveElevenLabsVoiceId() {
  const { elevenLabsKey, elevenLabsVoiceId } = serverConfig();
  if (elevenLabsVoiceId) return elevenLabsVoiceId;
  if (!elevenLabsKey) return "";
  return (await listElevenLabsVoices())[0]?.id ?? "";
}
