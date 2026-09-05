import { timingSafeEqual } from "node:crypto";
import { runBillingCycle } from "@/lib/server/billing/invoices";
import { serverConfig } from "@/lib/server/config/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function secretsMatch(received: string, expected: string) {
  if (!received || !expected) return false;
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

export async function POST(request: Request) {
  const expected = serverConfig().billingCronSecret;
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const received = request.headers.get("x-billing-cron-secret") || bearer;
  if (!secretsMatch(received, expected)) {
    return Response.json({ error: "No autorizado." }, { status: 401, headers: noStore });
  }

  try {
    return Response.json(await runBillingCycle(), { headers: noStore });
  } catch (error) {
    console.error("Progy billing cycle route failed", error);
    return Response.json(
      { error: "No pudimos ejecutar el ciclo de billing." },
      { status: 500, headers: noStore },
    );
  }
}
