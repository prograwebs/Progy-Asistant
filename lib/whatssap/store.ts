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
};

function config() {
  const url = process.env.SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!url || !key) {
    throw new Error("Supabase server configuration missing");
  }

  return { url, key };
}

async function adminFetch(
  path: string,
  init: RequestInit = {},
) {
  const { url, key } = config();

  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

export async function canManageBusiness(
  userId: string,
  businessId: string,
) {
  const businessResponse = await adminFetch(
    `businesses?select=id,owner_id&id=eq.${encodeURIComponent(businessId)}&limit=1`,
  );

  const businesses = await businessResponse.json().catch(() => []) as Array<{
    id: string;
    owner_id: string;
  }>;

  if (businesses[0]?.owner_id === userId) {
    return true;
  }

  const profileResponse = await adminFetch(
    `profiles?select=account_role,is_active&id=eq.${encodeURIComponent(userId)}&limit=1`,
  );

  const profiles = await profileResponse.json().catch(() => []) as Array<{
    account_role: string;
    is_active: boolean;
  }>;

  if (
    profiles[0]?.is_active === true &&
    profiles[0]?.account_role === "admin"
  ) {
    return true;
  }

  const memberResponse = await adminFetch(
    `business_members?select=role,is_active&business_id=eq.${encodeURIComponent(
      businessId,
    )}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
  );

  const members = await memberResponse.json().catch(() => []) as Array<{
    role: string;
    is_active: boolean;
  }>;

  return (
    members[0]?.is_active === true &&
    ["owner", "manager"].includes(members[0]?.role)
  );
}

export async function saveWhatsAppConnection(
  row: WhatsAppConnectionRow & { connected_by: string },
) {
  const response = await adminFetch(
    "whatsapp_connections?on_conflict=business_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(row),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("WhatsApp connection persistence failed", {
      status: response.status,
      detail: detail.slice(0, 300),
    });

    throw new Error("Could not persist WhatsApp connection");
  }
}

export async function getWhatsAppConnection(
  businessId: string,
) {
  const response = await adminFetch(
    `whatsapp_connections?select=*&business_id=eq.${encodeURIComponent(
      businessId,
    )}&status=eq.connected&limit=1`,
  );

  if (!response.ok) {
    throw new Error("Could not read WhatsApp connection");
  }

  const rows =
    (await response.json()) as WhatsAppConnectionRow[];

  return rows[0] ?? null;
}