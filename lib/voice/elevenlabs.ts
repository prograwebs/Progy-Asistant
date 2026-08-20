import { integrationConfig, resolveElevenLabsVoiceId } from "../integrations";
import { isLibraryVoice, listElevenLabsVoices } from "./catalog";

export type VoiceServiceErrorCode =
  | "voice_not_configured"
  | "voice_not_available"
  | "voice_provider_auth"
  | "voice_provider_payment"
  | "voice_provider_restricted"
  | "voice_provider_rate_limited"
  | "voice_provider_invalid_request"
  | "voice_provider_unavailable";

export class VoiceServiceError extends Error {
  status: number;
  code: VoiceServiceErrorCode;

  constructor(message: string, status = 502, code: VoiceServiceErrorCode = "voice_provider_unavailable") {
    super(message);
    this.name = "VoiceServiceError";
    this.status = status;
    this.code = code;
  }
}

export async function resolveOnboardingVoiceId(requestedVoiceId?: string | null) {
  const voiceId = requestedVoiceId?.trim();
  if (!voiceId) {
    throw new VoiceServiceError("Elige una voz antes de probar a Progy.", 400, "voice_not_configured");
  }

  const voice = (await listElevenLabsVoices()).find((candidate) => candidate.id === voiceId);
  if (!voice || isLibraryVoice(voice)) {
    throw new VoiceServiceError("La voz elegida ya no está disponible para esta prueba. Selecciona otra voz.", 400, "voice_not_available");
  }

  return voice.id;
}

type ProviderErrorDetail = {
  status?: string;
  message?: string;
};

type ProviderErrorPayload = {
  detail?: ProviderErrorDetail | string;
  error?: ProviderErrorDetail | string;
  message?: string;
};

function safeProviderError(raw: string) {
  try {
    const payload = JSON.parse(raw) as ProviderErrorPayload;
    const detail = typeof payload.detail === "object" && payload.detail
      ? payload.detail
      : typeof payload.error === "object" && payload.error
        ? payload.error
        : null;
    const providerCode = String(detail?.status || "").trim().slice(0, 80);
    const message = String(
      detail?.message
      || (typeof payload.detail === "string" ? payload.detail : "")
      || (typeof payload.error === "string" ? payload.error : "")
      || payload.message
      || "",
    ).trim().slice(0, 220);
    return { providerCode, message };
  } catch {
    return { providerCode: "", message: "" };
  }
}

function normalizedProviderError(raw: string) {
  const safe = safeProviderError(raw);
  return `${safe.providerCode} ${safe.message}`.toLowerCase();
}

export async function resolveAllowedVoiceId(requestedVoiceId?: string | null) {
  const voiceId = requestedVoiceId?.trim() || await resolveElevenLabsVoiceId();
  if (!voiceId) {
    throw new VoiceServiceError("Elige una voz antes de probar a Progy.", 400, "voice_not_configured");
  }

  const voices = await listElevenLabsVoices();
  if (!voices.some((voice) => voice.id === voiceId)) {
    throw new VoiceServiceError("La voz elegida ya no está disponible. Selecciona otra voz.", 400, "voice_not_available");
  }
  return voiceId;
}

function synthesisBody(options: {
  text: string;
  modelId: string;
  speed: number;
  expression: number;
  compatibilityMode?: boolean;
}) {
  const stability = 0.72 - options.expression * 0.3;

  if (options.compatibilityMode) {
    return {
      text: options.text,
      model_id: "eleven_flash_v2_5",
      voice_settings: {
        stability,
        similarity_boost: 0.75,
        speed: options.speed,
      },
    };
  }

  return {
    text: options.text,
    model_id: options.modelId,
    language_code: "es",
    voice_settings: {
      stability,
      similarity_boost: 0.75,
      style: options.expression * 0.25,
      speed: options.speed,
      use_speaker_boost: false,
    },
  };
}

async function requestSpeech(options: {
  key: string;
  voiceId: string;
  body: Record<string, unknown>;
}) {
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(options.voiceId)}?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: {
        "xi-api-key": options.key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(options.body),
      cache: "no-store",
    },
  );
}

function shouldRetryWithCompatibility(status: number, normalized: string) {
  if (status !== 400 && status !== 422) return false;
  if (/quota|credit|payment|unusual activity|abuse|voice.*not.*found|voice_not_found|permission|forbidden/.test(normalized)) return false;
  return true;
}

