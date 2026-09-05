import { isRecord, validEmail } from "@/lib/shared/validation/input";
import {
  AUTH_NAME_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "@/lib/shared/config/auth";
import type {
  AuthEndpoint,
  AuthResult,
  AuthSessionStatus,
  LoginInput,
  OAuthSessionInput,
  SignupInput,
} from "@/lib/client/types/auth";

export const googleAuthPath = "/api/auth/google";

async function postAuth(endpoint: AuthEndpoint, payload: LoginInput | SignupInput, fallbackMessage: string) {
  const response = await fetch(`/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null) as unknown;
  const error = isRecord(body) && typeof body.error === "string" ? body.error : "";

  if (!response.ok) throw new Error(error || fallbackMessage);
  if (!isRecord(body)) throw new Error(fallbackMessage);

  return {
    ok: body.ok === true,
    needsConfirmation: body.needsConfirmation === true,
  } satisfies AuthResult;
}

function normalizedEmail(email: string) {
  const result = validEmail(email);
  if (!result) throw new Error("Escribe un correo electrónico válido.");
  return result;
}

export function login(input: LoginInput) {
  const email = normalizedEmail(input.email);
  if (!input.password.trim()) throw new Error("Escribe tu contraseña.");
  if (input.password.length > AUTH_PASSWORD_MAX_LENGTH) {
    throw new Error(`La contraseña no puede superar los ${AUTH_PASSWORD_MAX_LENGTH} caracteres.`);
  }

  return postAuth("login", { email, password: input.password }, "No pudimos iniciar sesión.");
}

export function signup(input: SignupInput) {
  if (input.name.length > AUTH_NAME_MAX_LENGTH) {
    throw new Error(`El nombre no puede superar los ${AUTH_NAME_MAX_LENGTH} caracteres.`);
  }
  const name = input.name.trim();
  if (!name) throw new Error("Escribe tu nombre completo.");

  const email = normalizedEmail(input.email);
  if (
    !input.password.trim() ||
    input.password.trim().length < AUTH_PASSWORD_MIN_LENGTH
  ) {
    throw new Error(`La contraseña debe tener al menos ${AUTH_PASSWORD_MIN_LENGTH} caracteres.`);
  }
  if (input.password.length > AUTH_PASSWORD_MAX_LENGTH) {
    throw new Error(`La contraseña no puede superar los ${AUTH_PASSWORD_MAX_LENGTH} caracteres.`);
  }

  return postAuth("signup", { name, email, password: input.password }, "No pudimos crear la cuenta.");
}

export async function oauthSession(input: OAuthSessionInput) {
  const response = await fetch("/api/auth/oauth-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null) as unknown;
  const error = isRecord(body) && typeof body.error === "string" ? body.error : "";

  if (!response.ok) throw new Error(error || "No pudimos completar el acceso con Google.");
}

export async function checkSession(): Promise<AuthSessionStatus> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: null };
  }
}

export async function refreshSession() {
  const response = await fetch("/api/auth/refresh", { method: "POST", cache: "no-store" });
  return response.ok;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}
