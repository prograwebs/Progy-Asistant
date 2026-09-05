type MetaError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

export type MetaApiResult = {
  success?: boolean | string;
  error?: MetaError;
};

export type MetaWabaListResult = {
  data?: Array<{ id?: string; name?: string }>;
  error?: MetaError;
};

function metaHeaders(accessToken: string, json = false) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export async function listClientWhatsAppAccounts(input: {
  graphVersion: string;
  businessId: string;
  accessToken: string;
}) {
  const url = new URL(
    `https://graph.facebook.com/${input.graphVersion}/${input.businessId}/client_whatsapp_business_accounts`,
  );
  url.searchParams.set("fields", "id,name");

  const response = await fetch(url, {
    headers: metaHeaders(input.accessToken),
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as MetaWabaListResult;
  return { response, result };
}

export async function subscribeWhatsAppBusinessAccount(input: {
  graphVersion: string;
  wabaId: string;
  accessToken: string;
}) {
  const response = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/${input.wabaId}/subscribed_apps`,
    {
      method: "POST",
      headers: metaHeaders(input.accessToken),
      cache: "no-store",
    },
  );
  const result = (await response.json().catch(() => ({}))) as MetaApiResult;
  return { response, result };
}

export async function registerWhatsAppPhone(input: {
  graphVersion: string;
  phoneNumberId: string;
  accessToken: string;
  pin: string;
}) {
  const response = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/${input.phoneNumberId}/register`,
    {
      method: "POST",
      headers: metaHeaders(input.accessToken, true),
      body: JSON.stringify({
        messaging_product: "whatsapp",
        pin: input.pin,
      }),
      cache: "no-store",
    },
  );
  const result = (await response.json().catch(() => ({}))) as MetaApiResult;
  return { response, result };
}

export async function requestWhatsAppAppDataSync(input: {
  graphVersion: string;
  phoneNumberId: string;
  accessToken: string;
  syncType: "history" | "smb_app_state_sync";
}) {
  const response = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/${input.phoneNumberId}/smb_app_data`,
    {
      method: "POST",
      headers: metaHeaders(input.accessToken, true),
      body: JSON.stringify({
        messaging_product: "whatsapp",
        sync_type: input.syncType,
      }),
      cache: "no-store",
    },
  );
  const result = (await response.json().catch(() => ({}))) as MetaApiResult;
  return { response, result };
}

export type MetaSendResponse = {
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

export async function sendWhatsAppTemplate(input: {
  graphVersion: string;
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  templateLanguage: string;
}) {
  const response = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/${input.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.to,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.templateLanguage },
        },
      }),
      cache: "no-store",
    },
  );

  const result = (await response.json().catch(() => ({}))) as MetaSendResponse;

  return { response, result };
}

export async function sendWhatsAppText(input: {
  graphVersion: string;
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}) {
  const response = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/${input.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.to,
        type: "text",
        text: { preview_url: false, body: input.text.slice(0, 4096) },
      }),
      cache: "no-store",
    },
  );

  const result = (await response.json().catch(() => ({}))) as MetaSendResponse;
  return { response, result };
}
