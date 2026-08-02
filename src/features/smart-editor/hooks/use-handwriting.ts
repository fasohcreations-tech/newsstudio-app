"use client";

import { useCallback, useRef, useState } from "react";

import type { HandwritingStroke } from "@/features/smart-editor/services/interfaces/editor-services";

/**
 * Handwriting canvas state — recognition provider loaded on demand.
 */
export function useHandwriting(locale: "ml" | "en" = "ml") {
  const [strokes, setStrokes] = useState<HandwritingStroke[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [result, setResult] = useState<string>("");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const currentStroke = useRef<HandwritingStroke>([]);

  const beginStroke = useCallback((x: number, y: number) => {
    currentStroke.current = [{ x, y, t: Date.now() }];
  }, []);

  const continueStroke = useCallback((x: number, y: number) => {
    currentStroke.current.push({ x, y, t: Date.now() });
  }, []);

  const endStroke = useCallback(() => {
    if (currentStroke.current.length === 0) return;
    const finished = [...currentStroke.current];
    currentStroke.current = [];
    setStrokes((prev) => [...prev, finished]);
  }, []);

  const clear = useCallback(() => {
    setStrokes([]);
    setResult("");
    setAlternatives([]);
    setError(null);
  }, []);

  const recognize = useCallback(
    async (width: number, height: number) => {
      if (strokes.length === 0) return "";
      setRecognizing(true);
      setError(null);
      try {
        const { getEditorProviders } = await import(
          "@/features/smart-editor/services/providers/registry"
        );
        const provider = getEditorProviders().handwriting;
        const out = await provider.recognize({
          strokes,
          width,
          height,
          locale,
        });
        setResult(out.text);
        setAlternatives(out.alternatives ?? []);
        return out.text;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Recognition failed");
        return "";
      } finally {
        setRecognizing(false);
      }
    },
    [locale, strokes],
  );

  return {
    strokes,
    recognizing,
    result,
    alternatives,
    error,
    beginStroke,
    continueStroke,
    endStroke,
    clear,
    recognize,
  };
}
