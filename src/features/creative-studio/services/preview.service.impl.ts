import type { PreviewService, PreviewFrameStep } from "@/features/creative-studio/services/interfaces/preview.service";
import type { PreviewState } from "@/features/creative-studio/types/creative-studio.types";

/**
 * In-memory preview controller with frame-accurate timing.
 */
export class LocalPreviewService implements PreviewService {
  private state: PreviewState;
  private listeners = new Set<(state: PreviewState) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private rafId: number | null = null;
  private lastTick = 0;

  constructor(initial?: Partial<PreviewState>) {
    this.state = {
      isPlaying: false,
      playheadMs: 0,
      durationMs: 60_000,
      resolution: { width: 1920, height: 1080 },
      frameRate: 25,
      safeAreaVisible: false,
      isFullscreen: false,
      ...initial,
    };
  }

  private emit() {
    for (const listener of this.listeners) listener(this.state);
  }

  play() {
    if (this.state.isPlaying) return;
    this.state = { ...this.state, isPlaying: true };
    this.emit();
    this.lastTick = performance.now();

    const tick = (now: number) => {
      if (!this.state.isPlaying) return;
      const delta = now - this.lastTick;
      this.lastTick = now;
      const next = this.state.playheadMs + delta;
      if (next >= this.state.durationMs) {
        this.state = { ...this.state, playheadMs: this.state.durationMs };
        this.pause();
      } else {
        this.state = { ...this.state, playheadMs: next };
      }
      this.emit();
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  pause() {
    this.state = { ...this.state, isPlaying: false };
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.emit();
  }

  togglePlay() {
    if (this.state.isPlaying) this.pause();
    else this.play();
  }

  stepFrame(direction: PreviewFrameStep) {
    const frameMs = 1000 / this.state.frameRate;
    const delta = direction === "back" ? -frameMs : frameMs;
    const next = Math.max(
      0,
      Math.min(this.state.durationMs, this.state.playheadMs + delta),
    );
    this.state = { ...this.state, playheadMs: next, isPlaying: false };
    this.emit();
  }

  seek(ms: number) {
    this.state = {
      ...this.state,
      playheadMs: Math.max(0, Math.min(this.state.durationMs, ms)),
    };
    this.emit();
  }

  toggleSafeArea() {
    this.state = {
      ...this.state,
      safeAreaVisible: !this.state.safeAreaVisible,
    };
    this.emit();
  }

  toggleFullscreen() {
    this.state = { ...this.state, isFullscreen: !this.state.isFullscreen };
    this.emit();
  }

  getState() {
    return this.state;
  }

  subscribe(listener: (state: PreviewState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  configure(patch: Partial<PreviewState>) {
    const next = { ...this.state, ...patch };
    const unchanged =
      next.isPlaying === this.state.isPlaying &&
      next.playheadMs === this.state.playheadMs &&
      next.durationMs === this.state.durationMs &&
      next.frameRate === this.state.frameRate &&
      next.safeAreaVisible === this.state.safeAreaVisible &&
      next.isFullscreen === this.state.isFullscreen &&
      next.resolution.width === this.state.resolution.width &&
      next.resolution.height === this.state.resolution.height;

    if (unchanged) return;

    this.state = next;
    this.emit();
  }
}

export function createPreviewService(
  initial?: Partial<PreviewState>,
): PreviewService {
  return new LocalPreviewService(initial);
}
