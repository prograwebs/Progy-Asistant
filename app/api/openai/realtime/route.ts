import { requireApiUser, integrationConfig } from "../../../../lib/integrations";
import { buildAgentInstructions, loadAgentContext } from "../../../../lib/supabase-data";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para probar a Progy." }, { status: 401 });

  const { openAiKey } = integrationConfig();
  if (!openAiKey) return Response.json({ error: "OpenAI todavía no está configurado." }, { status: 503 });

  const sdp = await request.text();
  if (!sdp) return Response.json({ error: "La sesión de audio no es válida." }, { status: 400 });

  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) return Response.json({ error: "Primero crea o selecciona tu negocio." }, { status: 400 });
  let instructions: string;
  try {
    instructions = buildAgentInstructions(await loadAgentContext(businessId));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No pudimos preparar el conocimiento de tu negocio." }, { status: 400 });
  }

  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", JSON.stringify({
    type: "realtime",
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1",
    instructions,
    audio: { output: { voice: process.env.OPENAI_REALTIME_VOICE || "marin" } },
  }));

  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "OpenAI-Safety-Identifier": `progy-${user.id}`,
    },
    body: form,
  });
  const responseBody = await response.text();
  return new Response(responseBody, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") || "application/sdp" },
  });
}
