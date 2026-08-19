import { requireApiUser } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  process.env.META_GRAPH_VERSION?.trim() || "v25.0";

type MetaSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

function normalizePhone(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[^\d]/g, "");
}

export async function POST(request: Request) {
  const user = await requireApiUser();

  if (!user) {
    return Response.json(
      { error: "Inicia sesión para enviar el mensaje de prueba." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null) as
    | {
        to?: string;
        message?: string;
        phoneNumberId?: string;
      }
    | null;

  if (!body) {
    return Response.json(
      { error: "La solicitud no es válida." },
      { status: 400 },
    );
  }

  const to = normalizePhone(body.to);
  const message = String(body.message || "").trim().slice(0, 1000);

  const configuredPhoneNumberId =
    process.env.META_WHATSAPP_TEST_PHONE_NUMBER_ID?.trim() || "";

  const phoneNumberId =
    String(body.phoneNumberId || "").trim() ||
    configuredPhoneNumberId;

  const accessToken =
    process.env.META_WHATSAPP_TEST_TOKEN?.trim() || "";

  if (!to || to.length < 8 || to.length > 15) {
    return Response.json(
      {
        error:
          "Escribe el número de destino con código de país. Ejemplo: 593999999999.",
      },
      { status: 400 },
    );
  }

  if (!message) {
    return Response.json(
      { error: "Escribe el mensaje que quieres enviar." },
      { status: 400 },
    );
  }

  if (!phoneNumberId || !accessToken) {
    return Response.json(
      {
        error:
          "La mensajería de prueba todavía no está configurada en el servidor.",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
        cache: "no-store",
      },
    );

    const result =
      (await response.json().catch(() => ({}))) as MetaSendResponse;

    if (!response.ok) {
      console.error("Progy WhatsApp test message failed", {
        status: response.status,
        code: result.error?.code,
        subcode: result.error?.error_subcode,
        message: result.error?.message,
      });

      return Response.json(
        {
          error:
            "WhatsApp no pudo enviar el mensaje. Revisa la configuración del número de prueba.",
        },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      messageId: result.messages?.[0]?.id || null,
    });
  } catch (error) {
    console.error("Progy WhatsApp test message exception", error);

    return Response.json(
      { error: "No pudimos enviar el mensaje de WhatsApp." },
      { status: 502 },
    );
  }
}