import { integrationConfig, listElevenLabsVoices, requireApiUser, resolveElevenLabsVoiceId } from "../../../../lib/integrations";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para probar una voz." }, { status: 401 });

  const { elevenLabsKey } = integrationConfig();
  if (!elevenLabsKey) return Response.json({ error: "ElevenLabs todavía no está configurado." }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    voiceId?: string;
    speed?: number;
    expression?: number;
    mode?: "sample" | "greeting";
  };
  const voiceId = body.voiceId || await resolveElevenLabsVoiceId();
  if (!voiceId) return Response.json({ error: "No encontramos una voz disponible en tu cuenta de ElevenLabs." }, { status: 503 });

  const voices = await listElevenLabsVoices();
  if (!voices.some((voice) => voice.id === voiceId)) {
    return Response.json({ error: "Elige una de las voces disponibles en Progy." }, { status: 400 });
  }

  const text = body.mode === "sample"
    ? "Hola, soy Progy. Estoy aquí para atenderte con claridad y amabilidad."
    : (body.text || "Hola, soy Progy. Estoy listo para atender a tus clientes y ayudar a tu negocio.").slice(0, 240);
  const speedSlider = Math.max(25, Math.min(75, Number(body.speed ?? 50)));
  const expressionSlider = Math.max(20, Math.min(80, Number(body.expression ?? 55)));
  const speed = 0.9 + ((speedSlider - 25) / 50) * 0.2;
  const expression = (expressionSlider - 20) / 60;
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`, {
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
  });
  if (!response.ok) {
    const raw = await response.text();
    const normalized = raw.toLowerCase();
    const message = response.status === 401 || response.status === 403
      ? "La conexión de voz no tiene permiso para generar audio. Revisa los permisos de la clave de ElevenLabs."
      : response.status === 429 || /quota|credit|limit/.test(normalized)
        ? "El plan de voz no tiene créditos suficientes para generar este saludo. Las muestras disponibles todavía pueden escucharse sin generar audio nuevo."
        : response.status === 404 || /voice.*not.*found|voice_not_found/.test(normalized)
          ? "Esa voz ya no está disponible en tu plan. Actualiza la lista y elige otra voz."
          : /model/.test(normalized)
            ? "El modelo de voz no está disponible en este plan."
            : "No pudimos generar el saludo con esa voz. Actualiza la lista y prueba otra opción.";
    return Response.json({ error: message }, { status: response.status });
  }
  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": body.mode === "sample" ? "private, max-age=86400" : "no-store",
      "X-Progy-Characters": String(text.length),
    },
  });
}
