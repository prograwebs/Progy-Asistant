"use client";

import { useEffect } from "react";

export default function PrivateSessionGuard() {
  useEffect(() => {
    let active = true;

    async function verifySession() {
      const response = await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
      if (active && response?.status === 401) window.location.replace("/acceso?mode=login");
    }

    function handlePageShow() {
      void verifySession();
    }

    void verifySession();
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      active = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
