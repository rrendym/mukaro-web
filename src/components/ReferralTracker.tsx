"use client";

import { useEffect } from "react";

const REF_STORAGE_KEY = "mukaro_ref_code";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredReferral {
  code: string;
  expiresAt: number;
}

export function getStoredReferralCode(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as StoredReferral;
    if (!parsed.code || Date.now() > Number(parsed.expiresAt || 0)) {
      window.localStorage.removeItem(REF_STORAGE_KEY);
      return "";
    }
    return parsed.code;
  } catch {
    return "";
  }
}

export function ReferralTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && ref.trim()) {
        const payload: StoredReferral = {
          code: ref.trim().toUpperCase(),
          expiresAt: Date.now() + THIRTY_DAYS_MS,
        };
        window.localStorage.setItem(REF_STORAGE_KEY, JSON.stringify(payload));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  return null;
}
