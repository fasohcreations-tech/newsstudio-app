/**
 * Canvas Render Engine V2 capture session.
 * Implements the same paintFrame bridge as the DOM host — no React tree.
 */

import { getComposerSceneAction } from "@/features/scene-composer/actions/scene-composer.actions";
import { sampleLayerMotion } from "@/features/scene-composer/lib/motion-animation";
import {
  getShapeConfig,
  sampleShapeBehaviors,
  sampleShapeReveal,
} from "@/features/scene-composer/lib/shape-composer";
import type { ComposerScene } from "@/features/scene-composer/types/scene-composer.types";
import { extendComposerSceneForDuration } from "@/features/story-scene-builder/lib/extend-scene-duration";
import { buildRuntimePlan } from "@/features/video-render-export/lib/scene-to-runtime";
import type { CaptureFrameReport } from "@/features/video-render-export/services/browser-render-worker";
import type {
  RenderPlan,
  RenderPlanClip,
} from "@/features/video-render-export/types/render.types";
import {
  CanvasRenderer,
  SceneRuntime,
  ensureFontsLoaded,
  type RuntimeLayer,
  type RuntimeShape,
  type SampledMotion,
} from "@mediaos/render-engine";

const COMPOSED_CAPTURE_ENGINE_V2 = "canvas-runtime-v2";

export { COMPOSED_CAPTURE_ENGINE_V2 };

function clipAt(plan: RenderPlan, timeMs: number): RenderPlanClip | null {
  return (
    plan.clips.find((c) => timeMs >= c.startMs && timeMs < c.endMs) ??
    plan.clips.find((c) => timeMs === c.endMs) ??
    null
  );
}

