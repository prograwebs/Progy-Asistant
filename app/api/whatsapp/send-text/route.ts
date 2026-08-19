import { requireApiUser } from "../../../../lib/integrations";
import {
  canManageBusiness,
  getWhatsAppConnection,
} from "../../../../lib/whatsapp/store";

export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  process.env.META_GRAPH_VERSION?.trim() || "v25.0";

type MetaSendResponse = {
  messaging_product?: string;

  contacts?: Array<{
    input?: string;
    wa_id?: string;
  }>;

  messages?: Array<{
    id?: string;
    message_status?: string;
  }>;

  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function normalizePhone(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[^\d]/g, "");
}

export async function POST(request: Request) {
  try {
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

    const body =
      (await request
        .json()
        .catch(() => null)) as
        | {
            businessId?: string;
            to?: string;
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

    if (!businessId) {
      return Response.json(
        {
          error:
            "No pudimos identificar el negocio.",
        },
        { status: 400 },
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

    /*
     * 1. Comprobar que el usuario
     * puede administrar este negocio.
     */
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

    /*
     * 2. Recuperar de Supabase:
     * - access token
     * - phone number id
     *
     * Nunca llegan desde el navegador.
     */
    const connection =
      await getWhatsAppConnection(
        businessId,
      );

    if (!connection) {
      return Response.json(
        {
          error:
            "No encontramos una conexión de WhatsApp guardada para este negocio.",
        },
        { status: 409 },
      );
    }

    if (
      !connection.phone_number_id ||
      !connection.access_token
    ) {
      return Response.json(
        {
          error:
            "La conexión de WhatsApp está incompleta. Falta el número o la autorización.",
        },
        { status: 409 },
      );
    }

    /*
     * 3. Prueba oficial de Meta.
     *
     * Usamos la plantilla preaprobada
     * hello_world para iniciar la prueba.
     */
    const metaResponse =
      await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${connection.phone_number_id}/messages`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${connection.access_token}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            messaging_product:
              "whatsapp",

            to,

            type:
              "template",

            template: {
              name:
                "hello_world",

              language: {
                code:
                  "en_US",
              },
            },
          }),

          cache: "no-store",
        },
      );

    const result =
      (await metaResponse
        .json()
        .catch(() => ({}))) as MetaSendResponse;

    if (!metaResponse.ok) {
      console.error(
        "Progy WhatsApp Meta test failed",
        {
          status:
            metaResponse.status,

          code:
            result.error?.code,

          subcode:
            result.error?.error_subcode,

          type:
            result.error?.type,

          message:
            result.error?.message,

          trace:
            result.error?.fbtrace_id,
        },
      );

      /*
       * Para esta fase de revisión
       * mostramos el mensaje de Meta.
       *
       * No contiene nuestro access token.
       */
      return Response.json(
        {
          error:
            result.error?.message
              ? `Meta: ${result.error.message}`
              : `Meta rechazó el mensaje (HTTP ${metaResponse.status}).`,

          metaCode:
            result.error?.code ?? null,

          metaSubcode:
            result.error?.error_subcode ?? null,
        },
        { status: 502 },
      );
    }

    const messageId =
      result.messages?.[0]?.id ||
      null;

    if (!messageId) {
      return Response.json(
        {
          error:
            "Meta aceptó la solicitud, pero no devolvió el identificador del mensaje.",
        },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,

      messageId,

      recipient:
        result.contacts?.[0]?.wa_id ||
        to,
    });
  } catch (error) {
    console.error(
      "Progy WhatsApp send-test exception",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? `Error del servidor: ${error.message}`
            : "No pudimos completar la prueba de WhatsApp.",
      },
      { status: 500 },
    );
  }
}