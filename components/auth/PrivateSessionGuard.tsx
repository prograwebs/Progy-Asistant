"use client";

import { useEffect } from "react";
import { checkSession } from "@/lib/client/services/auth";

export default function PrivateSessionGuard() {
  useEffect(() => {
    let active = true;

    async function verifySession() {
      const result = await checkSession();
      if (active && result.status === 401) window.location.replace("/acceso?mode=login");
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
