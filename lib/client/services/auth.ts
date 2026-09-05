import { isRecord, validEmail } from "@/lib/shared/validation/input";
import type { AuthEndpoint, AuthResult, LoginInput, SignupInput } from "@/lib/client/types/auth";

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

  return postAuth("login", { email, password: input.password }, "No pudimos iniciar sesión.");
}

export function signup(input: SignupInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Escribe tu nombre completo.");

  const email = normalizedEmail(input.email);
  if (!input.password.trim() || input.password.trim().length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  return postAuth("signup", { name, email, password: input.password }, "No pudimos crear la cuenta.");
}
