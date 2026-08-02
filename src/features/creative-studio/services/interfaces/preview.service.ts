import type { PreviewState } from "@/features/creative-studio/types/creative-studio.types";

export type PreviewFrameStep = "back" | "forward";

/**
 * Preview monitor — playback UI contract.
 * No actual video decode in foundation sprint.
 */
export interface PreviewService {
  play(): void;
  pause(): void;
  togglePlay(): void;
  stepFrame(direction: PreviewFrameStep): void;
  seek(ms: number): void;
  toggleSafeArea(): void;
  toggleFullscreen(): void;
  getState(): PreviewState;
  subscribe(listener: (state: PreviewState) => void): () => void;
  configure(patch: Partial<PreviewState>): void;
}
