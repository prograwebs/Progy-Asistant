import { progyOrigin } from "@/lib/server/config/env";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

function matchesOrigin(value: string, expectedOrigin: string) {
  try {
    return new URL(value).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function forbiddenResponse() {
  return Response.json(
    { error: "Solicitud de autenticación no permitida." },
    { status: 403, headers: NO_STORE_HEADERS },
  );
}

export function validateAuthRequestOrigin(request: Request): Response | null {
  const expectedOrigin = progyOrigin();
  const origin = request.headers.get("origin")?.trim() || "";
  const referer = request.headers.get("referer")?.trim() || "";

  if (origin) {
    if (!matchesOrigin(origin, expectedOrigin)) return forbiddenResponse();
    if (referer && !matchesOrigin(referer, expectedOrigin)) return forbiddenResponse();
    return null;
  }

  if (!referer || !matchesOrigin(referer, expectedOrigin)) return forbiddenResponse();
  return null;
}
