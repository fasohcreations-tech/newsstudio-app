"use client";

import { useCallback, useEffect, useState } from "react";

import { EDITOR_ZOOM_LEVELS } from "@/features/scene-composer/components/editor/editor.constants";
import type {
  ComposerSelectionState,
  ComposerViewportState,
} from "@/features/scene-composer/types/scene-composer.types";
import { createCanvasService } from "@/features/scene-composer/services/canvas.service.impl";

const canvasService = createCanvasService();

export function useComposerCanvas() {
  const [viewport, setViewport] = useState<ComposerViewportState>({
    panX: 0,
    panY: 0,
    zoom: 1,
    snapEnabled: true,
    gridVisible: true,
    rulersVisible: true,
    guidesVisible: true,
    safeAreaVisible: true,
  });

  const [selection, setSelection] = useState<ComposerSelectionState>({
    selectedObjectIds: [],
    primaryObjectId: null,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        event.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpaceHeld(false);
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const selectObject = useCallback((id: string | null, additive = false) => {
    if (!id) {
      setSelection({ selectedObjectIds: [], primaryObjectId: null });
      return;
    }
    setSelection((prev) => {
      if (!additive) {
        return { selectedObjectIds: [id], primaryObjectId: id };
      }
      const exists = prev.selectedObjectIds.includes(id);
      const selectedObjectIds = exists
        ? prev.selectedObjectIds.filter((item) => item !== id)
        : [...prev.selectedObjectIds, id];
      return {
        selectedObjectIds,
        primaryObjectId: selectedObjectIds[0] ?? null,
      };
    });
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(0.25, Math.min(2, prev.zoom + delta)),
    }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(0.25, Math.min(2, zoom)),
    }));
  }, []);

  const setFitZoom = useCallback((zoom: number) => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(3, zoom)),
      panX: 0,
      panY: 0,
    }));
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  }, []);

  const toggle = useCallback(
    (
      key: keyof Pick<
        ComposerViewportState,
        | "gridVisible"
        | "rulersVisible"
        | "guidesVisible"
        | "safeAreaVisible"
        | "snapEnabled"
      >,
    ) => {
      setViewport((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  const cycleZoom = useCallback((direction: 1 | -1) => {
    setViewport((prev) => {
      const levels = [...EDITOR_ZOOM_LEVELS];
      let index = levels.findIndex((level) => Math.abs(level - prev.zoom) < 0.01);
      if (index < 0) {
        index = levels.findIndex((level) => level > prev.zoom);
        if (index < 0) index = levels.length - 1;
      }
      const next = levels[Math.max(0, Math.min(levels.length - 1, index + direction))];
      return { ...prev, zoom: next };
    });
  }, []);

  return {
    viewport,
    selection,
    isPanning,
    spaceHeld,
    setIsPanning,
    selectObject,
    zoomBy,
    panBy,
    setViewport,
    setZoom,
    setFitZoom,
    toggle,
    cycleZoom,
    canvasService,
  };
}
