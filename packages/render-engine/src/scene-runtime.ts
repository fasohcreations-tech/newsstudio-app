/**
 * Scene Runtime — single source of truth for Canvas rendering.
 * No React. Loads the same Scene JSON (adapted) used by Story Preview.
 */

import type {
  FrameState,
  MotionSampler,
  RenderEngineLog,
  RuntimeClip,
  RuntimeLayer,
  RuntimeLayerFrame,
  RuntimePlan,
  RuntimeScene,
  SampledMotion,
  ShapeSampler,
} from "./types";

const IDENTITY_MOTION: SampledMotion = {
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scale: 1,
  rotateZ: 0,
  visible: true,
};

function defaultMotionSampler(layer: RuntimeLayer): SampledMotion {
  return {
    ...IDENTITY_MOTION,
    opacity: layer.transform.opacity,
    visible: layer.visible,
  };
}

function clipAt(plan: RuntimePlan, timeMs: number): RuntimeClip | null {
  return (
    plan.clips.find((c) => timeMs >= c.startMs && timeMs < c.endMs) ??
    plan.clips.find((c) => timeMs === c.endMs) ??
    plan.clips[plan.clips.length - 1] ??
    null
  );
}

function layerVisibleAt(layer: RuntimeLayer, scenePlayheadMs: number): boolean {
  if (!layer.visible) return false;
  if (scenePlayheadMs < layer.startMs) return false;
  if (layer.endMs > 0 && scenePlayheadMs > layer.endMs) return false;
  return true;
}

export type SceneRuntimeOptions = {
  plan: RuntimePlan;
  motionSampler?: MotionSampler;
  shapeSampler?: ShapeSampler;
  onLog?: RenderEngineLog;
};

/**
 * Holds loaded scenes, bindings, and media handles. Advances only via
 * `update(playheadMs)` — never wall-clock.
 */
export class SceneRuntime {
  readonly plan: RuntimePlan;
  private motionSampler: MotionSampler;
  private shapeSampler: ShapeSampler | null;
  private onLog?: RenderEngineLog;
  private ready = false;
  private media = new Map<string, HTMLImageElement | HTMLVideoElement>();

  constructor(opts: SceneRuntimeOptions) {
    this.plan = opts.plan;
    this.motionSampler = opts.motionSampler ?? defaultMotionSampler;
    this.shapeSampler = opts.shapeSampler ?? null;
    this.onLog = opts.onLog;
  }

  get isReady() {
    return this.ready;
  }

  getMedia(url: string) {
    return this.media.get(url) ?? null;
  }

  setMedia(url: string, el: HTMLImageElement | HTMLVideoElement) {
    this.media.set(url, el);
  }

  sceneForClip(clip: RuntimeClip | null): RuntimeScene | null {
    if (!clip) return null;
    return this.plan.scenes[clip.sceneId] ?? null;
  }

  /** Mark runtime READY after assets / fonts / samplers are bound. */
  markReady() {
    this.ready = true;
    this.onLog?.(
      `Scene Runtime Ready — ${Object.keys(this.plan.scenes).length} scene(s), ${this.plan.clips.length} clip(s)`,
    );
  }

  /**
   * Evaluate the entire scene graph at Timeline playheadMs.
   * This is the only tick entry point.
   */
  update(playheadMs: number, frameIndex = 0): FrameState {
    const clip = clipAt(this.plan, playheadMs);
    const scene = this.sceneForClip(clip);
    const scenePlayheadMs = clip
      ? Math.max(0, playheadMs - clip.startMs)
      : playheadMs;

    const layers: RuntimeLayerFrame[] = [];
    if (scene) {
      const sorted = [...scene.layers].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      for (const layer of sorted) {
        if (!layerVisibleAt(layer, scenePlayheadMs)) continue;

        let shape = layer.shape;
        if (this.shapeSampler) {
          shape = this.shapeSampler(layer, scenePlayheadMs) ?? shape;
        }

        const motion = this.motionSampler(
          { ...layer, shape },
          scenePlayheadMs,
        );
        if (!motion.visible) continue;

        layers.push({
          ...layer,
          shape,
          motion,
          drawn: false,
        });
      }
    }

    return {
      playheadMs,
      frameIndex,
      clip,
      scene,
      scenePlayheadMs,
      layers,
    };
  }
}
