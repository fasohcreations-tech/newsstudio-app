"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Persist JSON-serializable state in localStorage (client-only).
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        setState(JSON.parse(raw) as T);
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, [key]);

  const setPersisted = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        if (hydrated || typeof window !== "undefined") {
          try {
            window.localStorage.setItem(key, JSON.stringify(next));
          } catch {
            // quota / private mode
          }
        }
        return next;
      });
    },
    [key, hydrated],
  );

  return [state, setPersisted];
}
