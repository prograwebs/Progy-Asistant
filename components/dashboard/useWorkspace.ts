"use client";

import { useCallback, useEffect, useState } from "react";
import type { Business, Snapshot } from "./types";

export function useWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (businessId?: string) => {
    setLoading(true);
    setError("");
    const url = `/api/workspace${businessId ? `?businessId=${encodeURIComponent(businessId)}` : ""}`;

    async function requestWorkspace() {
      const response = await fetch(url, { cache: "no-store" });
      const result = await response.json().catch(() => ({})) as Snapshot & { error?: string };
      return { response, result };
    }

    try {
      let { response, result } = await requestWorkspace();

      if (!response.ok && /jwt issued at future/i.test(result.error || "")) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        ({ response, result } = await requestWorkspace());
      }

      if (!response.ok && /jwt|token|session|unauthorized|auth/i.test(result.error || "")) {
        const refresh = await fetch("/api/auth/refresh", { method: "POST", cache: "no-store" });
        if (refresh.ok) {
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          ({ response, result } = await requestWorkspace());
        }
      }

      if (!response.ok) throw new Error(result.error || "No pudimos abrir tu panel.");
      setSnapshot(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos abrir tu panel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const action = useCallback(async (
    payload: Record<string, unknown>,
    message?: string,
    reload = true,
  ) => {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as { error?: string; business?: Business };
    if (!response.ok) throw new Error(result.error || "No pudimos guardar los cambios.");
    if (message) setNotice(message);
    if (reload) await load(String(payload.businessId || result.business?.id || ""));
    return result;
  }, [load]);

  return {
    snapshot,
    loading,
    error,
    notice,
    load,
    action,
    setNotice,
  };
}
