import { createHmac, timingSafeEqual } from "node:crypto";
import { getWhatsAppConfig } from "@/lib/server/whatsapp/config";
import { processWhatsAppWebhook } from "@/lib/server/whatsapp/inbound";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

function equalSecret(actual: string, expected: string) {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function validSignature(rawBody: string, signature: string, appSecret: string) {
  if (!signature.startsWith("sha256=") || !appSecret) return false;
  const digest = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return equalSecret(signature.slice("sha256=".length), digest);
}

export async function GET(request: Request) {
  const config = getWhatsAppConfig();
  if (!config.enabled || !config.verifyToken) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode") || "";
  const token = url.searchParams.get("hub.verify_token") || "";
  const challenge = url.searchParams.get("hub.challenge") || "";

  if (
    mode !== "subscribe" || !equalSecret(token, config.verifyToken) ||
    !challenge
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain", ...NO_STORE_HEADERS },
  });
}

export async function POST(request: Request) {
  const config = getWhatsAppConfig();
  if (!config.enabled || !config.appSecret) {
    return new Response("Not found", { status: 404 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";
  if (!validSignature(rawBody, signature, config.appSecret)) {
    return Response.json({ error: "Firma inválida." }, {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Payload inválido." }, {
      status: 400,
      headers: NO_STORE_HEADERS,
    });
  }

  try {
    const result = await processWhatsAppWebhook(payload);
    if (result.failed > 0) {
      return Response.json({ received: false, ...result }, {
        status: 500,
        headers: NO_STORE_HEADERS,
      });
    }

    return Response.json({ received: true, ...result }, {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error("Progy WhatsApp webhook failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ error: "No pudimos procesar el webhook." }, {
      status: 500,
      headers: NO_STORE_HEADERS,
    });
  }
}
