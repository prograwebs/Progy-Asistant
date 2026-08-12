import { requireApiUser } from "../../../../lib/integrations";
import { synthesizeSpeech, VoiceServiceError } from "../../../../lib/voice/elevenlabs";

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

    return new Response(speech.audio, {
      status: 200,
      headers: {
        "Content-Type": speech.contentType,
        "Cache-Control": body.mode === "sample" ? "private, max-age=86400" : "no-store",
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
