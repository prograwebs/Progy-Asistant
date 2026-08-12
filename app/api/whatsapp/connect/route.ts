import { requireApiUser } from "../../../../lib/integrations";

export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  process.env.META_GRAPH_VERSION?.trim() || "v25.0";

type ConnectPayload = {
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
};

type MetaError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: MetaError;
};

type MetaPhone = {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  is_on_biz_app?: boolean;
  platform_type?: string;
};

type MetaPhoneResponse = MetaPhone & {
  error?: MetaError;
};

type MetaPhoneListResponse = {
  data?: MetaPhone[];
  error?: MetaError;
};

type MetaWabaResponse = {
  id?: string;
  name?: string;
  error?: MetaError;
};

function cleanId(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();

  return /^\d+$/.test(trimmed)
    ? trimmed
    : "";
}

export async function POST(request: Request) {
  const user = await requireApiUser();

  if (!user) {
    return Response.json(
      {
        error:
          "Inicia sesión para conectar WhatsApp.",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  let body: ConnectPayload;

  try {
    body = (await request.json()) as ConnectPayload;
  } catch {
    return Response.json(
      {
        error:
          "La solicitud de conexión no es válida.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  const code =
    typeof body.code === "string"
      ? body.code.trim()
      : "";

  const wabaId = cleanId(body.wabaId);

  let phoneNumberId =
    cleanId(body.phoneNumberId);

  const businessId =
    cleanId(body.businessId);

  if (!code) {
    return Response.json(
      {
        error:
          "Meta no devolvió el código de autorización.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  if (!wabaId) {
    return Response.json(
      {
        error:
          "Meta no devolvió la cuenta de WhatsApp Business.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  const appId =
    process.env.META_APP_ID?.trim() ||
    process.env.NEXT_PUBLIC_META_APP_ID?.trim() ||
    "";

  const appSecret =
    process.env.META_APP_SECRET?.trim() || "";

  if (!appId || !appSecret) {
    return Response.json(
      {
        error:
          "La conexión de Meta todavía no está configurada en Progy.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  try {
    /*
     * 1. Cambiamos el código temporal de Meta
     * por la credencial de acceso.
     *
     * El APP SECRET nunca llega al navegador.
     */
    const tokenUrl = new URL(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
    );

    tokenUrl.searchParams.set(
      "client_id",
      appId,
    );

    tokenUrl.searchParams.set(
      "client_secret",
      appSecret,
    );

    tokenUrl.searchParams.set(
      "code",
      code,
    );

    const tokenResponse = await fetch(
      tokenUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const tokenPayload =
      (await tokenResponse
        .json()
        .catch(() => ({}))) as MetaTokenResponse;

    if (
      !tokenResponse.ok ||
      !tokenPayload.access_token
    ) {
      console.error(
        "Progy Meta token exchange error",
        {
          status: tokenResponse.status,
          error: tokenPayload.error,
        },
      );

      return Response.json(
        {
          error:
            tokenPayload.error?.message ||
            "Meta rechazó la autorización. Intenta conectar WhatsApp nuevamente.",
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

    const accessToken =
      tokenPayload.access_token;

    /*
     * 2. Obtenemos el número.
     *
     * En Embedded Signup normal Meta suele
     * devolver phone_number_id.
     *
     * En WhatsApp Business App / Coexistence
     * puede devolver únicamente el WABA ID,
     * así que consultamos los números de
     * esa WABA.
     */
    let phone: MetaPhone | null = null;

    if (phoneNumberId) {
      const phoneUrl = new URL(
        `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}`,
      );

      phoneUrl.searchParams.set(
        "fields",
        "id,display_phone_number,verified_name,is_on_biz_app,platform_type",
      );

      const phoneResponse = await fetch(
        phoneUrl,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      const phonePayload =
        (await phoneResponse
          .json()
          .catch(() => ({}))) as MetaPhoneResponse;

      if (!phoneResponse.ok) {
        console.error(
          "Progy Meta phone verification error",
          {
            status: phoneResponse.status,
            error: phonePayload.error,
          },
        );
      } else {
        phone = phonePayload;
      }
    }

    /*
     * Si el evento no trajo phone_number_id
     * o no pudimos consultarlo directamente,
     * lo obtenemos desde la WABA.
     */
    if (!phone?.id) {
      const phonesUrl = new URL(
        `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/phone_numbers`,
      );

      phonesUrl.searchParams.set(
        "fields",
        "id,display_phone_number,verified_name,is_on_biz_app,platform_type",
      );

      const phonesResponse = await fetch(
        phonesUrl,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      const phonesPayload =
        (await phonesResponse
          .json()
          .catch(() => ({}))) as MetaPhoneListResponse;

      if (!phonesResponse.ok) {
        console.error(
          "Progy Meta WABA phone list error",
          {
            status: phonesResponse.status,
            error: phonesPayload.error,
          },
        );

        return Response.json(
          {
            error:
              phonesPayload.error?.message ||
              "Meta autorizó WhatsApp, pero no pudimos obtener el número conectado.",
          },
          {
            status: 502,
            headers: {
              "Cache-Control": "private, no-store, max-age=0",
            },
          },
        );
      }

      const phones =
        phonesPayload.data ?? [];

      /*
       * Para negocios que ya utilizan
       * WhatsApp Business App preferimos
       * explícitamente el número en coexistencia.
       */
      phone =
        phones.find(
          (item) =>
            item.is_on_biz_app === true,
        ) ??
        phones[0] ??
        null;

      phoneNumberId =
        phone?.id?.trim() || "";
    }

    if (!phone?.id || !phoneNumberId) {
      return Response.json(
        {
          error:
            "Meta autorizó la cuenta, pero no encontramos ningún número de WhatsApp asociado.",
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        },
      );
    }

    /*
     * 3. Consultamos el nombre de la
     * cuenta WhatsApp Business.
     */
    const wabaUrl = new URL(
      `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}`,
    );

    wabaUrl.searchParams.set(
      "fields",
      "id,name",
    );

    const wabaResponse = await fetch(
      wabaUrl,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const wabaPayload =
      (await wabaResponse
        .json()
        .catch(() => ({}))) as MetaWabaResponse;

    /*
     * IMPORTANTE:
     *
     * Por ahora NO devolvemos el token.
     * En el siguiente paso lo guardaremos
     * únicamente en el servidor/Supabase.
     */
    return Response.json(
      {
        ok: true,
        connected: true,

        meta: {
          businessId:
            businessId || null,

          wabaId,

          wabaName:
            wabaResponse.ok
              ? wabaPayload.name || null
              : null,

          phoneNumberId,

          phoneNumber:
            phone.display_phone_number ||
            null,

          verifiedName:
            phone.verified_name ||
            null,

          isOnBizApp:
            phone.is_on_biz_app === true,

          platformType:
            phone.platform_type ||
            null,
        },

        token: {
          received: true,

          expiresIn:
            tokenPayload.expires_in ??
            null,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Progy Meta connect exception",
      error,
    );

    return Response.json(
      {
        error:
          "No pudimos completar la conexión con Meta.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }
}
