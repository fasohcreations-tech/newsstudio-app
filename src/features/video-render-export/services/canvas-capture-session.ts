/**
 * Canvas Render Engine V2 capture session.
 * Implements the same paintFrame bridge as the DOM host — no React tree.
 */

import { getComposerSceneAction } from "@/features/scene-composer/actions/scene-composer.actions";
import {
  findLowerInfoPanelObject,
  getObjectEffectStack,
  normalizeLightSweepParams,
  resolveHeadlineLightSweepCoverage,
  resolveLightSweepAngle,
  sampleBroadcastEffects,
} from "@/features/scene-composer/lib/broadcast-effects";
import {
  getEdgeSweepConfig,
  resolveEdgeSweepSideMargins,
} from "@/features/scene-composer/lib/edge-sweep";
import {
  getShapeConfig,
  resolveObjectShapeOutline,
  sampleShapePerimeter,
} from "@/features/scene-composer/lib/shape-composer";
import { sampleLayerMotion } from "@/features/scene-composer/lib/motion-animation";
import {
  getShapeConfig,
  sampleShapeBehaviors,
  sampleShapeReveal,
} from "@/features/scene-composer/lib/shape-composer";
import type { ComposerScene } from "@/features/scene-composer/types/scene-composer.types";
import { resolveStoryBindingRefs } from "@/features/story-production/lib/resolve-story-binding-refs";
import { extendComposerSceneForDuration } from "@/features/story-scene-builder/lib/extend-scene-duration";
import {
  bindingsForClip,
  buildRuntimePlan,
  patchComposerSceneForPreview,
} from "@/features/video-render-export/lib/scene-to-runtime";
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
  type RuntimeSweeps,
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

/**
 * Same-origin assets (e.g. /demo/gnn/logo.svg) must bypass the media proxy —
 * it only accepts absolute http(s) URLs and 400s on relative paths, which is
 * why the logo never bound. Same-origin loads don't taint the canvas anyway.
 */
