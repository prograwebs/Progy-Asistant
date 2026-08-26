"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultOnboardingDraft } from "./data";
import type { OnboardingDraft } from "./types";

const STORAGE_KEY = "progy-onboarding-draft";

type OnboardingDraftStore = {
  draft: OnboardingDraft;
  ready: boolean;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
  resetDraft: () => void;
};

const OnboardingDraftContext = createContext<OnboardingDraftStore | null>(null);

function readDraft(): OnboardingDraft {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultOnboardingDraft };
    return { ...defaultOnboardingDraft, ...JSON.parse(stored) } as OnboardingDraft;
  } catch {
    return { ...defaultOnboardingDraft };
  }
}

function useOnboardingDraftState(initialDraft?: OnboardingDraft): OnboardingDraftStore {
  const [draft, setDraft] = useState<OnboardingDraft>({ ...defaultOnboardingDraft });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const local = readDraft();
      const next = initialDraft?.businessId
        ? { ...local, ...initialDraft }
        : { ...local, businessId: "" };
      setDraft(next);
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The flow can continue if browser session storage is unavailable.
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialDraft]);

  const updateDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The flow can continue if browser session storage is unavailable.
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
      // Reset the in-memory draft even if browser storage is unavailable.
    }
  }, []);

  return { draft, ready, updateDraft, resetDraft };
}

export function OnboardingDraftProvider({ children, initialDraft }: { children: ReactNode; initialDraft?: OnboardingDraft }) {
  const store = useOnboardingDraftState(initialDraft);
  return createElement(OnboardingDraftContext.Provider, { value: store }, children);
}

export function useOnboardingDraft() {
  const store = useContext(OnboardingDraftContext);
  if (!store) throw new Error("useOnboardingDraft debe usarse dentro de OnboardingDraftProvider.");
  return store;
}
