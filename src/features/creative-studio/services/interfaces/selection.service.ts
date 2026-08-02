import type { TimelineSelection } from "@/features/creative-studio/types/timeline-engine.types";

/**
 * Timeline selection state — clips, tracks, markers, playhead.
 * Client-side contract; server has no selection persistence.
 */
export interface SelectionService {
  getSelection(): TimelineSelection;

  selectClip(clipId: string, additive?: boolean): void;
  selectTrack(trackId: string, additive?: boolean): void;
  selectMarker(markerId: string, additive?: boolean): void;
  clearSelection(): void;
  selectAllInTrack(trackId: string): void;

  setPlayhead(ms: number): void;
  setClipIds(clipIds: string[]): void;

  subscribe(listener: (selection: TimelineSelection) => void): () => void;
}

export type { TimelineSelection };
