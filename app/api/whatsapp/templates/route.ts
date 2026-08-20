import { requireApiUser } from "../../../../lib/integrations";
import {
  canManageBusiness,
  getWhatsAppConnection,
} from "../../../../lib/whatsapp/store";

export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  process.env.META_GRAPH_VERSION?.trim() || "v25.0";

const TEMPLATE_NAME = "progy_prueba_mensaje";
const TEMPLATE_LANGUAGE = "es";

const TEMPLATE_BODY =
  "Hola, este es un mensaje de prueba enviado desde Progy mediante WhatsApp Business.";

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

type MetaCreateTemplateResponse = {
  id?: string;
  status?: string;
  category?: string;
  error?: MetaError;
};

async function findTemplate(
  wabaId: string,
  accessToken: string,
) {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates`,
  );

  url.searchParams.set(
    "name",
    TEMPLATE_NAME,
  );

  url.searchParams.set(
    "fields",
    "id,name,status,language,category",
  );

  const response = await fetch(
    url,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
        Accept:
          "application/json",
      },

      cache: "no-store",
    },
  );

  const result =
    (await response
      .json()
      .catch(() => ({}))) as MetaTemplateListResponse;

  if (!response.ok) {
    throw new Error(
      result.error?.message ||
        "No pudimos consultar las plantillas de WhatsApp.",
    );
  }

  return (
    result.data?.find(
      (template) =>
        template.name === TEMPLATE_NAME &&
        template.language === TEMPLATE_LANGUAGE,
    ) || null
  );
}

export async function GET(request: Request) {
  try {
    const user =
      await requireApiUser();

    if (!user) {
      return Response.json(
        {
          error:
            "Inicia sesión.",
        },
        { status: 401 },
      );
    }

    const url =
      new URL(request.url);

    const businessId =
      url.searchParams
        .get("businessId")
        ?.trim() || "";

    if (!businessId) {
      return Response.json(
        {
          error:
            "Falta el negocio.",
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
            "No tienes permiso para este negocio.",
        },
        { status: 403 },
      );
    }

    const connection =
      await getWhatsAppConnection(
        businessId,
      );

    if (!connection) {
      return Response.json(
        {
          error:
            "WhatsApp no está conectado.",
        },
        { status: 409 },
      );
    }

    const template =
      await findTemplate(
        connection.waba_id,
        connection.access_token,
      );

    return Response.json({
      exists:
        Boolean(template),

      template:
        template || null,
    });
  } catch (error) {
    console.error(
      "Progy WhatsApp template GET error",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pudimos comprobar la plantilla.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user =
      await requireApiUser();

    if (!user) {
      return Response.json(
        {
          error:
            "Inicia sesión.",
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
          }
        | null;

    const businessId =
      String(
        body?.businessId || "",
      ).trim();

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
            "No tienes permiso para este negocio.",
        },
        { status: 403 },
      );
    }

    const connection =
      await getWhatsAppConnection(
        businessId,
      );

    if (!connection) {
      return Response.json(
        {
          error:
            "Conecta primero WhatsApp.",
        },
        { status: 409 },
      );
    }

    /*
     * Evitamos crearla varias veces.
     */
    const existing =
      await findTemplate(
        connection.waba_id,
        connection.access_token,
      );

    if (existing) {
      return Response.json({
        ok: true,
        alreadyExists: true,
        template: existing,
      });
    }

    const response =
      await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${connection.waba_id}/message_templates`,
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
            name:
              TEMPLATE_NAME,

            language:
              TEMPLATE_LANGUAGE,

            category:
              "UTILITY",

            components: [
              {
                type:
                  "BODY",

                text:
                  TEMPLATE_BODY,
              },
            ],
          }),

          cache: "no-store",
        },
      );

    const result =
      (await response
        .json()
        .catch(() => ({}))) as MetaCreateTemplateResponse;

    if (!response.ok) {
      console.error(
        "Progy template creation failed",
        {
          status:
            response.status,

          code:
            result.error?.code,

          subcode:
            result.error?.error_subcode,

          message:
            result.error?.message,
        },
      );

      return Response.json(
        {
          error:
            result.error?.message
              ? `Meta: ${result.error.message}`
              : "Meta no pudo crear la plantilla.",
        },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,

      alreadyExists:
        false,

      template: {
        id:
          result.id || null,

        name:
          TEMPLATE_NAME,

        language:
          TEMPLATE_LANGUAGE,

        status:
          result.status || "PENDING",

        category:
          result.category || "UTILITY",
      },
    });
  } catch (error) {
    console.error(
      "Progy WhatsApp template POST error",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No pudimos crear la plantilla.",
      },
      { status: 500 },
    );
  }
}