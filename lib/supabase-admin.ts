/** @deprecated Import the privileged data boundary from @/lib/data/supabase-admin. */
type AdminRequestOptions = RequestInit & { prefer?: string };

export class SupabaseAdminRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code?: string) {
    super("Supabase server data request failed");
    this.name = "SupabaseAdminRequestError";
    this.status = status;
    this.code = code;
  }
}

function adminConfig() {
  const url = process.env.SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";

  if (!url || !key) {
    throw new Error("Supabase server configuration missing");
  }

  return { url, key, isSecretKey: key.startsWith("sb_secret_") };
}

export async function supabaseAdminRequest<T = unknown>(
  path: string,
  options: AdminRequestOptions = {},
) {
  const { url, key, isSecretKey } = adminConfig();
  const { prefer, ...requestInit } = options;
  const headers = new Headers(requestInit.headers);
  headers.set("apikey", key);
  headers.set("Accept", "application/json");
  if (requestInit.body) headers.set("Content-Type", "application/json");
  if (prefer) headers.set("Prefer", prefer);
  if (!isSecretKey) headers.set("Authorization", `Bearer ${key}`);

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...requestInit,
    headers,
    cache: "no-store",
  });
  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }

  if (!response.ok) {
    const providerCode = payload && typeof payload === "object" && !Array.isArray(payload) &&
      typeof (payload as Record<string, unknown>).code === "string"
      ? String((payload as Record<string, unknown>).code).slice(0, 80)
      : undefined;
    const log = response.status === 409 ? console.warn : console.error;
    log("Progy admin data request failed", {
      resource: path.split("?", 1)[0],
      status: response.status,
      code: providerCode,
    });
    throw new SupabaseAdminRequestError(response.status, providerCode);
  }

  return payload as T;
}
