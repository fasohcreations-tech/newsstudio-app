"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AUTOSAVE_INTERVAL_MS } from "@/features/smart-editor/constants/editor.constants";
import type { MediaOSEditorChangePayload } from "@/features/smart-editor/types/editor.types";

type UseAutoSaveOptions = {
  enabled: boolean;
  dirty: boolean;
  intervalMs?: number;
  getPayload: () => MediaOSEditorChangePayload | null;
  onSave: (payload: MediaOSEditorChangePayload) => void | Promise<void>;
  onSaved?: () => void;
};

export function useAutoSave({
  enabled,
  dirty,
  intervalMs = AUTOSAVE_INTERVAL_MS,
  getPayload,
  onSave,
  onSaved,
}: UseAutoSaveOptions) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const saveNow = useCallback(async () => {
    if (savingRef.current) return;
    const payload = getPayload();
    if (!payload) return;
    savingRef.current = true;
    setStatus("saving");
    setError(null);
    try {
      await onSave(payload);
      setStatus("saved");
      onSaved?.();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Autosave failed");
    } finally {
      savingRef.current = false;
    }
  }, [getPayload, onSave, onSaved]);

  useEffect(() => {
    if (!enabled || !dirty) return;
    const id = window.setInterval(() => {
      void saveNow();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [dirty, enabled, intervalMs, saveNow]);

  return { status, error, saveNow };
}
