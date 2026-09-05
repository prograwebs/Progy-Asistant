import { requireApiUser } from "@/lib/server/auth/supabase";
import { exceedsPayloadLimit, MAX_PAYLOAD_MB } from "@/lib/shared/config/limits";
import { synthesizeSpeech, VoiceServiceError } from "@/lib/server/voice/elevenlabs";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para probar una voz." }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      text?: string;
      voiceId?: string;
      speed?: number;
      expression?: number;
      mode?: "sample" | "greeting";
    };

    const text = body.mode === "sample"
      ? "Hola, soy Progy. Estoy aquí para atenderte con claridad y amabilidad."
      : (body.text || "Hola, soy Progy. Estoy listo para atender a tus clientes y ayudar a tu negocio.").slice(0, 240);

    const speech = await synthesizeSpeech({
      text,
      voiceId: body.voiceId,
      speed: body.speed,
      expression: body.expression,
    });
    if (exceedsPayloadLimit(speech.audio.byteLength)) {
      throw new VoiceServiceError(`La muestra de voz supera el límite de ${MAX_PAYLOAD_MB} MB.`, 413);
    }

    return new Response(speech.audio, {
      status: 200,
      headers: {
        "Content-Type": speech.contentType,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Progy-Characters": String(speech.characters),
      },
    });
  } catch (error) {
    if (error instanceof VoiceServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Progy voice preview error", error);
    return Response.json({ error: "No pudimos reproducir esta voz en este momento." }, { status: 502 });
  }
}
