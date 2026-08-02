import type { SelectionService } from "@/features/creative-studio/services/interfaces/selection.service";
import type { TimelineSelection } from "@/features/creative-studio/types/timeline-engine.types";

const EMPTY: TimelineSelection = {
  clipIds: [],
  trackIds: [],
  markerIds: [],
  playheadMs: 0,
};

export class LocalSelectionService implements SelectionService {
  private selection: TimelineSelection = { ...EMPTY };
  private listeners = new Set<(s: TimelineSelection) => void>();

  private emit() {
    for (const listener of this.listeners) listener(this.selection);
  }

  getSelection() {
    return this.selection;
  }

  selectClip(clipId: string, additive = false) {
    this.selection = {
      ...this.selection,
      clipIds: additive
        ? [...new Set([...this.selection.clipIds, clipId])]
        : [clipId],
      trackIds: additive ? this.selection.trackIds : [],
      markerIds: additive ? this.selection.markerIds : [],
    };
    this.emit();
  }

  selectTrack(trackId: string, additive = false) {
    this.selection = {
      ...this.selection,
      trackIds: additive
        ? [...new Set([...this.selection.trackIds, trackId])]
        : [trackId],
      clipIds: additive ? this.selection.clipIds : [],
      markerIds: additive ? this.selection.markerIds : [],
    };
    this.emit();
  }

  selectMarker(markerId: string, additive = false) {
    this.selection = {
      ...this.selection,
      markerIds: additive
        ? [...new Set([...this.selection.markerIds, markerId])]
        : [markerId],
    };
    this.emit();
  }

  clearSelection() {
    this.selection = {
      ...this.selection,
      clipIds: [],
      trackIds: [],
      markerIds: [],
    };
    this.emit();
  }

  selectAllInTrack(_trackId: string) {
    // Populated by timeline engine with track clip ids
    this.emit();
  }

  setPlayhead(ms: number) {
    this.selection = { ...this.selection, playheadMs: ms };
    this.emit();
  }

  setClipIds(clipIds: string[]) {
    this.selection = { ...this.selection, clipIds };
    this.emit();
  }

  subscribe(listener: (selection: TimelineSelection) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function createSelectionService(): SelectionService {
  return new LocalSelectionService();
}
