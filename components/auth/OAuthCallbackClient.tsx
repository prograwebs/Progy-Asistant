"use client";

import { useEffect, useState } from "react";
import { oauthSession } from "@/lib/client/services/auth";

export default function OAuthCallbackClient() {
  const [message, setMessage] = useState("Validando tu cuenta de Google…");

  useEffect(() => {
    async function finishGoogleLogin() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const providerError = hash.get("error_description") || query.get("error_description") || query.get("error");

      if (providerError) {
        window.location.replace(`/acceso?mode=login&error=${encodeURIComponent(providerError)}`);
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const expiresIn = Number(hash.get("expires_in") || 3600);
      if (!accessToken || !refreshToken) {
        window.location.replace("/acceso?mode=login&error=Google%20no%20devolvi%C3%B3%20una%20sesi%C3%B3n%20v%C3%A1lida.");
        return;
      }

      try {
        await oauthSession({ accessToken, refreshToken, expiresIn });
        window.history.replaceState(null, "", "/auth/callback");
        window.location.replace("/panel");
      } catch (error) {
        const detail = error instanceof Error ? error.message : "No pudimos completar el acceso con Google.";
        setMessage(detail);
        window.setTimeout(() => {
          window.location.replace(`/acceso?mode=login&error=${encodeURIComponent(detail)}`);
        }, 1200);
      }
    }

    void finishGoogleLogin();
  }, []);

  return (
    <main className="oauth-callback">
      <div className="oauth-loader" aria-hidden="true" />
      <h1>Entrando a Progy</h1>
      <p role="status">{message}</p>
    </main>
  );
}
