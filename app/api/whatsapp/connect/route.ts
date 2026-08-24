import { canManageBusiness, getWhatsAppConnection, saveWhatsAppConnection } from "@/lib/whatsapp/store";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { requireApiUser } from "../../../../lib/integrations";
import { DEFAULT_META_GRAPH_VERSION } from "@/lib/whatsapp/constants";
import {
  listClientWhatsAppAccounts,
  requestWhatsAppAppDataSync,
  subscribeWhatsAppBusinessAccount,
} from "@/lib/whatsapp/meta-client";


export const dynamic = "force-dynamic";

const GRAPH_VERSION =
  getWhatsAppConfig().graphVersion || DEFAULT_META_GRAPH_VERSION;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

type ConnectPayload = {
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
  flow?: "standard" | "business_app";

  /*
   * ID interno del negocio dentro de Progy.
   * No es el Business ID de Meta.
   */
  progyBusinessId?: string;
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
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  return /^\d+$/.test(trimmed)
    ? trimmed
    : "";
}

/*
 * ============================================================
 * POST
 * ============================================================
 *
 * Recibe el resultado de Embedded Signup.
 *
 * 1. Valida al usuario.
 * 2. Valida el negocio de Progy.
 * 3. Cambia el code de Meta por access_token.
 * 4. Obtiene el número de WhatsApp.
 * 5. Obtiene información de la WABA.
 * 6. GUARDA todo en Supabase.
 * 7. Devuelve solamente información segura al navegador.
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const user = await requireApiUser();

  if (!user) {
    return Response.json(
      {
        error:
          "Inicia sesión para conectar WhatsApp.",
      },
      {
        status: 401,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  if (!getWhatsAppConfig().enabled) {
    return Response.json(
      { error: "La conexión de WhatsApp no está habilitada." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  let body: ConnectPayload;

  try {
    body =
      (await request.json()) as ConnectPayload;
  } catch {
    return Response.json(
      {
        error:
          "La solicitud de conexión no es válida.",
      },
      {
        status: 400,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  const code =
    typeof body.code === "string"
      ? body.code.trim()
      : "";

  let wabaId =
    cleanId(body.wabaId);

  let phoneNumberId =
    cleanId(body.phoneNumberId);

  /*
   * Este es el Business ID de Meta.
   */
  const metaBusinessId =
    cleanId(body.businessId);

  const onboardingFlow = body.flow === "business_app"
    ? "business_app"
    : "standard";

  console.info("Progy WhatsApp connect started", {
    requestId,
    hasCode: Boolean(code),
    hasWabaId: Boolean(wabaId),
    hasPhoneNumberId: Boolean(phoneNumberId),
    hasMetaBusinessId: Boolean(metaBusinessId),
    onboardingFlow,
  });

  /*
   * Este es el UUID de public.businesses en Progy.
   */
  const progyBusinessId =
    typeof body.progyBusinessId === "string"
      ? body.progyBusinessId.trim()
      : "";

  if (!progyBusinessId) {
    return Response.json(
      {
        error:
          "No pudimos identificar el negocio de Progy.",
      },
      {
        status: 400,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  /*
   * Comprobamos que el usuario realmente
   * puede administrar este negocio.
   */
  try {
    const allowed =
      await canManageBusiness(
        user.id,
        progyBusinessId,
      );

    if (!allowed) {
      return Response.json(
        {
          error:
            "No tienes permiso para configurar este negocio.",
        },
        {
          status: 403,
          headers: NO_STORE_HEADERS,
        },
      );
    }
  } catch (error) {
    console.error(
      "Progy WhatsApp business permission check failed",
      error,
    );

    return Response.json(
      {
        error:
          "No pudimos comprobar los permisos del negocio.",
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  if (!code) {
    return Response.json(
      {
        error:
          "Meta no devolvió el código de autorización.",
      },
      {
        status: 400,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  if (!wabaId && !metaBusinessId) {
    return Response.json(
      {
        error:
          "Meta no devolvió la cuenta de WhatsApp Business.",
      },
      {
        status: 400,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  const { appId, appSecret } = getWhatsAppConfig();

  if (!appId || !appSecret) {
    return Response.json(
      {
        error:
          "La conexión de Meta todavía no está configurada en Progy.",
      },
      {
        status: 503,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  try {
    /*
     * ========================================================
     * 1. Cambiar código temporal por access token
     * ========================================================
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
          requestId,
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
          headers: NO_STORE_HEADERS,
        },
      );
    }

    const accessToken =
      tokenPayload.access_token;

    /*
     * Embedded Signup devuelve el Business ID y la WABA seleccionada.
     * Verificamos la relación desde Graph para no guardar una WABA que
     * no pertenezca al negocio de Meta autorizado.
     */
    if (metaBusinessId && !wabaId) {
      const accounts = await listClientWhatsAppAccounts({
        graphVersion: GRAPH_VERSION,
        businessId: metaBusinessId,
        accessToken,
      });

      if (!accounts.response.ok) {
        console.error("Progy Meta WABA account list error", {
          requestId,
          status: accounts.response.status,
          error: accounts.result.error,
        });

        return Response.json(
          {
            error:
              accounts.result.error?.message ||
              "Meta autorizó la conexión, pero no pudimos verificar la cuenta de WhatsApp.",
          },
          { status: 502, headers: NO_STORE_HEADERS },
        );
      }

      const availableAccounts = accounts.result.data || [];
      const selectedAccount = wabaId
        ? availableAccounts.find((account) => account.id === wabaId)
        : availableAccounts[0];

      wabaId = selectedAccount?.id?.trim() || "";

      if (!wabaId) {
        return Response.json(
          {
            error:
              "La cuenta de WhatsApp seleccionada no pertenece al negocio autorizado en Meta.",
          },
          { status: 403, headers: NO_STORE_HEADERS },
        );
      }
    } else if (metaBusinessId && wabaId) {
      /* Meta ya devolvió el WABA seleccionado; no enumeramos WABAs con el token OAuth del cliente. */
      console.info("Progy WhatsApp using WABA returned by Embedded Signup", {
        requestId,
        metaBusinessId,
        wabaId,
      });
    }

    if (!wabaId) {
      return Response.json(
        {
          error:
            "Meta no devolvió la cuenta de WhatsApp Business.",
        },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    /*
     * ========================================================
     * 2. Obtener número de WhatsApp
     * ========================================================
     */

    let phone: MetaPhone | null =
      null;

    /*
     * Si Embedded Signup devolvió directamente
     * phone_number_id, intentamos consultarlo.
     */
    if (phoneNumberId) {
      const phoneUrl = new URL(
        `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}`,
      );

      phoneUrl.searchParams.set(
        "fields",
        "id,display_phone_number,verified_name,is_on_biz_app,platform_type",
      );

      const phoneResponse =
        await fetch(
          phoneUrl,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              Accept:
                "application/json",
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
            requestId,
            status:
              phoneResponse.status,

            error:
              phonePayload.error,
          },
        );
      } else {
        phone =
          phonePayload;
      }
    }

    /*
     * Si Meta no devolvió phone_number_id
     * o la consulta anterior no funcionó,
     * obtenemos los números desde la WABA.
     */
    if (!phone?.id || (
      onboardingFlow === "business_app" &&
      phone.is_on_biz_app !== true
    )) {
      const phonesUrl = new URL(
        `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/phone_numbers`,
      );

      phonesUrl.searchParams.set(
        "fields",
        "id,display_phone_number,verified_name,is_on_biz_app,platform_type",
      );

      const phonesResponse =
        await fetch(
          phonesUrl,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              Accept:
                "application/json",
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
            requestId,
            status:
              phonesResponse.status,

            error:
              phonesPayload.error,
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
            headers:
              NO_STORE_HEADERS,
          },
        );
      }

      const phones =
        phonesPayload.data ?? [];

      /*
       * Si existe un número correspondiente
       * a WhatsApp Business App / coexistencia,
       * lo preferimos.
       *
       * Si no, utilizamos el primer número.
       */
      phone = onboardingFlow === "business_app"
        ? phones.find((item) =>
            item.id === phoneNumberId && item.is_on_biz_app === true
          ) ?? phones.find((item) => item.is_on_biz_app === true) ?? null
        : phones[0] ?? null;

      phoneNumberId =
        phone?.id?.trim() || "";
    }

    if (
      !phone?.id ||
      !phoneNumberId
    ) {
      return Response.json(
        {
          error:
            "Meta autorizó la cuenta, pero no encontramos ningún número de WhatsApp asociado.",
        },
        {
          status: 502,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    if (onboardingFlow === "business_app" && phone.is_on_biz_app !== true) {
      return Response.json(
        {
          error:
            "Meta terminó el flujo de Coexistence, pero el número no aparece activo en WhatsApp Business App.",
        },
        { status: 409, headers: NO_STORE_HEADERS },
      );
    }

    /*
     * ========================================================
     * 3. Obtener nombre de la WABA
     * ========================================================
     */

    const wabaUrl = new URL(
      `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}`,
    );

    wabaUrl.searchParams.set(
      "fields",
      "id,name",
    );

    const wabaResponse =
      await fetch(
        wabaUrl,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            Accept:
              "application/json",
          },

          cache: "no-store",
        },
      );

    const wabaPayload =
      (await wabaResponse
        .json()
        .catch(() => ({}))) as MetaWabaResponse;

    if (!wabaResponse.ok) {
      console.error(
        "Progy Meta WABA details error",
        {
          requestId,
          status:
            wabaResponse.status,

          error:
            wabaPayload.error,
        },
      );

      /*
       * No detenemos la conexión por esto.
       *
       * El nombre de la WABA es informativo;
       * ya tenemos WABA ID, teléfono y token.
      */
    }

    /*
     * Suscribir la app es lo que habilita los webhooks de esta WABA.
     * La operación es idempotente y debe completarse antes de guardar la
     * conexión como utilizable.
     */
    const subscription = await subscribeWhatsAppBusinessAccount({
      graphVersion: GRAPH_VERSION,
      wabaId,
      accessToken,
    });

    if (!subscription.response.ok) {
      console.error("Progy Meta WABA subscription error", {
        requestId,
        status: subscription.response.status,
        error: subscription.result.error,
      });

      return Response.json(
        {
          error:
            subscription.result.error?.message ||
            "La cuenta fue autorizada, pero Meta no permitió activar los webhooks.",
        },
        { status: 502, headers: NO_STORE_HEADERS },
      );
    }

    const webhookSubscribedAt = new Date().toISOString();

    /*
     * ========================================================
     * 4. Guardar conexión en Supabase
     * ========================================================
     *
     * ESTA ES LA PARTE QUE FALTABA.
     *
     * El access_token nunca se devuelve al navegador.
     */

    const tokenExpiresAt =
      typeof tokenPayload.expires_in ===
      "number"
        ? new Date(
            Date.now() +
              tokenPayload.expires_in *
                1000,
          ).toISOString()
        : null;

    let historySyncStatus = "not_requested";
    let contactsSyncStatus = "not_requested";
    const syncErrors: string[] = [];

    if (onboardingFlow === "business_app") {
      const syncResults = await Promise.allSettled([
        requestWhatsAppAppDataSync({
          graphVersion: GRAPH_VERSION,
          phoneNumberId,
          accessToken,
          syncType: "history",
        }),
        requestWhatsAppAppDataSync({
          graphVersion: GRAPH_VERSION,
          phoneNumberId,
          accessToken,
          syncType: "smb_app_state_sync",
        }),
      ]);
      const [historyResult, contactsResult] = syncResults;
      historySyncStatus = historyResult.status === "fulfilled" && historyResult.value.response.ok
        ? "requested"
        : "failed";
      contactsSyncStatus = contactsResult.status === "fulfilled" && contactsResult.value.response.ok
        ? "requested"
        : "failed";
      for (const result of syncResults) {
        if (result.status === "rejected") {
          syncErrors.push("No se pudo solicitar la sincronización de Coexistence.");
        } else if (!result.value.response.ok) {
          syncErrors.push(
            result.value.result.error?.message ||
              "Meta rechazó una sincronización de Coexistence.",
          );
        }
      }
    }

    try {
      console.info("Progy WhatsApp connection persistence started", {
        requestId,
        progyBusinessId,
        metaBusinessId: metaBusinessId || null,
        wabaId,
        phoneNumberId,
        onboardingFlow,
      });
      await saveWhatsAppConnection({
        business_id:
          progyBusinessId,

        meta_business_id:
          metaBusinessId || null,

        waba_id:
          wabaId,

        waba_name:
          wabaResponse.ok
            ? wabaPayload.name || null
            : null,

        phone_number_id:
          phoneNumberId,

        phone_number:
          phone.display_phone_number ||
          null,

        verified_name:
          phone.verified_name ||
          null,

        is_on_biz_app:
          phone.is_on_biz_app ===
          true,

        platform_type:
          phone.platform_type ||
          null,

        access_token:
          accessToken,

        token_expires_at:
          tokenExpiresAt,

        status:
          "connected",

        connected_by:
          user.id,

        webhook_subscribed_at:
          webhookSubscribedAt,

        registration_status:
          onboardingFlow === "business_app" ? "coexistence" : "pending",

        phone_registered_at:
          null,

        last_meta_error:
          syncErrors.join(" | ").slice(0, 500) || null,

        onboarding_flow:
          onboardingFlow,

        history_sync_status:
          historySyncStatus,

        contacts_sync_status:
          contactsSyncStatus,
      });
    } catch (error) {
      console.error(
        "Progy WhatsApp connection save error",
        { requestId, error },
      );

      return Response.json(
        {
          error:
            "WhatsApp fue autorizado, pero no pudimos guardar la conexión en Progy.",
        },
        {
          status: 500,
          headers:
            NO_STORE_HEADERS,
        },
      );
    }

    /*
     * ========================================================
     * 5. Respuesta segura al navegador
     * ========================================================
     *
     * NO enviamos:
     * - access_token
     * - app secret
     * - claves Supabase
     */

    return Response.json(
      {
        ok: true,
        connected: true,

        meta: {
          businessId:
            metaBusinessId || null,

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
            phone.is_on_biz_app ===
            true,

          platformType:
            phone.platform_type ||
            null,

          webhookSubscribedAt,

          phoneRegisteredAt: null,

          registrationStatus: onboardingFlow === "business_app" ? "coexistence" : "pending",
          onboardingFlow,
          historySyncStatus,
          contactsSyncStatus,
        },

        token: {
          received: true,

          expiresIn:
            tokenPayload.expires_in ??
            null,
        },
      },
      {
        headers:
          NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    console.error(
      "Progy Meta connect exception",
      { requestId, error },
    );

    return Response.json(
      {
        error:
          "No pudimos completar la conexión con Meta.",
      },
      {
        status: 502,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}

/*
 * ============================================================
 * GET
 * ============================================================
 *
 * Se ejecuta automáticamente cuando el usuario entra
 * a la sección WhatsApp.
 *
 * Permite:
 *
 * - F5 y sigue conectado
 * - cerrar sesión y volver a entrar
 * - abrir Progy nuevamente
 *
 * Nunca devuelve access_token.
 */
export async function GET(
  request: Request,
) {
  const user =
    await requireApiUser();

  if (!user) {
    return Response.json(
      {
        error:
          "Inicia sesión.",
      },
      {
        status: 401,
        headers:
          NO_STORE_HEADERS,
      },
    );
  }

  if (!getWhatsAppConfig().enabled) {
    return Response.json(
      { error: "WhatsApp no está habilitado." },
      { status: 503, headers: NO_STORE_HEADERS },
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
      {
        status: 400,
        headers:
          NO_STORE_HEADERS,
      },
    );
  }

  /*
   * Comprobar que el usuario pueda
   * administrar el negocio solicitado.
   */
  try {
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
        {
          status: 403,
          headers:
            NO_STORE_HEADERS,
        },
      );
    }
  } catch (error) {
    console.error(
      "Progy WhatsApp GET permission error",
      error,
    );

    return Response.json(
      {
        error:
          "No pudimos comprobar los permisos del negocio.",
      },
      {
        status: 500,
        headers:
          NO_STORE_HEADERS,
      },
    );
  }

  /*
   * Buscar la conexión guardada.
   */
  try {
    const connection =
      await getWhatsAppConnection(
        businessId,
      );

    if (!connection) {
      return Response.json(
        {
          connected: false,
          meta: null,
        },
        {
          headers:
            NO_STORE_HEADERS,
        },
      );
    }

    /*
     * IMPORTANTE:
     *
     * Solo enviamos información pública/segura.
     * access_token se queda exclusivamente
     * en el servidor.
     */
    return Response.json(
      {
        connected: true,

        meta: {
          wabaId:
            connection.waba_id,

          wabaName:
            connection.waba_name,

          phoneNumberId:
            connection.phone_number_id,

          phoneNumber:
            connection.phone_number,

          verifiedName:
            connection.verified_name,

          isOnBizApp:
            connection.is_on_biz_app,

          platformType:
            connection.platform_type,

          webhookSubscribedAt:
            connection.webhook_subscribed_at || null,

          phoneRegisteredAt:
            connection.phone_registered_at || null,

          registrationStatus:
            connection.registration_status || "pending",

          onboardingFlow:
            connection.onboarding_flow || "standard",

          historySyncStatus:
            connection.history_sync_status || "not_requested",

          contactsSyncStatus:
            connection.contacts_sync_status || "not_requested",
        },
      },
      {
        headers:
          NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    console.error(
      "Progy WhatsApp connection read error",
      error,
    );

    return Response.json(
      {
        error:
          "No pudimos consultar la conexión de WhatsApp.",
      },
      {
        status: 500,
        headers:
          NO_STORE_HEADERS,
      },
    );
  }
}
