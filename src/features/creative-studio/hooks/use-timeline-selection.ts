"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createSelectionService } from "@/features/creative-studio/services/selection.service.impl";
import type { TimelineSelection } from "@/features/creative-studio/types/timeline-engine.types";

const selectionService = createSelectionService();

export function useTimelineSelection(initialPlayheadMs = 0) {
  const [selection, setSelection] = useState<TimelineSelection>(() => ({
    ...selectionService.getSelection(),
    playheadMs: initialPlayheadMs,
  }));

  useEffect(() => {
    return selectionService.subscribe(setSelection);
  }, []);

  const selectClip = useCallback((clipId: string, additive = false) => {
    selectionService.selectClip(clipId, additive);
  }, []);

  const selectTrack = useCallback((trackId: string, additive = false) => {
    selectionService.selectTrack(trackId, additive);
  }, []);

  const clearSelection = useCallback(() => {
    selectionService.clearSelection();
  }, []);

  const setPlayhead = useCallback((ms: number) => {
    selectionService.setPlayhead(ms);
  }, []);

  const primaryClipId = selection.clipIds[0] ?? null;

  return useMemo(
    () => ({
      selection,
      selectedClipIds: selection.clipIds,
      selectedTrackIds: selection.trackIds,
      primaryClipId,
      selectClip,
      selectTrack,
      clearSelection,
      setPlayhead,
    }),
    [
      selection,
      primaryClipId,
      selectClip,
      selectTrack,
      clearSelection,
      setPlayhead,
    ],
  );
}
