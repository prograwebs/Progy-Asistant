import { requireApiUser } from "../../../lib/auth/supabase";
import { SupabaseDataError } from "../../../lib/supabase-data";
import { activateBusiness, createBusinessFromTemplate, getOnboardingSnapshot, markChannelSkipped, saveDemoForBusiness } from "../../../lib/onboarding/service";
import { listOnboardingTemplates } from "../../../lib/onboarding/templates";
import { cleanText, isRecord, validIdentifier } from "../../../lib/validation/input";

export const dynamic = "force-dynamic";

function jsonError(error: unknown) {
  if (error instanceof SupabaseDataError) return Response.json({ error: error.message }, { status: error.status });
  console.error("Progy onboarding request failed");
  return Response.json({ error: "No pudimos completar el onboarding en este momento." }, { status: 500 });
}

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const businessId = new URL(request.url).searchParams.get("businessId")?.trim();
  try {
    if (!businessId) return Response.json({ templates: listOnboardingTemplates().map(({ version, code, label, description, icon, capabilities, features, scenarios }) => ({ version, code, label, description, icon, capabilities, features, scenarios })) });
    return Response.json({ snapshot: await getOnboardingSnapshot(user.id, businessId) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401 });
  const body = await request.json().catch(() => null) as unknown;
  if (!isRecord(body) || typeof body.action !== "string") return Response.json({ error: "La solicitud no es válida." }, { status: 400 });

  try {
    if (body.action === "createBusiness") {
      const result = await createBusinessFromTemplate(user.id, {
        name: cleanText(body.name, 160),
        categoryCode: cleanText(body.categoryCode, 80),
        businessId: validIdentifier(body.businessId) ?? undefined,
      });
      return Response.json(result, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
    }

    const businessId = validIdentifier(body.businessId);
    if (!businessId) throw new SupabaseDataError("Selecciona un negocio antes de continuar.", 400);

    if (body.action === "saveDemo") {
      const onboarding = await saveDemoForBusiness(user.id, { businessId, voiceId: cleanText(body.voiceId, 160), scenarioId: cleanText(body.scenarioId, 100) });
      return Response.json({ onboarding });
    }
    if (body.action === "channelSkipped") {
      const onboarding = await markChannelSkipped(user.id, businessId);
      return Response.json({ onboarding });
    }
    if (body.action === "channelConnected") {
      throw new SupabaseDataError("El canal todavía no tiene una confirmación server-side disponible.", 503);
    }
    if (body.action === "activate") {
      const onboarding = await activateBusiness(user.id, businessId);
      return Response.json({ onboarding });
    }

    throw new SupabaseDataError("La acción solicitada no existe.", 400);
  } catch (error) { return jsonError(error); }
}
