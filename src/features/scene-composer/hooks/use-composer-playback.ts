"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ComposerFrameRate = 30 | 60;

export function useComposerPlayback(
  durationMs: number,
  initialFrameRate: number = 30,
) {
  const [playheadMs, setPlayheadMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopPlayback, setLoopPlayback] = useState(false);
  const [frameRate, setFrameRateState] = useState<ComposerFrameRate>(
    initialFrameRate >= 60 ? 60 : 30,
  );
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    setPlayheadMs((prev) => Math.min(prev, durationMs));
  }, [durationMs]);

  useEffect(() => {
    setFrameRateState(initialFrameRate >= 60 ? 60 : 30);
  }, [initialFrameRate]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (lastTickRef.current == null) lastTickRef.current = now;
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      setPlayheadMs((prev) => {
        const next = prev + delta;
        if (next >= durationMs) {
          if (loopPlayback) return 0;
          setIsPlaying(false);
          return durationMs;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs, isPlaying, loopPlayback]);

  const seek = useCallback(
    (ms: number) => setPlayheadMs(Math.max(0, Math.min(durationMs, ms))),
    [durationMs],
  );

  const stepFrame = useCallback(
    (direction: "back" | "forward") => {
      const frameMs = 1000 / frameRate;
      setPlayheadMs((prev) => {
        const next =
          direction === "back" ? prev - frameMs : prev + frameMs;
        return Math.max(0, Math.min(durationMs, next));
      });
    },
    [durationMs, frameRate],
  );

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying((v) => !v), []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setPlayheadMs(0);
  }, []);

  const restart = useCallback(() => {
    setPlayheadMs(0);
    setIsPlaying(true);
  }, []);

  const setFrameRate = useCallback((fps: ComposerFrameRate) => {
    setFrameRateState(fps);
  }, []);

  const formatTimecode = useCallback(
    (ms: number) => {
      const totalFrames = Math.floor((ms / 1000) * frameRate);
      const frames = totalFrames % frameRate;
      const totalSeconds = Math.floor(ms / 1000);
      const seconds = totalSeconds % 60;
      const minutes = Math.floor(totalSeconds / 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
    },
    [frameRate],
  );

  return {
    playheadMs,
    isPlaying,
    loopPlayback,
    frameRate,
    durationMs,
    seek,
    stepFrame,
    play,
    pause,
    stop,
    restart,
    togglePlay,
    setLoopPlayback,
    setFrameRate,
    formatTimecode,
  };
}