function isSameOriginAsset(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return true;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

async function loadMediaElement(
  url: string,
  kind: "video" | "image",
): Promise<HTMLImageElement | HTMLVideoElement | null> {
  if (isSameOriginAsset(url)) {
    try {
      if (kind === "image") {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("image load failed"));
          img.src = url;
        });
        // SVGs without intrinsic size still decode fine for drawImage.
        await img.decode?.().catch(() => undefined);
        return img;
      }
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = url;
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
      shapeVisible: reveal.shapeVisible,
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

  const sampleSweeps = (
    layer: RuntimeLayer,
    playheadMs: number,
  ): RuntimeSweeps | null => {
    const obj = findObject(layer);
    if (!obj) return null;

    let light: RuntimeSweeps["light"] = null;
    const overlays = sampleBroadcastEffects(getObjectEffectStack(obj)).overlays;
    const lightOverlay = overlays.find((o) => o.kind === "light_sweep");
    if (lightOverlay && lightOverlay.kind === "light_sweep") {
      const p = normalizeLightSweepParams(lightOverlay.params);
      // Same phase math as BroadcastEffectOverlays.lightSweepProgress so the
      // render and the preview agree frame for frame.
      const cycleMs = Math.max(400, 1000 / Math.max(0.05, p.speed));
      const total = cycleMs + Math.max(0, p.repeatDelayMs);
      const local = p.loop
        ? playheadMs % total
        : Math.min(playheadMs % total, cycleMs);
      const inCycle = local <= cycleMs;
      const raw = inCycle ? local / cycleMs : 1;
      // null progress = paused between loops (overlay opacity 0).
      const progress = !inCycle
        ? null
        : p.direction === "reverse"
          ? 1 - raw
          : raw;

      // Headline light sweep covers the whole lower-info panel, same as Preview.
      const sceneId = objectByLayerId.get(layer.id)?.sceneId;
      const sceneObjects =
        (sceneId ? scenes[sceneId]?.composer_document?.objects : null) ?? [];
      const lowerPanel = findLowerInfoPanelObject(sceneObjects) ?? null;
      const cov = resolveHeadlineLightSweepCoverage(obj, lowerPanel);
      const shapeOutline = resolveObjectShapeOutline(obj);
      const useShapeOutline = Boolean(shapeOutline && !shapeOutline.rectLike);

      light = {
        progress,
        angle: resolveLightSweepAngle(p),
        start: p.start,
        end: p.end,
        width: p.width,
        opacity: p.opacity,
        softness: p.softness,
        color: p.color,
        blendMode: p.blendMode ?? "screen",
        coverage: cov
          ? {
              left: cov.left,
              top: cov.top,
              width: cov.width,
              height: cov.height,
            }
          : null,
        outlinePath: useShapeOutline ? shapeOutline!.localD : null,
        outlineOffsetX: useShapeOutline ? shapeOutline!.offsetX : 0,
        outlineOffsetY: useShapeOutline ? shapeOutline!.offsetY : 0,
      };
    }

    let edge: RuntimeSweeps["edge"] = null;
    const cfg = getEdgeSweepConfig(obj);
    // `on_hover` never triggers in a headless render — no pointer.
    if (cfg.enabled && cfg.loop !== "on_hover") {
      const periodMs = Math.max(120, 1000 / Math.max(0.01, cfg.speed));
      const once = cfg.loop === "once" || cfg.loop === "on_scene_start";
      const t = once
        ? Math.min(playheadMs, periodMs)
        : playheadMs % periodMs;
      const raw = t / periodMs;
      const done = once && playheadMs > periodMs;
      if (!done) {
        const margins = resolveEdgeSweepSideMargins(cfg);
        const outline = resolveObjectShapeOutline(obj);
        const outlinePoints =
          outline && !outline.rectLike
            ? sampleShapePerimeter(
                getShapeConfig(obj),
                obj.transform.width,
                obj.transform.height,
                128,
              )
            : null;
        edge = {
          progress: cfg.direction === "counterclockwise" ? 1 - raw : raw,
          color: cfg.color,
          width: cfg.width,
          length: Math.max(0.01, cfg.length),
          opacity: cfg.opacity,
          brightness: cfg.brightness,
          glowIntensity: cfg.glowIntensity,
          cornerRadius:
            cfg.cornerStyle === "sharp"
              ? 0
              : (cfg.cornerRadius ?? Number(obj.style?.corner_radius ?? 0) ?? 0),
          trailLength: Math.max(0, cfg.trailLength),
          blendMode: cfg.blendMode ?? "normal",
          marginTop: margins.top,
          marginRight: margins.right,
          marginBottom: margins.bottom,
          marginLeft: margins.left,
          outlinePoints,
        };
      }
    }

    if (!light && !edge) return null;
    return { light, edge };
  };

  return { sampleMotion, sampleShape, sampleSweeps };
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
          const extended = extendComposerSceneForDuration(
            result.data,
            clip?.durationMs ?? result.data.duration_ms ?? 10_000,
          );
          // Apply the same GNN patches Story Preview uses so left-rail logo /
          // info-2 layout and Edge/Light Sweep demos are present for sampling.
          sceneCache[id] = patchComposerSceneForPreview(extended);
          log(
            `Scene Initialized ${id.slice(0, 8)} (${result.data.name ?? "untitled"})`,
          );
        } else {
          log(
            `Composer scene ${id.slice(0, 8)} failed: ${result.success === false ? result.error : "missing"}`,
          );
        }
      }

      // Story bindings store assigned assets as `library://` / `clip://` refs.
      // Resolve them to real URLs exactly like the DOM host's
      // useResolvedStoryBindings — otherwise the logo falls back to the demo
      // mark and the optional-info panels render empty.
      const resolvedBindingsBySceneId: Record<
        string,
        Record<string, string>
      > = {};
      for (const clip of next.clips) {
        const id = clip.motionSceneId;
        if (!id || resolvedBindingsBySceneId[id]) continue;
        const scene = sceneCache[id];
        if (!scene) continue;
        const raw = bindingsForClip(scene, clip);
        try {
          resolvedBindingsBySceneId[id] = await resolveStoryBindingRefs(raw);
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          log(`Binding ref resolve failed (${detail}) — using raw bindings`);
          resolvedBindingsBySceneId[id] = raw;
        }
      }

      const runtimePlan = buildRuntimePlan(
        next,
        sceneCache,
        resolvedBindingsBySceneId,
      );
      const samplers = createMediaOsSamplers(sceneCache);
      runtime = new SceneRuntime({
        plan: runtimePlan,
        motionSampler: samplers.sampleMotion,
        shapeSampler: samplers.sampleShape,
        sweepSampler: samplers.sampleSweeps,
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

      // Bind layer media URLs (including every optional-info playlist slide).
      let bound = 0;
      let failed = 0;
      for (const scene of Object.values(runtimePlan.scenes)) {
        for (const layer of scene.layers) {
          const urls = [
            ...(layer.mediaPlaylist ?? []),
            ...(layer.mediaUrl ? [layer.mediaUrl] : []),
          ];
          for (const url of urls) {
            if (!url || runtime.getMedia(url)) continue;
            const el = await loadMediaElement(
              url,
              layer.mediaKind === "video" ? "video" : "image",
            );
            if (el) {
              runtime.setMedia(url, el);
              bound += 1;
            } else {
              failed += 1;
              log(`Media bind failed (${layer.regionKey ?? layer.name}): ${url.slice(0, 80)}`);
            }
          }
        }
      }
      log(`✓ Layer media bound — ${bound} asset(s)${failed ? `, ${failed} failed` : ""}`);

      // Explicit logo / optional-info diagnostics — these were the silent misses.
      let logos = 0;
      let optionalPanels = 0;
      for (const scene of Object.values(runtimePlan.scenes)) {
        for (const layer of scene.layers) {
          if (layer.kind === "logo" || layer.regionKey === "reporter-logo") {
            logos += 1;
            const url = layer.mediaUrl;
            log(
              url
                ? `✓ Logo layer — ${layer.name} · ${url.slice(0, 64)}`
                : `✗ Logo layer — ${layer.name} · no media bound`,
            );
          }
          if (
            layer.regionKey === "optional-info" ||
            layer.regionKey === "optional-info-1" ||
            layer.regionKey === "optional-info-2"
          ) {
            optionalPanels += 1;
            const n = layer.mediaPlaylist?.length ?? (layer.mediaUrl ? 1 : 0);
            log(
              n > 0
                ? `✓ Optional-info — ${layer.name} · ${n} slide(s)`
                : `✗ Optional-info — ${layer.name} · empty (no assigned asset)`,
            );
          }
        }
      }
      if (logos === 0) log("✗ Logo — no reporter-logo / logo layer in scene");
      if (optionalPanels === 0) log("✗ Optional-info — no left-rail panel in scene");

      // Report what the sweep/playlist samplers actually found, so a missing
      // effect is visible in the log instead of silently absent.
      let lightSweeps = 0;
      let edgeSweeps = 0;
      let playlists = 0;
      for (const scene of Object.values(runtimePlan.scenes)) {
        for (const layer of scene.layers) {
          if ((layer.mediaPlaylist?.length ?? 0) > 0) playlists += 1;
          const s = samplers.sampleSweeps(layer, 0);
          if (s?.light) lightSweeps += 1;
          if (s?.edge) edgeSweeps += 1;
        }
      }
      log(
        `✓ Light Sweep — ${lightSweeps} layer(s) · Edge Sweep — ${edgeSweeps} layer(s)`,
      );
      log(`✓ Optional-info playlists — ${playlists} panel(s)`);

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
