"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createPreviewService } from "@/features/creative-studio/services/preview.service.impl";
import type { LocalPreviewService } from "@/features/creative-studio/services/preview.service.impl";
import type { PreviewState } from "@/features/creative-studio/types/creative-studio.types";

type UsePreviewPlaybackOptions = {
  durationMs?: number;
  frameRate?: number;
  resolutionWidth?: number;
  resolutionHeight?: number;
  initialPlayheadMs?: number;
};

export function usePreviewPlayback({
  durationMs = 60_000,
  frameRate = 25,
  resolutionWidth = 1920,
  resolutionHeight = 1080,
  initialPlayheadMs = 0,
}: UsePreviewPlaybackOptions = {}) {
  const serviceRef = useRef<LocalPreviewService | null>(null);

  if (!serviceRef.current) {
    serviceRef.current = createPreviewService({
      durationMs,
      frameRate,
      resolution: { width: resolutionWidth, height: resolutionHeight },
      playheadMs: initialPlayheadMs,
    }) as LocalPreviewService;
  }

  const service = serviceRef.current;
  const [state, setState] = useState<PreviewState>(service.getState());

  useEffect(() => {
    service.configure({
      durationMs,
      frameRate,
      resolution: { width: resolutionWidth, height: resolutionHeight },
    });
  }, [service, durationMs, frameRate, resolutionWidth, resolutionHeight]);

  useEffect(() => {
    const unsubscribe = service.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, [service]);

  const play = useCallback(() => service.play(), [service]);
  const pause = useCallback(() => service.pause(), [service]);
  const togglePlay = useCallback(() => service.togglePlay(), [service]);
  const stepFrame = useCallback(
    (direction: "back" | "forward") => service.stepFrame(direction),
    [service],
  );
  const seek = useCallback((ms: number) => service.seek(ms), [service]);
  const toggleSafeArea = useCallback(() => service.toggleSafeArea(), [service]);
  const toggleFullscreen = useCallback(() => service.toggleFullscreen(), [service]);
  const setFullscreen = useCallback(
    (isFullscreen: boolean) => service.configure({ isFullscreen }),
    [service],
  );

  return {
    state,
    service,
    play,
    pause,
    togglePlay,
    stepFrame,
    seek,
    toggleSafeArea,
    toggleFullscreen,
    setFullscreen,
  };
}

function formatTimecode(ms: number, fps: number): string {
  const totalFrames = Math.floor((ms / 1000) * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

export { formatTimecode };
