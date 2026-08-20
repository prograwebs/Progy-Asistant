import { requireApiUser } from "../../../../lib/integrations";
import {
  canManageBusiness,
  getWhatsAppConnection,
} from "../../../../lib/whatsapp/store";

export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  process.env.META_GRAPH_VERSION?.trim() || "v25.0";

const TEST_MESSAGE =
  "Hola, este es un mensaje de prueba enviado desde Progy mediante WhatsApp Business.";

type MetaError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

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

  error?: MetaError;
};

type MetaRegisterResponse = {
  success?: boolean;
  error?: MetaError;
};

function normalizePhone(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[^\d]/g, "");
}

async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
) {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json",

        Accept:
          "application/json",
      },

      body: JSON.stringify({
        messaging_product:
          "whatsapp",

        recipient_type:
          "individual",

        to,

        type:
          "text",

        text: {
          preview_url:
            false,

          body:
            TEST_MESSAGE,
        },
      }),

      cache:
        "no-store",
    },
  );

  const result =
    (await response
      .json()
      .catch(() => ({}))) as MetaSendResponse;

  return {
    response,
    result,
  };
}

async function registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
) {
  const pin =
    process.env.META_WHATSAPP_REG_PIN?.trim() || "";

  if (!/^\d{6}$/.test(pin)) {
    throw new Error(
      "META_WHATSAPP_REG_PIN no está configurado correctamente.",
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/register`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json",

        Accept:
          "application/json",
      },

      body: JSON.stringify({
        messaging_product:
          "whatsapp",

        pin,
      }),

      cache:
        "no-store",
    },
  );

  const result =
    (await response
      .json()
      .catch(() => ({}))) as MetaRegisterResponse;

  return {
    response,
    result,
  };
}

export async function POST(request: Request) {
  try {
    /*
     * 1. Usuario autenticado.
     */
    const user =
      await requireApiUser();

    if (!user) {
      return Response.json(
        {
          error:
            "Inicia sesión para enviar el mensaje de prueba.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * 2. Leer solicitud.
     */
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
        {
          status: 400,
        },
      );
    }

    const businessId =
      String(
        body.businessId || "",
      ).trim();

    const to =
      normalizePhone(
        body.to,
      );

    if (!businessId) {
      return Response.json(
        {
          error:
            "No pudimos identificar el negocio.",
        },
        {
          status: 400,
        },
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
        {
          status: 400,
        },
      );
    }

    /*
     * 3. Comprobar permisos del negocio.
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
        {
          status: 403,
        },
      );
    }

    /*
     * 4. Obtener conexión de WhatsApp
     * guardada en Supabase.
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
        {
          status: 409,
        },
      );
    }

    if (
      !connection.phone_number_id ||
      !connection.access_token
    ) {
      return Response.json(
        {
          error:
            "La conexión de WhatsApp está incompleta.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 5. Intentar enviar texto normal.
     *
     * IMPORTANTE:
     * El cliente debe haber enviado primero
     * un mensaje al WhatsApp del negocio
     * para abrir la ventana de atención.
     */
    let {
      response: metaResponse,
      result,
    } =
      await sendTextMessage(
        connection.phone_number_id,
        connection.access_token,
        to,
      );

    /*
     * 6. Si Meta indica que el número
     * todavía no está registrado,
     * lo registramos y reintentamos
     * solamente una vez.
     */
    if (
      !metaResponse.ok &&
      result.error?.code === 133010
    ) {
      const {
        response:
          registerResponse,

        result:
          registerResult,
      } =
        await registerPhoneNumber(
          connection.phone_number_id,
          connection.access_token,
        );

      if (!registerResponse.ok) {
        console.error(
          "Progy WhatsApp registration failed",
          {
            status:
              registerResponse.status,

            code:
              registerResult.error?.code,

            subcode:
              registerResult.error?.error_subcode,

            message:
              registerResult.error?.message,
          },
        );

        return Response.json(
          {
            error:
              registerResult.error?.message
                ? `Meta al registrar el número: ${registerResult.error.message}`
                : "Meta no pudo registrar el número de WhatsApp.",
          },
          {
            status: 502,
          },
        );
      }

      /*
       * Número registrado:
       * segundo y último intento.
       */
      const retry =
        await sendTextMessage(
          connection.phone_number_id,
          connection.access_token,
          to,
        );

      metaResponse =
        retry.response;

      result =
        retry.result;
    }

    /*
     * 7. Error devuelto por Meta.
     */
    if (!metaResponse.ok) {
      console.error(
        "Progy WhatsApp Meta send failed",
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

      return Response.json(
        {
          error:
            result.error?.message
              ? `Meta: ${result.error.message}`
              : `Meta rechazó el mensaje (HTTP ${metaResponse.status}).`,

          metaCode:
            result.error?.code ??
            null,

          metaSubcode:
            result.error?.error_subcode ??
            null,
        },
        {
          status: 502,
        },
      );
    }

    /*
     * 8. Meta aceptó el mensaje.
     */
    const messageId =
      result.messages?.[0]?.id ||
      null;

    if (!messageId) {
      return Response.json(
        {
          error:
            "Meta aceptó la solicitud, pero no devolvió el identificador del mensaje.",
        },
        {
          status: 502,
        },
      );
    }

    return Response.json({
      ok: true,

      messageId,

      recipient:
        result.contacts?.[0]?.wa_id ||
        to,

      message:
        TEST_MESSAGE,
    });
  } catch (error) {
    console.error(
      "Progy WhatsApp send-text exception",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? `Error del servidor: ${error.message}`
            : "No pudimos completar la prueba de WhatsApp.",
      },
      {
        status: 500,
      },
    );
  }
}