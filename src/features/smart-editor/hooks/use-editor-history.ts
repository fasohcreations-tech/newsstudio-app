"use client";

import { useCallback, useState } from "react";

export type EditorHistoryEntry = {
  id: string;
  label: string;
  html: string;
  createdAt: string;
  revision: number;
};

/**
 * Version history placeholder — local snapshots until server history lands.
 */
export function useEditorHistory(maxEntries = 20) {
  const [entries, setEntries] = useState<EditorHistoryEntry[]>([]);

  const pushSnapshot = useCallback(
    (html: string, revision: number, label = "Autosave") => {
      const entry: EditorHistoryEntry = {
        id: `rev-${revision}-${Date.now()}`,
        label,
        html,
        createdAt: new Date().toISOString(),
        revision,
      };
      setEntries((prev) => [entry, ...prev].slice(0, maxEntries));
      return entry;
    },
    [maxEntries],
  );

  const clear = useCallback(() => setEntries([]), []);

  return { entries, pushSnapshot, clear };
}