async function loadMediaElement(
  url: string,
  kind: "video" | "image",
): Promise<HTMLImageElement | HTMLVideoElement | null> {
  const proxy = `/api/render-media-proxy?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxy);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    if (kind === "image") {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image load failed"));
        img.src = objUrl;
      });
      return img;
    }
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objUrl;
    await new Promise<void>((resolve) => {
      const done = () => {
        video.removeEventListener("loadeddata", done);
        resolve();
      };
      video.addEventListener("loadeddata", done);
      window.setTimeout(done, 8000);
      video.load();
    });
    return video;
  } catch {
    return null;
  }
}

/**
 * Build motion / shape samplers that call the SAME MediaOS libraries used by
 * StoryLivePreview — no duplicated animation math.
 */
function createMediaOsSamplers(scenes: Record<string, ComposerScene>) {
  const objectByLayerId = new Map<
    string,
    { sceneId: string; objectId: string }
  >();

  for (const [sceneId, scene] of Object.entries(scenes)) {
    for (const obj of scene.composer_document?.objects ?? []) {
      objectByLayerId.set(obj.id, { sceneId, objectId: obj.id });
    }
  }

  const findObject = (layer: RuntimeLayer) => {
    const ref = objectByLayerId.get(layer.id);
    if (!ref) return null;
    const scene = scenes[ref.sceneId];
    return (
      scene?.composer_document?.objects.find((o) => o.id === ref.objectId) ??
      null
    );
  };

  const sampleMotion = (layer: RuntimeLayer, playheadMs: number): SampledMotion => {
    const obj = findObject(layer);
    if (!obj) {
      return {
        opacity: layer.transform.opacity,
        translateX: 0,
        translateY: 0,
        scale: layer.transform.scale || 1,
        rotateZ: layer.transform.rotation || 0,
        visible: layer.visible,
      };
    }
    const m = sampleLayerMotion(obj, playheadMs, { mode: "playback" });
    return {
      opacity: m.opacity,
      translateX: m.translateX,
      translateY: m.translateY,
      scale: m.scale,
      rotateZ: m.rotateZ ?? m.rotate,
      rotateX: m.rotateX,
      rotateY: m.rotateY,
      visible: m.visible,
      clipPath: m.clipPath,
      filter: m.filter,
    };
  };

  const sampleShape = (
    layer: RuntimeLayer,
    playheadMs: number,
  ): RuntimeShape | null => {
    const obj = findObject(layer);
    if (!obj) return layer.shape ?? null;
    const cfg = getShapeConfig(obj);
    if (!cfg?.enabled) return layer.shape ?? null;

    const box = {
      width: layer.transform.width,
      height: layer.transform.height,
    };
    const behaviour = sampleShapeBehaviors(cfg, playheadMs, box);
    const reveal = sampleShapeReveal(cfg, playheadMs, {
      width: box.width,
      height: box.height,
    });

    const base = layer.shape ?? {
      enabled: true,
      kind: cfg.kind,
      fill: cfg.fill,
      stroke: cfg.strokeColor,
      strokeWidth: cfg.strokeWidth,
    };

    return {
      ...base,
      revealProgress: reveal.phaseProgress,
      behaviour: {
        opacity: behaviour.opacity * reveal.shapeOpacity,
        translateX: behaviour.translateX + reveal.shapeTranslateX,
        translateY: behaviour.translateY + reveal.shapeTranslateY,
        scale:
          ((behaviour.scaleX + behaviour.scaleY) / 2) *
          ((reveal.shapeScaleX + reveal.shapeScaleY) / 2),
        rotation: 0,
        lightSweepProgress: behaviour.lightSweepProgress ?? null,
        edgeSweepProgress: behaviour.activeTypes.includes("edge_sweep")
          ? behaviour.progress
          : null,
      },
    };
  };

  return { sampleMotion, sampleShape };
}

export type CanvasCaptureSessionApi = {
  warmUp: (plan: RenderPlan) => Promise<void>;
  paintFrame: (
    timeMs: number,
    dest: HTMLCanvasElement,
  ) => Promise<CaptureFrameReport>;
  verifyReadiness: (plan: RenderPlan) => Promise<void>;
  engineId: string;
};

export function createCanvasCaptureSession(
  onLog?: (message: string) => void,
): CanvasCaptureSessionApi {
  const sceneCache: Record<string, ComposerScene> = {};
  let plan: RenderPlan | null = null;
  let runtime: SceneRuntime | null = null;
  let renderer: CanvasRenderer | null = null;
  let offscreen: HTMLCanvasElement | null = null;

  const log = (m: string) => onLog?.(m);

  return {
    engineId: COMPOSED_CAPTURE_ENGINE_V2,

    async warmUp(next) {
      plan = next;
      log(`Capture engine: ${COMPOSED_CAPTURE_ENGINE_V2}`);
      log(
        `Warm-up: ${next.clips.length} clip(s), ${next.width}×${next.height}, ${(next.durationMs / 1000).toFixed(1)}s`,
      );

      const ids = [
        ...new Set(
          next.clips
            .map((c) => c.motionSceneId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      for (const id of ids) {
        if (sceneCache[id]) continue;
        log(`Loading composer scene ${id.slice(0, 8)}…`);
        const result = await getComposerSceneAction(id);
        if (result.success && result.data) {
          const clip = next.clips.find((c) => c.motionSceneId === id);
          sceneCache[id] = extendComposerSceneForDuration(
            result.data,
            clip?.durationMs ?? result.data.duration_ms ?? 10_000,
          );
          log(
            `Scene Initialized ${id.slice(0, 8)} (${result.data.name ?? "untitled"})`,
          );
        } else {
          log(
            `Composer scene ${id.slice(0, 8)} failed: ${result.success === false ? result.error : "missing"}`,
          );
        }
      }

      const runtimePlan = buildRuntimePlan(next, sceneCache);
      const samplers = createMediaOsSamplers(sceneCache);
      runtime = new SceneRuntime({
        plan: runtimePlan,
        motionSampler: samplers.sampleMotion,
        shapeSampler: samplers.sampleShape,
        onLog: log,
      });

      offscreen = document.createElement("canvas");
      offscreen.width = next.width;
      offscreen.height = next.height;
      renderer = new CanvasRenderer({
        canvas: offscreen,
        runtime,
        exportRaw: false,
      });

      // Bind clip media
      for (const clip of next.clips) {
        if (clip.videoUrl) {
          const el = await loadMediaElement(clip.videoUrl, "video");
          if (el) {
            runtime.setMedia(clip.videoUrl, el);
            log(`Video bound ${clip.name}`);
          } else {
            log(`Video bind failed ${clip.name}`);
          }
        }
        if (clip.imageUrl) {
          const el = await loadMediaElement(clip.imageUrl, "image");
          if (el) runtime.setMedia(clip.imageUrl, el);
        }
        if (clip.logoUrl) {
          const el = await loadMediaElement(clip.logoUrl, "image");
          if (el) runtime.setMedia(clip.logoUrl, el);
        }
      }

      // Bind layer media URLs
      for (const scene of Object.values(runtimePlan.scenes)) {
        for (const layer of scene.layers) {
          if (!layer.mediaUrl || runtime.getMedia(layer.mediaUrl)) continue;
          const el = await loadMediaElement(
            layer.mediaUrl,
            layer.mediaKind === "video" ? "video" : "image",
          );
          if (el) runtime.setMedia(layer.mediaUrl, el);
        }
      }

      await ensureFontsLoaded([
        "Segoe UI",
        "Noto Sans Malayalam",
        "Manjari",
        "system-ui",
      ]);
      runtime.markReady();
      log("✓ Warm-up complete (Canvas Runtime V2)");
    },

    async verifyReadiness(next) {
      if (!runtime?.isReady) {
        await this.warmUp(next);
      }
      log("✓ Runtime Ready — Canvas Scene Runtime (no React / DOM capture)");
      log("✓ Animation Clock Started — sampleLayerMotion via playheadMs");
      log("✓ Behaviour Clock Started — sampleShapeBehaviors via playheadMs");
      log("✓ Shape Clock Started — sampleShapeReveal via playheadMs");
      log("✓ Capture Started — CanvasRenderer.present");
    },

    async paintFrame(timeMs, dest) {
      if (!plan || !runtime || !renderer || !offscreen) {
        throw new Error("Canvas capture session not warmed up");
      }

      const clip = clipAt(plan, timeMs);
      const offset = clip ? Math.max(0, timeMs - clip.startMs) : timeMs;
      const state = runtime.update(timeMs, 0);
      const t0 = performance.now();
      await renderer.present(state);
      const rasterMs = performance.now() - t0;

      const dctx = dest.getContext("2d", { alpha: false });
      if (dctx) {
        if (dest.width !== plan.width || dest.height !== plan.height) {
          dest.width = plan.width;
          dest.height = plan.height;
        }
        dctx.drawImage(offscreen, 0, 0);
      }

      const scene = clip?.motionSceneId
        ? sceneCache[clip.motionSceneId]
        : null;
      const layers = state.layers;
      return {
        sceneName: scene?.name ?? clip?.name ?? null,
        motionSceneId: clip?.motionSceneId ?? null,
        scenePlayheadMs: offset,
        layers: layers.length,
        shapeLayers: layers.filter((l) => l.shape?.enabled).length,
        behaviourLayers: layers.filter((l) => l.shape?.behaviour).length,
        motionLayers: layers.filter((l) => l.motion.visible).length,
        videoTimeMs: null,
        rasterMode: "canvas-runtime",
        rasterMs,
      };
    },
  };
}
