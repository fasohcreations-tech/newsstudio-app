"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  SpeechLocale,
  SpeechSessionHandle,
} from "@/features/smart-editor/services/interfaces/editor-services";
import type { VoiceState } from "@/features/smart-editor/types/editor.types";

type UseVoiceInputOptions = {
  locale?: SpeechLocale;
  enabled?: boolean;
  onFinalTranscript?: (text: string) => void;
};

/**
 * Voice dictation hook — loads STT provider on demand (lazy).
 */
export function useVoiceInput({
  locale = "mixed",
  enabled = true,
  onFinalTranscript,
}: UseVoiceInputOptions = {}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<SpeechSessionHandle | null>(null);

  const start = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    try {
      const { getEditorProviders } = await import(
        "@/features/smart-editor/services/providers/registry"
      );
      const provider = getEditorProviders().speechToText;
      const available = await provider.isAvailable();
      if (!available) {
        setError("Speech provider unavailable");
        setState("error");
        return;
      }
      setLiveTranscript("");
      setState("recording");
      sessionRef.current = await provider.start({
        locale,
        onPartial: (chunk) => setLiveTranscript(chunk.text),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start recording");
      setState("error");
    }
  }, [enabled, locale]);

  const pause = useCallback(async () => {
    await sessionRef.current?.pause();
    setState("paused");
  }, []);

  const resume = useCallback(async () => {
    await sessionRef.current?.resume();
    setState("recording");
  }, []);

  const stop = useCallback(async () => {
    setState("processing");
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      setState("idle");
      return;
    }
    const final = await session.stop();
    setLiveTranscript(final.text);
    onFinalTranscript?.(final.text);
    setState("idle");
  }, [onFinalTranscript]);

  const cancel = useCallback(async () => {
    await sessionRef.current?.cancel();
    sessionRef.current = null;
    setLiveTranscript("");
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      void sessionRef.current?.cancel();
    };
  }, []);

  return {
    state,
    liveTranscript,
    error,
    start,
    pause,
    resume,
    stop,
    cancel,
    isActive: state === "recording" || state === "paused",
  };
}
