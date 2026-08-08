import { ElevenLabsVoiceError, listElevenLabsVoices, requireApiUser } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para elegir una voz." }, { status: 401 });

  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    const voices = await listElevenLabsVoices(refresh);
    if (!voices.length) {
      return Response.json({ error: "Tu cuenta de ElevenLabs no devolvió voces disponibles para este plan." }, { status: 503 });
    }
    return Response.json({ voices }, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (error) {
    if (error instanceof ElevenLabsVoiceError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "No pudimos cargar las voces disponibles." }, { status: 502 });
  }
}
