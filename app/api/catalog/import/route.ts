import { requireApiUser } from "@/lib/server/auth/supabase";
import { extractCatalogFromFile, OpenAIServiceError } from "@/lib/server/ai/openai";
import { catalogImportAllowance } from "@/lib/server/billing/entitlements";
import { exceedsPayloadLimit, MAX_PAYLOAD_MB } from "@/lib/shared/config/limits";
import { loadAgentContext, SupabaseDataError, supabaseDataRequest } from "@/lib/server/data/supabase";
import { recordCatalogImport, recordOpenAIUsage } from "@/lib/server/usage/ledger";

export const dynamic = "force-dynamic";

type UnknownRow = Record<string, unknown>;
type ImportItem = {
  kind?: "product" | "service";
  name?: string;
  description?: string | null;
  price?: number | null;
  durationMinutes?: number | null;
  isAvailable?: boolean;
};

function jsonError(error: unknown) {
  if (error instanceof OpenAIServiceError || error instanceof SupabaseDataError) {
    return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
  console.error("Progy catalog import error", error);
  return Response.json({ error: "No pudimos procesar el catálogo en este momento." }, { status: 500, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

function cleanText(value: unknown, max = 300) {
  return String(value || "").trim().slice(0, max);
}

function firstDayOfMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function allowanceFor(businessId: string, currentCatalogItems: number) {
  const id = encodeURIComponent(businessId);
  const monthStart = encodeURIComponent(firstDayOfMonthIso());
  const [plans, importRows] = await Promise.all([
    supabaseDataRequest<UnknownRow[]>(`business_plans?business_id=eq.${id}&select=plan_code,status`),
    supabaseDataRequest<UnknownRow[]>(`usage_ledger?business_id=eq.${id}&kind=eq.catalog_import&created_at=gte.${monthStart}&select=id&limit=200`),
  ]);

  return catalogImportAllowance({
    planCode: String(plans[0]?.plan_code || "trial"),
    importsThisMonth: importRows.length,
    currentCatalogItems,
  });
}

async function analyze(request: Request, userId: string) {
  const form = await request.formData();
  const businessId = cleanText(form.get("businessId"), 100);
  const file = form.get("file");

  if (!businessId) throw new SupabaseDataError("Selecciona un negocio antes de importar un catálogo.", 400);
  if (!(file instanceof File) || file.size === 0) throw new OpenAIServiceError("Selecciona un PDF o documento para analizar.", 400);
  if (exceedsPayloadLimit(file.size)) {
    throw new OpenAIServiceError(`El archivo supera el límite de ${MAX_PAYLOAD_MB} MB. Divide el catálogo en un archivo más pequeño.`, 413);
  }

  const allowedTypes = new Set([
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);
  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (!allowedTypes.has(file.type) && !["pdf", "txt", "csv", "docx"].includes(extension)) {
    throw new OpenAIServiceError("Por ahora Progy acepta PDF, DOCX, TXT o CSV para importar el catálogo.", 415);
  }

  const context = await loadAgentContext(businessId);
  const allowance = await allowanceFor(businessId, context.catalog.length);
  if (!allowance.allowed) {
    return Response.json({
      error: allowance.itemsRemaining <= 0
        ? "Tu catálogo alcanzó el límite del plan actual."
        : "Ya utilizaste las importaciones de documentos incluidas en tu plan este mes.",
      code: "catalog_import_limit_reached",
      upgradeRequired: true,
      limits: {
        importsRemaining: allowance.importsRemaining,
        itemsRemaining: allowance.itemsRemaining,
      },
    }, { status: 402, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  const extracted = await extractCatalogFromFile({
    businessType: String(context.business.category_code || "other"),
    file,
    safetyIdentifier: `progy-${userId}`,
  });
  await recordOpenAIUsage(businessId, extracted.usage);

  const items = extracted.result.items.slice(0, allowance.itemsRemaining).map((item, index) => ({
    id: `import-${index + 1}`,
    kind: item.kind,
    name: cleanText(item.name, 160),
    description: item.description ? cleanText(item.description, 600) : null,
    price: typeof item.price === "number" && Number.isFinite(item.price) ? item.price : null,
    durationMinutes: typeof item.durationMinutes === "number" && Number.isFinite(item.durationMinutes) ? Math.max(1, Math.round(item.durationMinutes)) : null,
    category: item.category ? cleanText(item.category, 120) : null,
    needsReview: Boolean(item.needsReview || item.price === null),
    reviewReason: item.reviewReason ? cleanText(item.reviewReason, 280) : item.price === null ? "Precio no identificado con claridad." : null,
    selected: !item.needsReview && item.price !== null,
  })).filter((item) => item.name);

  if (!items.length) {
    throw new OpenAIServiceError("No encontramos productos o servicios claros en ese documento.", 422);
  }

  return Response.json({
    preview: true,
    fileName: file.name,
    items,
    warnings: extracted.result.warnings,
    limits: {
      importsRemaining: allowance.importsRemaining,
      itemsRemaining: allowance.itemsRemaining,
    },
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

async function confirm(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) throw new SupabaseDataError("La solicitud no es válida.", 400);

  const businessId = cleanText(body.businessId, 100);
  const requested = Array.isArray(body.items) ? body.items as ImportItem[] : [];
  if (!businessId) throw new SupabaseDataError("Selecciona un negocio antes de guardar el catálogo.", 400);
  if (!requested.length) throw new SupabaseDataError("Selecciona al menos un producto o servicio para importar.", 400);

  const context = await loadAgentContext(businessId);
  const allowance = await allowanceFor(businessId, context.catalog.length);
  if (!allowance.allowed) {
    return Response.json({
      error: "El plan actual no permite guardar otra importación de catálogo en este momento.",
      code: "catalog_import_limit_reached",
      upgradeRequired: true,
    }, { status: 402, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  const items = requested.slice(0, allowance.itemsRemaining).map((item) => {
    const kind = item.kind === "service" ? "service" : "product";
    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new SupabaseDataError(`Revisa el precio de ${cleanText(item.name, 120) || "uno de los elementos"}.`, 400);
    }
    const name = cleanText(item.name, 160);
    if (!name) throw new SupabaseDataError("Todos los elementos deben tener un nombre.", 400);

    return {
      business_id: businessId,
      kind,
      name,
      description: item.description ? cleanText(item.description, 600) : null,
      price: Number(price.toFixed(2)),
      duration_minutes: kind === "service" && item.durationMinutes ? Math.max(1, Math.round(Number(item.durationMinutes))) : null,
      stock_quantity: 0,
      track_stock: false,
      is_available: item.isAvailable !== false,
    };
  });

  if (!items.length) throw new SupabaseDataError("No hay elementos válidos para importar.", 400);

  const rows = await supabaseDataRequest<UnknownRow[]>("catalog_items", {
    method: "POST",
    body: JSON.stringify(items),
    prefer: "return=representation",
  });
  await recordCatalogImport(businessId, rows.length || items.length);

  return Response.json({
    imported: rows.length,
    items: rows,
    limits: {
      importsRemaining: Math.max(0, allowance.importsRemaining - 1),
      itemsRemaining: Math.max(0, allowance.itemsRemaining - rows.length),
    },
  }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Inicia sesión para importar tu catálogo." }, { status: 401 });

  try {
    const contentType = request.headers.get("content-type") || "";
    return contentType.includes("multipart/form-data")
      ? await analyze(request, user.id)
      : await confirm(request);
  } catch (error) {
    return jsonError(error);
  }
}
