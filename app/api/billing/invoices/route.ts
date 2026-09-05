import { requireApiUser } from "@/lib/auth/supabase";
import {
  assertAdmin,
  listPendingInvoices,
  markInvoicePaid,
} from "@/lib/billing/invoices";
import { SupabaseDataError } from "@/lib/data/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function jsonError(error: unknown) {
  if (error instanceof SupabaseDataError) {
    return Response.json({ error: error.message }, { status: error.status, headers: noStore });
  }
  console.error("Progy billing invoices route failed", error);
  return Response.json(
    { error: "No pudimos cargar las facturas." },
    { status: 500, headers: noStore },
  );
}

export async function GET() {
  try {
    const user = await requireApiUser();
    if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401, headers: noStore });
    await assertAdmin();
    return Response.json({ invoices: await listPendingInvoices() }, { headers: noStore });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user) return Response.json({ error: "Inicia sesión." }, { status: 401, headers: noStore });
    await assertAdmin();

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const invoiceId = String(body?.invoiceId || "").trim();
    const method = String(body?.method || "bank_transfer").trim();
    const reference = String(body?.reference || "").trim();
    if (!invoiceId) {
      return Response.json({ error: "Selecciona una factura válida." }, { status: 400, headers: noStore });
    }

    const invoice = await markInvoicePaid(invoiceId, user.id, method, reference);
    return Response.json({ invoice }, { headers: noStore });
  } catch (error) {
    return jsonError(error);
  }
}
