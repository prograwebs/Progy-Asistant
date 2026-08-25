import { requireApiUser } from "../../../../lib/integrations";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import {
  DEFAULT_META_GRAPH_VERSION,
  TEST_TEMPLATE_BODY as TEMPLATE_BODY,
  TEST_TEMPLATE_CATEGORY as TEMPLATE_CATEGORY,
  TEST_TEMPLATE_LANGUAGE as TEMPLATE_LANGUAGE,
  TEST_TEMPLATE_NAME as TEMPLATE_NAME,
} from "@/lib/whatsapp/constants";
import {
  canManageBusiness,
  getWhatsAppConnection,
  isWhatsAppTokenExpired,
} from "../../../../lib/whatsapp/store";

export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  getWhatsAppConfig().graphVersion || DEFAULT_META_GRAPH_VERSION;

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

class MetaTemplateRequestError extends Error {
  readonly providerStatus: number;
  readonly code?: number;
  readonly subcode?: number;

  constructor(response: Response, error?: MetaError) {
    super("Meta template request failed");
    this.name = "MetaTemplateRequestError";
    this.providerStatus = response.status;
    this.code = error?.code;
    this.subcode = error?.error_subcode;
  }
}

function logTemplateError(label: string, error: unknown) {
  if (error instanceof MetaTemplateRequestError) {
    console.error(label, {
      status: error.providerStatus,
      code: error.code,
      subcode: error.subcode,
      message: "Meta rechazó la operación de plantilla.",
    });
    return;
  }

  console.error(label, {
    message: error instanceof Error ? error.message : "unknown",
  });
}

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
    throw new MetaTemplateRequestError(response, result.error);
  }

  return (
    result.data?.find(
      (template) =>
        template.name === TEMPLATE_NAME &&
        template.language === TEMPLATE_LANGUAGE,
    ) || null
  );
}

async function listTemplates(
  wabaId: string,
  accessToken: string,
) {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates`,
  );

  url.searchParams.set(
    "fields",
    "id,name,status,language,category",
  );

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const result = (await response.json().catch(() => ({}))) as MetaTemplateListResponse;

  if (!response.ok) {
    throw new MetaTemplateRequestError(response, result.error);
  }

  return result.data ?? [];
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();

    if (!user) {
      return Response.json(
        {
          error:
            "Inicia sesión.",
        },
        { status: 401 },
      );
    }

    if (!getWhatsAppConfig().enabled) {
      return Response.json(
        { error: "WhatsApp no está habilitado." },
        { status: 503 },
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

    if (isWhatsAppTokenExpired(connection.token_expires_at)) {
      return Response.json(
        { error: "La conexión de WhatsApp expiró. Vuelve a conectarla." },
        { status: 409 },
      );
    }

    let templates: MetaTemplate[];
    try {
      templates = await listTemplates(
        connection.waba_id,
        connection.access_token,
      );
    } catch (error) {
      logTemplateError("Progy WhatsApp template GET error", error);
      if (error instanceof MetaTemplateRequestError) {
        return Response.json(
          { error: "Meta rechazó la consulta de plantillas. Verifica la conexión y los permisos de la WABA." },
          { status: 502 },
        );
      }
      return Response.json(
        { error: "No pudimos comprobar la plantilla." },
        { status: 500 },
      );
    }

    const template = templates.find(
      (item) =>
        item.name === TEMPLATE_NAME &&
        item.language === TEMPLATE_LANGUAGE,
    ) || null;

    return Response.json({
      exists:
        Boolean(template),

      template:
        template || null,

      templates,
    });
  } catch (error) {
    logTemplateError("Progy WhatsApp template GET error", error);

    return Response.json(
      { error: "No pudimos comprobar la plantilla." },
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

    if (!getWhatsAppConfig().enabled) {
      return Response.json(
        { error: "WhatsApp no está habilitado." },
        { status: 503 },
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

    if (isWhatsAppTokenExpired(connection.token_expires_at)) {
      return Response.json(
        { error: "La conexión de WhatsApp expiró. Vuelve a conectarla." },
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
              TEMPLATE_CATEGORY,

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
            "Meta rechazó la creación de la plantilla.",
        },
      );

      return Response.json(
        {
          error: "Meta no pudo crear la plantilla.",
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
          result.category || TEMPLATE_CATEGORY,
      },
    });
  } catch (error) {
    logTemplateError("Progy WhatsApp template POST error", error);

    if (error instanceof MetaTemplateRequestError) {
      return Response.json(
        { error: "Meta rechazó la consulta de plantillas. Verifica la conexión y los permisos de la WABA." },
        { status: 502 },
      );
    }

    return Response.json(
      { error: "No pudimos crear la plantilla." },
      { status: 500 },
    );
  }
}
