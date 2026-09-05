import { createHmac } from "node:crypto";
import { supabaseAdminRequest } from "@/lib/server/data/supabase-admin";
import type {
  AuthRateLimitPolicy,
  AuthRateLimitResult,
  AuthRateLimitRule,
  RateLimitRpcRow,
} from "@/lib/server/auth/types/rate-limit";

export const AUTH_RATE_LIMITS = {
  loginIp: { bucket: "auth:login:ip", maxAttempts: 30, windowSeconds: 15 * 60 },
  loginEmail: { bucket: "auth:login:email", maxAttempts: 5, windowSeconds: 15 * 60 },
  signupIp: { bucket: "auth:signup:ip", maxAttempts: 10, windowSeconds: 60 * 60 },
  signupEmail: { bucket: "auth:signup:email", maxAttempts: 3, windowSeconds: 60 * 60 },
  refreshIp: { bucket: "auth:refresh:ip", maxAttempts: 60, windowSeconds: 60 },
  refreshToken: { bucket: "auth:refresh:token", maxAttempts: 30, windowSeconds: 60 },
  oauthIp: { bucket: "auth:oauth:ip", maxAttempts: 10, windowSeconds: 10 * 60 },
  oauthToken: { bucket: "auth:oauth:token", maxAttempts: 5, windowSeconds: 10 * 60 },
} as const satisfies Record<string, AuthRateLimitPolicy>;

export class AuthRateLimitUnavailableError extends Error {
  constructor() {
    super("Authentication rate limiter unavailable");
    this.name = "AuthRateLimitUnavailableError";
  }
}

function rateLimitSecret() {
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

export function getClientIp(request: Request) {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  if (forwardedIp) return forwardedIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

export function ipRateLimitRule(request: Request, policy: AuthRateLimitPolicy): AuthRateLimitRule {
  return { ...policy, identifier: getClientIp(request) };
}

export function identifierRateLimitRule(identifier: string, policy: AuthRateLimitPolicy): AuthRateLimitRule {
  return { ...policy, identifier };
}

function fingerprint(identifier: string, secret: string) {
  return createHmac("sha256", secret).update(identifier).digest("hex");
}

function allowInDevelopment() {
  if (process.env.NODE_ENV === "production") throw new AuthRateLimitUnavailableError();
  console.warn("Progy auth rate limiter unavailable; continuing without enforcement outside production.");
  return {
    allowed: true,
    remaining: Number.MAX_SAFE_INTEGER,
    retryAfterSeconds: 0,
  } satisfies AuthRateLimitResult;
}

export async function checkAuthRateLimit(rules: readonly AuthRateLimitRule[]): Promise<AuthRateLimitResult> {
  const secret = rateLimitSecret();
  if (!secret) return allowInDevelopment();

  for (const rule of rules) {
    try {
      const rows = await supabaseAdminRequest<RateLimitRpcRow[]>("rpc/consume_auth_rate_limit", {
        method: "POST",
        body: JSON.stringify({
          p_bucket: rule.bucket,
          p_key_hash: fingerprint(`${rule.bucket}:${rule.identifier}`, secret),
          p_window_seconds: rule.windowSeconds,
          p_max_attempts: rule.maxAttempts,
        }),
        prefer: "return=representation",
      });
      const result = rows?.[0];
      if (!result || typeof result.allowed !== "boolean") throw new Error("Invalid rate limiter response");

      const decision = {
        allowed: result.allowed,
        remaining: Number.isFinite(Number(result.remaining)) ? Number(result.remaining) : 0,
        retryAfterSeconds: Math.max(1, Math.ceil(Number(result.retry_after_seconds) || rule.windowSeconds)),
      } satisfies AuthRateLimitResult;
      if (!decision.allowed) return decision;
    } catch {
      return allowInDevelopment();
    }
  }

  return {
    allowed: true,
    remaining: Number.MAX_SAFE_INTEGER,
    retryAfterSeconds: 0,
  };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: "Se realizaron demasiadas solicitudes. Inténtalo nuevamente más tarde." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))),
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}

export function rateLimitUnavailableResponse() {
  return Response.json(
    { error: "El servicio de autenticación no está disponible en este momento." },
    {
      status: 503,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
