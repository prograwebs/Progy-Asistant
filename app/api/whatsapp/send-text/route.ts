import { requireApiUser } from "@/lib/server/auth/supabase";
import { getWhatsAppConfig } from "@/lib/server/whatsapp/config";
import {
  DEFAULT_META_GRAPH_VERSION,
  TEST_TEMPLATE_LANGUAGE,
  TEST_TEMPLATE_NAME,
  TEST_TEMPLATE_BODY,
} from "@/lib/shared/whatsapp/constants";
import { sendWhatsAppTemplate } from "@/lib/server/whatsapp/meta-client";
import {
  canManageBusiness,
  getWhatsAppConnection,
  isWhatsAppTokenExpired,
} from "@/lib/server/whatsapp/store";

export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  getWhatsAppConfig().graphVersion || DEFAULT_META_GRAPH_VERSION;

/*
 * Valores por defecto para mantener compatible la prueba existente.
 * El servidor valida la plantilla seleccionada contra la WABA antes de enviar.
 */
const TEMPLATE_NAME = TEST_TEMPLATE_NAME;
const TEMPLATE_LANGUAGE = TEST_TEMPLATE_LANGUAGE;
const TEST_MESSAGE = TEST_TEMPLATE_BODY;

type MetaError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type MetaTemplate = {
  id?: string;
  name?: string;
  status?: string;
  language?: string;
  category?: string;
};

type MetaTemplateListResponse = {
  data?: MetaTemplate[];
  error?: MetaError;
};

function normalizePhone(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[^\d]/g, "");
}

async function findApprovedTemplate(
  wabaId: string,
  accessToken: string,
  name: string,
  language: string,
) {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates`,
  );
  url.searchParams.set("name", name);
  url.searchParams.set("fields", "id,name,status,language,category");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const result = (await response.json().catch(() => ({}))) as MetaTemplateListResponse;

  if (!response.ok) {
    throw new Error("No pudimos validar la plantilla de WhatsApp.");
  }

  return (
    result.data?.find(
      (template) =>
        template.name === name &&
        template.language === language &&
        template.status?.toUpperCase() === "APPROVED",
    ) || null
  );
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

    if (!getWhatsAppConfig().enabled) {
      return Response.json(
        { error: "WhatsApp no está habilitado." },
        { status: 503 },
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
            templateName?: string;
            templateLanguage?: string;
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

    const templateName =
      String(body.templateName || TEST_TEMPLATE_NAME).trim();

    const templateLanguage =
      String(body.templateLanguage || TEST_TEMPLATE_LANGUAGE).trim();

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

    if (isWhatsAppTokenExpired(connection.token_expires_at)) {
      return Response.json(
        { error: "La conexión de WhatsApp expiró. Vuelve a conectarla." },
        { status: 409 },
      );
    }

    if (!connection.phone_number_id || !connection.access_token) {
      return Response.json(
        { error: "La conexión de WhatsApp está incompleta." },
        { status: 409 },
      );
    }

    let approvedTemplate: MetaTemplate | null;
    try {
      approvedTemplate = await findApprovedTemplate(
        connection.waba_id,
        connection.access_token,
        templateName,
        templateLanguage,
      );
    } catch (error) {
      console.error("Progy WhatsApp template validation failed", error);
      return Response.json(
        { error: "No pudimos validar la plantilla de WhatsApp." },
        { status: 502 },
      );
    }

    if (!approvedTemplate) {
      return Response.json(
        { error: "La plantilla seleccionada no está aprobada para este negocio." },
        { status: 409 },
      );
    }

    /*
     * 5. Intentar enviar la plantilla
     * aprobada (no texto libre: el cliente
     * puede no haberle escrito nunca antes
     * al negocio).
     */
    const {
      response: metaResponse,
      result,
    } =
      await sendWhatsAppTemplate({
        graphVersion: GRAPH_VERSION,
        phoneNumberId: connection.phone_number_id,
        accessToken: connection.access_token,
        to,
        templateName,
        templateLanguage,
      });

    /* Error devuelto por Meta. El registro del número es una acción
     * explícita de configuración y no se ejecuta como efecto secundario
     * de enviar un mensaje.
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
          error: "Meta rechazó el mensaje. Comprueba la conexión y la plantilla aprobada.",
        },
        {
          status: 502,
        },
      );
    }

    /* Meta aceptó el mensaje. */
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
        templateName === TEMPLATE_NAME && templateLanguage === TEMPLATE_LANGUAGE
          ? TEST_MESSAGE
          : null,
    });
  } catch (error) {
    console.error(
      "Progy WhatsApp send-text exception",
      error,
    );

    return Response.json(
      {
        error: "No pudimos completar la prueba de WhatsApp.",
      },
      {
        status: 500,
      },
    );
  }
}
