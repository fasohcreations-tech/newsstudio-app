/**
 * Frame Scheduler — Timeline Playhead is the ONLY clock.
 * Never uses Date.now / setInterval / setTimeout for animation state.
 */

import { CanvasRenderer } from "./canvas/canvas-renderer";
import type { SceneRuntime } from "./scene-runtime";
import type { RawFramePacket, RenderEngineLog } from "./types";

export type FrameSchedulerCallbacks = {
  onFrame?: (packet: RawFramePacket | null, frameIndex: number, playheadMs: number) => void | Promise<void>;
  onProgress?: (ratio: number, frameIndex: number, total: number) => void;
  shouldCancel?: () => boolean;
  onLog?: RenderEngineLog;
};

export type FrameSchedulerResult = {
  frameCount: number;
  durationMs: number;
  /** Wall time for the job only — not used as an animation clock. */
  elapsedWallMs: number;
};

/**
 * Deterministic frame loop:
 * playheadMs → Update Runtime → Render Canvas → Export Frame
 */
export class FrameScheduler {
  constructor(
    private runtime: SceneRuntime,
    private renderer: CanvasRenderer,
  ) {}

  async run(callbacks: FrameSchedulerCallbacks = {}): Promise<FrameSchedulerResult> {
    const { plan } = this.runtime;
    const fps = Math.max(1, Math.round(plan.frameRate) || 24);
    const frameDuration = 1000 / fps;
    const total = Math.max(1, Math.ceil(plan.durationMs / frameDuration));
    const wallStart = performance.now();

    callbacks.onLog?.(
      `Frame Scheduler — ${total} frames @ ${fps}fps · ${(plan.durationMs / 1000).toFixed(1)}s`,
    );

    let emitted = 0;
    for (let i = 0; i < total; i += 1) {
      if (callbacks.shouldCancel?.()) {
        callbacks.onLog?.("Frame Scheduler cancelled");
        break;
      }

      const playheadMs = Math.min(plan.durationMs, Math.round(i * frameDuration));
      const state = this.runtime.update(playheadMs, i);
      const packet = await this.renderer.present(state);
      await callbacks.onFrame?.(packet, i, playheadMs);
      emitted += 1;

      if (i === 0 || i === total - 1 || i % fps === 0) {
        callbacks.onProgress?.(emitted / total, i, total);
      }
    }

    return {
      frameCount: emitted,
      durationMs: plan.durationMs,
      elapsedWallMs: performance.now() - wallStart,
    };
  }
}
