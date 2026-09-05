import { ElevenLabsVoiceError, listElevenLabsVoices } from "@/lib/server/voice/catalog";
import { getSupabaseUser } from "@/lib/server/auth/supabase";
import { serverConfig } from "@/lib/server/config/env";
import { isLibraryVoice } from "@/lib/server/voice/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSupabaseUser();
  if (!user) return Response.json({ error: "Inicia sesión para elegir una voz." }, { status: 401 });

  try {
    const params = new URL(request.url).searchParams;
    const refresh = params.get("refresh") === "1";
    if (params.get("onboarding") === "1" && !serverConfig().elevenLabsKey) {
      return Response.json({ error: "ElevenLabs no está configurado en este entorno. La selección de voz estará disponible cuando se habilite el proveedor." }, { status: 503 });
    }
    const allVoices = await listElevenLabsVoices(refresh);
    const voices = params.get("onboarding") === "1" ? allVoices.filter((voice) => !isLibraryVoice(voice)) : allVoices;
    if (!voices.length) {
      return Response.json({ error: "Tu cuenta de ElevenLabs no tiene voces propias disponibles para generar audio con este plan." }, { status: 503 });
    }
    return Response.json({ voices }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ElevenLabsVoiceError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "No pudimos cargar las voces disponibles." }, { status: 502 });
  }
}
