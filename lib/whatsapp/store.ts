type WhatsAppConnectionRow = {
  business_id: string;
  meta_business_id: string | null;
  waba_id: string;
  waba_name: string | null;
  phone_number_id: string;
  phone_number: string | null;
  verified_name: string | null;
  is_on_biz_app: boolean;
  platform_type: string | null;
  access_token: string;
  token_expires_at: string | null;
  status: string;
  webhook_subscribed_at?: string | null;
  phone_registered_at?: string | null;
  registration_status?: string;
  onboarding_flow?: "standard" | "business_app";
  history_sync_status?: string;
  contacts_sync_status?: string;
  last_meta_error?: string | null;
};

function config() {
  const url =
    process.env.SUPABASE_URL?.trim() || "";

  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() || "";

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  const key =
    secretKey || serviceRoleKey;

  if (!url || !key) {
    throw new Error(
      "Supabase server configuration missing",
    );
  }

  return {
    url,
    key,
    isSecretKey:
      key.startsWith("sb_secret_"),
  };
}

async function adminFetch(
  path: string,
  init: RequestInit = {},
) {
  const {
    url,
    key,
    isSecretKey,
  } = config();

  const headers =
    new Headers(init.headers);

  headers.set(
    "apikey",
    key,
  );

  headers.set(
    "Content-Type",
    "application/json",
  );

  /*
   * Las nuevas claves sb_secret_ NO son JWT.
   * Por eso no se envían como Bearer.
   *
   * La antigua service_role sí es JWT.
   */
  if (!isSecretKey) {
    headers.set(
      "Authorization",
      `Bearer ${key}`,
    );
  }

  return fetch(
    `${url}/rest/v1/${path}`,
    {
      ...init,
      headers,
      cache: "no-store",
    },
  );
}

export async function canManageBusiness(
  userId: string,
  businessId: string,
) {
  const businessResponse =
    await adminFetch(
      `businesses?select=id,owner_id&id=eq.${encodeURIComponent(
        businessId,
      )}&limit=1`,
    );

  if (!businessResponse.ok) {
    const detail =
      await businessResponse
        .text()
        .catch(() => "");

    console.error(
      "WhatsApp business permission check failed",
      {
        step: "business",
        status:
          businessResponse.status,
        detail:
          detail.slice(0, 300),
      },
    );

    throw new Error(
      "No pudimos comprobar los permisos del negocio.",
    );
  }

  const businesses =
    (await businessResponse.json()) as Array<{
      id: string;
      owner_id: string;
    }>;

  const business =
    businesses[0];

  if (!business) {
    console.error(
      "WhatsApp business not found",
      {
        businessId,
      },
    );

    return false;
  }

  /*
   * Si es dueño del negocio,
   * no necesitamos consultar nada más.
   */
  if (
    business.owner_id === userId
  ) {
    return true;
  }

  const memberResponse =
    await adminFetch(
      `business_members?select=role,is_active&business_id=eq.${encodeURIComponent(
        businessId,
      )}&user_id=eq.${encodeURIComponent(
        userId,
      )}&limit=1`,
    );

  if (!memberResponse.ok) {
    const detail =
      await memberResponse
        .text()
        .catch(() => "");

    console.error(
      "WhatsApp membership permission check failed",
      {
        status:
          memberResponse.status,
        detail:
          detail.slice(0, 300),
      },
    );

    throw new Error(
      "No pudimos comprobar los permisos del negocio.",
    );
  }

  const members =
    (await memberResponse.json()) as Array<{
      role: string;
      is_active: boolean;
    }>;

  const member =
    members[0];

  return Boolean(
    member?.is_active &&
      ["owner", "manager"].includes(
        member.role,
      ),
  );
}

export async function saveWhatsAppConnection(
  row: WhatsAppConnectionRow & {
    connected_by: string;
  },
) {
  const response =
    await adminFetch(
      "whatsapp_connections?on_conflict=business_id",
      {
        method: "POST",

        headers: {
          Prefer:
            "resolution=merge-duplicates,return=representation",
        },

        body:
          JSON.stringify(row),
      },
    );

  if (!response.ok) {
    const detail =
      await response
        .text()
        .catch(() => "");

    console.error(
      "WhatsApp connection persistence failed",
      {
        status:
          response.status,

        detail:
          detail.slice(0, 300),
      },
    );

    throw new Error(
      "Could not persist WhatsApp connection",
    );
  }
}

export async function updateWhatsAppConnection(
  businessId: string,
  data: Record<string, unknown>,
) {
  const response = await adminFetch(
    `whatsapp_connections?business_id=eq.${encodeURIComponent(businessId)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        ...data,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("WhatsApp connection update failed", {
      status: response.status,
      detail: detail.slice(0, 300),
    });
    throw new Error("Could not update WhatsApp connection");
  }
}

export async function getWhatsAppConnection(
  businessId: string,
) {
  const response =
    await adminFetch(
      `whatsapp_connections?select=*&business_id=eq.${encodeURIComponent(
        businessId,
      )}&status=eq.connected&limit=1`,
    );

  if (!response.ok) {
    const detail =
      await response
        .text()
        .catch(() => "");

    console.error(
      "WhatsApp connection read failed",
      {
        status:
          response.status,
        detail:
          detail.slice(0, 300),
      },
    );

    throw new Error(
      "Could not read WhatsApp connection",
    );
  }

  const rows =
    (await response.json()) as WhatsAppConnectionRow[];

  return rows[0] ?? null;
}

export function isWhatsAppTokenExpired(
  tokenExpiresAt: string | null | undefined,
) {
  if (!tokenExpiresAt) return false;

  const timestamp = Date.parse(tokenExpiresAt);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}
