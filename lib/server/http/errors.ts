export function safeErrorMessage(_payload: unknown, fallback: string) {
  return fallback;
}

export type SupabasePublicErrorCode =
  | "session_refresh_required"
  | "business_create_rejected"
  | "business_create_schema"
  | "business_create_permission"
  | "business_create_failed";

export function providerErrorCode(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const nestedError = record.error && typeof record.error === "object"
    ? record.error as Record<string, unknown>
    : null;
  const value = record.code ?? nestedError?.code;
  if (typeof value !== "string" && typeof value !== "number") return null;

  const code = String(value).trim();
  return /^[a-z0-9_.:-]{1,80}$/i.test(code) ? code : null;
}

export function publicDataError(status: number, method: string, providerCode?: string | null) {
  if (status === 401) return "Tu sesión terminó. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permiso para realizar esta operación.";
  if (status === 404) return "No encontramos la información solicitada.";
  if (status === 409) return "No pudimos guardar los cambios porque entran en conflicto con información existente.";
  if (status === 422) return "Los datos enviados no son válidos.";
  if (status === 429) return "Se realizaron demasiadas solicitudes. Inténtalo nuevamente en unos minutos.";
  if (status === 400 && providerCode === "22023") return "Los datos del negocio no son válidos.";
  if (status === 400 && providerCode && /^(?:42P01|42883|PGRST202|PGRST204)$/i.test(providerCode)) {
    return "La configuración de negocios no está completa. Contacta al administrador.";
  }
  if (status >= 500) return "El servicio de datos no está disponible en este momento.";
  return method === "GET"
    ? "No pudimos cargar la información en este momento."
    : "No pudimos guardar los cambios en este momento.";
}

export function businessCreateErrorCode(providerCode: string | null) {
  if (providerCode === "22023") return "business_create_rejected" as const;
  if (providerCode === "42501") return "business_create_permission" as const;
  if (providerCode && /^(?:42P01|42883|PGRST202|PGRST204)$/i.test(providerCode)) {
    return "business_create_schema" as const;
  }
  return "business_create_failed" as const;
}