function throwSynthesisError(response: Response, raw: string, attempt: "primary" | "compatibility"): never {
  const normalized = normalizedProviderError(raw);
  const safe = safeProviderError(raw);
  const requestId = response.headers.get("request-id") || response.headers.get("x-request-id") || "";

  console.error("Progy ElevenLabs synthesis error", {
    status: response.status,
    providerCode: safe.providerCode || undefined,
    providerMessage: safe.message || undefined,
    requestId: requestId || undefined,
    attempt,
  });

  if (response.status === 401) {
    throw new VoiceServiceError(
      "La voz de Progy necesita ser reconfigurada por el administrador.",
      503,
      "voice_provider_auth",
    );
  }
  if (response.status === 402 || /quota|credit|payment|required|billing/.test(normalized)) {
    throw new VoiceServiceError(
      "La generación de voz no tiene saldo disponible en este momento.",
      503,
      "voice_provider_payment",
    );
  }
  if (response.status === 403 || /unusual activity|abuse|proxy|vpn|forbidden|permission/.test(normalized)) {
    throw new VoiceServiceError(
      "La generación de voz está restringida temporalmente en el entorno de producción.",
      503,
      "voice_provider_restricted",
    );
  }
  if (response.status === 429 || /rate.?limit|too many|concurrency/.test(normalized)) {
    throw new VoiceServiceError(
      "La voz está recibiendo muchas solicitudes. Inténtalo nuevamente en un momento.",
      429,
      "voice_provider_rate_limited",
    );
  }
  if (response.status === 404 || /voice.*not.*found|voice_not_found/.test(normalized)) {
    throw new VoiceServiceError(
      "La voz elegida ya no está disponible. Selecciona otra voz.",
      400,
      "voice_not_available",
    );
  }
  if (response.status === 400 || response.status === 422) {
    throw new VoiceServiceError(
      "La configuración de voz no pudo procesarse. Inténtalo nuevamente.",
      502,
      "voice_provider_invalid_request",
    );
  }
  throw new VoiceServiceError(
    "No pudimos generar la voz de Progy en este momento.",
    502,
    "voice_provider_unavailable",
  );
}

export async function synthesizeSpeech(options: {
  text: string;
  voiceId?: string | null;
  speed?: number;
  expression?: number;
}) {
  const { elevenLabsKey } = integrationConfig();
  if (!elevenLabsKey) {
    throw new VoiceServiceError(
      "La voz de Progy todavía no está disponible.",
      503,
      "voice_not_configured",
    );
  }

  const voiceId = await resolveAllowedVoiceId(options.voiceId);
  const text = options.text.trim().slice(0, 700);
  if (!text) throw new VoiceServiceError("No hay texto para convertir en voz.", 400, "voice_provider_invalid_request");

  const speedSlider = Math.max(25, Math.min(75, Number(options.speed ?? 50)));
  const expressionSlider = Math.max(20, Math.min(80, Number(options.expression ?? 55)));
  const speed = 0.9 + ((speedSlider - 25) / 50) * 0.2;
  const expression = (expressionSlider - 20) / 60;
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_flash_v2_5";

  let response = await requestSpeech({
    key: elevenLabsKey,
    voiceId,
    body: synthesisBody({ text, modelId, speed, expression }),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    const normalized = normalizedProviderError(raw);

    if (shouldRetryWithCompatibility(response.status, normalized)) {
      console.warn("Progy ElevenLabs synthesis compatibility retry", {
        status: response.status,
        providerCode: safeProviderError(raw).providerCode || undefined,
      });
      response = await requestSpeech({
        key: elevenLabsKey,
        voiceId,
        body: synthesisBody({ text, modelId, speed, expression, compatibilityMode: true }),
      });
      if (!response.ok) {
        const compatibilityRaw = await response.text().catch(() => "");
        throwSynthesisError(response, compatibilityRaw, "compatibility");
      }
    } else {
      throwSynthesisError(response, raw, "primary");
    }
  }

  return {
    audio: await response.arrayBuffer(),
    contentType: response.headers.get("Content-Type") || "audio/mpeg",
    voiceId,
    characters: text.length,
  };
}
