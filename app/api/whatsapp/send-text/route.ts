import { canManageBusiness, getWhatsAppConnection } from "@/lib/whatsaap/store";
import { requireApiUser } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  process.env.META_GRAPH_VERSION?.trim() || "v25.0";

type MetaSendResponse = {
  messages?: Array<{
    id?: string;
  }>;
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
      {
        error:
          "Inicia sesión para enviar el mensaje de prueba.",
      },
      { status: 401 },
    );
  }

  const body = await request
    .json()
    .catch(() => null) as
    | {
        businessId?: string;
        to?: string;
        message?: string;
      }
    | null;

  if (!body) {
    return Response.json(
      {
        error:
          "La solicitud no es válida.",
      },
      { status: 400 },
    );
  }

  const businessId =
    String(body.businessId || "").trim();

  const to =
    normalizePhone(body.to);

  const message =
    String(body.message || "")
      .trim()
      .slice(0, 1000);

  if (!businessId) {
    return Response.json(
      {
        error:
          "No pudimos identificar el negocio.",
      },
      { status: 400 },
    );
  }

  const allowed =
    await canManageBusiness(
      user.id,
      businessId,
    );

  if (!allowed) {
    return Response.json(
      {
        error:
          "No tienes permiso para utilizar este negocio.",
      },
      { status: 403 },
    );
  }

  if (
    !to ||
    to.length < 8 ||
    to.length > 15
  ) {
    return Response.json(
      {
        error:
          "Escribe el número con código de país. Ejemplo: 593999999999.",
      },
      { status: 400 },
    );
  }

  if (!message) {
    return Response.json(
      {
        error:
          "Escribe el mensaje que quieres enviar.",
      },
      { status: 400 },
    );
  }

  const connection =
    await getWhatsAppConnection(
      businessId,
    );

  if (
    !connection ||
    !connection.phone_number_id ||
    !connection.access_token
  ) {
    return Response.json(
      {
        error:
          "Conecta primero el WhatsApp del negocio.",
      },
      { status: 409 },
    );
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${connection.phone_number_id}/messages`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${connection.access_token}`,

          "Content-Type":
            "application/json",
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
      (await response
        .json()
        .catch(() => ({}))) as MetaSendResponse;

    if (!response.ok) {
      console.error(
        "Progy WhatsApp message failed",
        {
          status: response.status,
          code: result.error?.code,
          subcode:
            result.error?.error_subcode,
          message:
            result.error?.message,
        },
      );

      return Response.json(
        {
          error:
            result.error?.message ||
            "WhatsApp no pudo enviar el mensaje.",
        },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,

      messageId:
        result.messages?.[0]?.id ||
        null,
    });
  } catch (error) {
    console.error(
      "Progy WhatsApp message exception",
      error,
    );

    return Response.json(
      {
        error:
          "No pudimos enviar el mensaje de WhatsApp.",
      },
      { status: 502 },
    );
  }
}