"use client";

/**
 * Thin React shell that exposes CanvasCaptureSession via ref.
 * No StoryLivePreview — rendering is pure Canvas Runtime V2.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import type { ComposedSceneCaptureApi } from "@/features/video-render-export/components/composed-scene-capture-host";
import {
  COMPOSED_CAPTURE_ENGINE_V2,
  createCanvasCaptureSession,
} from "@/features/video-render-export/services/canvas-capture-session";

type Props = {
  onLog?: (message: string) => void;
};

export const CanvasSceneCaptureHost = forwardRef<
  ComposedSceneCaptureApi,
  Props
>(function CanvasSceneCaptureHost({ onLog }, ref) {
  const logRef = useRef(onLog);
  logRef.current = onLog;
  const sessionRef = useRef(
    createCanvasCaptureSession((m) => logRef.current?.(m)),
  );

  useEffect(() => {
    logRef.current?.(
      `Canvas host mounted — engine ${COMPOSED_CAPTURE_ENGINE_V2}`,
    );
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      warmUp: (plan) => sessionRef.current.warmUp(plan),
      paintFrame: (timeMs, dest) => sessionRef.current.paintFrame(timeMs, dest),
      verifyReadiness: (plan) => sessionRef.current.verifyReadiness(plan),
    }),
    [],
  );

  // Off-screen placeholder so the host participates in the React tree without
  // mounting StoryLivePreview.
  return (
    <div
      aria-hidden
      data-capture-engine={COMPOSED_CAPTURE_ENGINE_V2}
      style={{
        position: "fixed",
        left: -10_000,
        top: 0,
        width: 1,
        height: 1,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 0,
      }}
    />
  );
});
