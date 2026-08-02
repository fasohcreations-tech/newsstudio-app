"use client";

import { useEffect, useRef } from "react";

import { updateTimelineSettingsAction } from "@/features/creative-studio/actions/timeline.actions";

type UseTimelinePersistOptions = {
  timelineId: string | null | undefined;
  playheadMs: number;
  zoomLevel: number;
  snapEnabled: boolean;
};

export function useTimelinePersist({
  timelineId,
  playheadMs,
  zoomLevel,
  snapEnabled,
}: UseTimelinePersistOptions) {
  const lastSaved = useRef({
    playheadMs: -1,
    zoomLevel: -1,
    snapEnabled: true as boolean,
  });

  useEffect(() => {
    if (!timelineId) return;

    const unchanged =
      lastSaved.current.playheadMs === playheadMs &&
      lastSaved.current.zoomLevel === zoomLevel &&
      lastSaved.current.snapEnabled === snapEnabled;

    if (unchanged) return;

    const timer = window.setTimeout(async () => {
      const result = await updateTimelineSettingsAction({
        timelineId,
        playheadMs,
        zoomLevel,
        snapEnabled,
      });

      if (result.success) {
        lastSaved.current = { playheadMs, zoomLevel, snapEnabled };
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [timelineId, playheadMs, zoomLevel, snapEnabled]);
}
