"use client";

import { useCallback, useEffect, useState } from "react";
import { defaultOnboardingDraft } from "./data";
import type { OnboardingDraft } from "./types";

const STORAGE_KEY = "progy-onboarding-draft";

function readDraft(): OnboardingDraft {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultOnboardingDraft };
    return { ...defaultOnboardingDraft, ...JSON.parse(stored) } as OnboardingDraft;
  } catch {
    return { ...defaultOnboardingDraft };
  }
}

export function useOnboardingDraft() {
  const [draft, setDraft] = useState<OnboardingDraft>({ ...defaultOnboardingDraft });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft(readDraft());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const updateDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The visual prototype continues to work when storage is unavailable.
      }
      return next;
    });
  }, []);

  const resetDraft = useCallback(() => {
    const next = { ...defaultOnboardingDraft };
    setDraft(next);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // The visual prototype does not depend on storage being available.
    }
  }, []);

  return { draft, ready, updateDraft, resetDraft };
}
