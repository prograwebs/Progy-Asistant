import { integrationConfig, listElevenLabsVoices, resolveElevenLabsVoiceId } from "../integrations";

export class VoiceServiceError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "VoiceServiceError";
    this.status = status;
  }
}

export async function resolveAllowedVoiceId(requestedVoiceId?: string | null) {
  const voiceId = requestedVoiceId?.trim() || await resolveElevenLabsVoiceId();
  if (!voiceId) throw new VoiceServiceError("Elige una voz antes de probar a Progy.", 400);

  const voices = await listElevenLabsVoices();
  if (!voices.some((voice) => voice.id === voiceId)) {
    throw new VoiceServiceError("La voz elegida ya no está disponible. Selecciona otra voz.", 400);
  }
  return voiceId;
}

export async function synthesizeSpeech(options: {
  text: string;
  voiceId?: string | null;
  speed?: number;
  expression?: number;
}) {
  const { elevenLabsKey } = integrationConfig();
  if (!elevenLabsKey) throw new VoiceServiceError("La voz de Progy todavía no está disponible.", 503);

  const voiceId = await resolveAllowedVoiceId(options.voiceId);
  const text = options.text.trim().slice(0, 700);
  if (!text) throw new VoiceServiceError("No hay texto para convertir en voz.", 400);

  const speedSlider = Math.max(25, Math.min(75, Number(options.speed ?? 50)));
  const expressionSlider = Math.max(20, Math.min(80, Number(options.expression ?? 55)));
  const speed = 0.9 + ((speedSlider - 25) / 50) * 0.2;
  const expression = (expressionSlider - 20) / 60;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5",
        language_code: "es",
        voice_settings: {
          stability: 0.72 - expression * 0.3,
          similarity_boost: 0.75,
          style: expression * 0.25,
          speed,
          use_speaker_boost: false,
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    const normalized = raw.toLowerCase();
    console.error("Progy ElevenLabs synthesis error", { status: response.status, body: raw.slice(0, 400) });

    if (response.status === 401 || response.status === 403) {
      throw new VoiceServiceError("La voz de Progy necesita ser reconfigurada por el administrador.", 503);
    }
    if (response.status === 429 || /quota|credit|limit/.test(normalized)) {
      throw new VoiceServiceError("La cuota de voz se agotó temporalmente. Inténtalo más tarde.", 429);
    }
    if (response.status === 404 || /voice.*not.*found|voice_not_found/.test(normalized)) {
      throw new VoiceServiceError("La voz elegida ya no está disponible. Selecciona otra voz.", 400);
    }
    throw new VoiceServiceError("No pudimos generar la voz de Progy en este momento.", 502);
  }

  return {
    audio: await response.arrayBuffer(),
    contentType: response.headers.get("Content-Type") || "audio/mpeg",
    voiceId,
    characters: text.length,
  };
}
