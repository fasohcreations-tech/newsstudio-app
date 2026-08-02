"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  MotionSceneWithRelations,
  SceneEditorState,
} from "@/features/motion-scene-engine/types/motion-scene.types";

export function useScenePreview(scene: MotionSceneWithRelations | null) {
  const [state, setState] = useState<SceneEditorState>({
    playheadMs: 0,
    durationMs: scene?.duration_ms ?? 5000,
    isPlaying: false,
    safeAreaVisible: true,
    gridVisible: true,
    zoom: 1,
    selectedLayerId: null,
  });

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      durationMs: scene?.duration_ms ?? 5000,
      playheadMs: Math.min(prev.playheadMs, scene?.duration_ms ?? 5000),
    }));
  }, [scene?.id, scene?.duration_ms]);

  const seek = useCallback((ms: number) => {
    setState((prev) => ({
      ...prev,
      playheadMs: Math.max(0, Math.min(prev.durationMs, ms)),
    }));
  }, []);

  const togglePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const selectLayer = useCallback((layerId: string | null) => {
    setState((prev) => ({ ...prev, selectedLayerId: layerId }));
  }, []);

  const toggleSafeArea = useCallback(() => {
    setState((prev) => ({
      ...prev,
      safeAreaVisible: !prev.safeAreaVisible,
    }));
  }, []);

  const toggleGrid = useCallback(() => {
    setState((prev) => ({ ...prev, gridVisible: !prev.gridVisible }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({
      ...prev,
      zoom: Math.max(0.25, Math.min(2, zoom)),
    }));
  }, []);

  return {
    state,
    seek,
    togglePlay,
    selectLayer,
    toggleSafeArea,
    toggleGrid,
    setZoom,
  };
}
