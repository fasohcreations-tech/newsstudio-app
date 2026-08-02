"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_TIMELINE_HEIGHT,
  STUDIO_LAYOUT_STORAGE_KEY,
} from "@/features/creative-studio/constants/creative-studio.constants";
import type { StudioLayoutState } from "@/features/creative-studio/types/creative-studio.types";
import { usePersistedState } from "@/features/platform/hooks/use-persisted-state";

const DEFAULT_LAYOUT: StudioLayoutState = {
  leftPanelTab: "explorer",
  leftPanelWidth: 280,
  rightPanelWidth: 300,
  timelineHeight: DEFAULT_TIMELINE_HEIGHT,
  snapEnabled: true,
  rippleEnabled: false,
  zoomLevel: 1,
};

export function useStudioLayout() {
  const [layout, setLayout] = usePersistedState<StudioLayoutState>(
    STUDIO_LAYOUT_STORAGE_KEY,
    DEFAULT_LAYOUT,
  );

  const setLeftTab = useCallback(
    (leftPanelTab: StudioLayoutState["leftPanelTab"]) => {
      setLayout((prev) => ({ ...prev, leftPanelTab }));
    },
    [setLayout],
  );

  const setTimelineHeight = useCallback(
    (timelineHeight: number) => {
      setLayout((prev) => ({ ...prev, timelineHeight }));
    },
    [setLayout],
  );

  const toggleSnap = useCallback(() => {
    setLayout((prev) => ({ ...prev, snapEnabled: !prev.snapEnabled }));
  }, [setLayout]);

  const toggleRipple = useCallback(() => {
    setLayout((prev) => ({ ...prev, rippleEnabled: !prev.rippleEnabled }));
  }, [setLayout]);

  const setZoom = useCallback(
    (zoomLevel: number) => {
      setLayout((prev) => ({ ...prev, zoomLevel }));
    },
    [setLayout],
  );

  return {
    layout,
    setLayout,
    setLeftTab,
    setTimelineHeight,
    toggleSnap,
    toggleRipple,
    setZoom,
  };
}
