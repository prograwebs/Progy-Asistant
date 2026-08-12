export function safeErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  const value = record.msg ?? record.message ?? record.error_description ?? record.error;
  return typeof value === "string" ? value : fallback;
}
