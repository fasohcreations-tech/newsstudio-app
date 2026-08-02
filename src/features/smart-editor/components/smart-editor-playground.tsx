"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MediaOSEditor } from "@/features/smart-editor/components/mediaos-editor";
import type { MediaOSEditorChangePayload } from "@/features/smart-editor/types/editor.types";

const DEMO_STORAGE_KEY = "mediaos.smart-editor.demo-draft";

function loadDemoHtml() {
  if (typeof window === "undefined") return DEMO_SEED;
  try {
    return window.localStorage.getItem(DEMO_STORAGE_KEY) || DEMO_SEED;
  } catch {
    return DEMO_SEED;
  }
}

const DEMO_SEED = `<h2>മലയാളം വാർത്ത ഡെമോ</h2><p>Type Manglish like <strong>daivam</strong> then press Space, or use Voice / Handwriting from the sidebar.</p><p></p>`;

export function SmartEditorPlayground() {
  // Seed SSR-safe, then hydrate the stored draft after mount (localStorage differs from server HTML).
  const [html, setHtml] = useState(DEMO_SEED);
  const [ready, setReady] = useState(false);
  const [contentObjectId, setContentObjectId] = useState<string | undefined>();

  useEffect(() => {
    setHtml(loadDemoHtml());
    setReady(true);
  }, []);

  const handleSave = useCallback(async (payload: MediaOSEditorChangePayload) => {
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, payload.contentHtml);
      setContentObjectId((id) => id ?? `local-demo-${Date.now()}`);
      toast.message("Draft autosaved locally", {
        description: `${payload.wordCount} words · rev ${payload.revision}`,
      });
    } catch {
      toast.error("Could not save demo draft");
    }
  }, []);

  return (
    <MediaOSEditor
      key={ready ? "draft" : "seed"}
      variant="full"
      initialHtml={html}
      initialLanguage="ml"
      contentObjectId={contentObjectId}
      placeholder="Write Malayalam news copy — Unicode, Manglish, voice, or handwriting…"
      onSave={handleSave}
      settings={{
        enableVoiceDictation: true,
        enableManglish: true,
        enableHandwriting: true,
        autoSave: true,
        autoTransliteration: true,
        toolbarLayout: "full",
        defaultLanguage: "ml",
      }}
    />
  );
}
