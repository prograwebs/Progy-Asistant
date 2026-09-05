import { AUTH_EMAIL_MAX_LENGTH } from "@/lib/shared/config/auth";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function requiredText(value: unknown, max = 500) {
  const result = cleanText(value, max);
  return result || null;
}

export function requiredTextWithinLimit(value: unknown, max = 500) {
  if (typeof value !== "string" || value.length > max) return null;
  const result = value.trim();
  return result || null;
}

export function validEmail(value: unknown) {
  if (typeof value !== "string" || value.length > AUTH_EMAIL_MAX_LENGTH) return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validFiniteNumber(value: unknown, options: { min?: number; max?: number } = {}) {
  if (value === "" || value === null || value === undefined || typeof value === "boolean") return null;
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number)) return null;
  if (options.min !== undefined && number < options.min) return null;
  if (options.max !== undefined && number > options.max) return null;
  return number;
}

export function validBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

export function validIdentifier(value: unknown, max = 100) {
  const result = cleanText(value, max);
  return result && !/[\u0000-\u001f\u007f]/.test(result) ? result : null;
}
