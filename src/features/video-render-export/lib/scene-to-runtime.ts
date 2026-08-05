/**
 * Adapts MediaOS ComposerScene / RenderPlan → @mediaos/render-engine RuntimePlan.
 * Does not modify Scene Builder or Story Preview — read-only conversion.
 */

import type {
  ComposerScene,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import { getShapeConfig } from "@/features/scene-composer/lib/shape-composer";
import type {
  RenderPlan,
  RenderPlanClip,
} from "@/features/video-render-export/types/render.types";
import type {
  RuntimeClip,
  RuntimeLayer,
  RuntimeLayerKind,
  RuntimePlan,
  RuntimeScene,
  RuntimeShape,
} from "@mediaos/render-engine";

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function regionKeyOf(obj: SceneObject): string | null {
  const meta = obj.metadata ?? {};
  const fromMeta =
    asString(meta.region_key) ||
    asString(meta.regionKey) ||
    asString(meta.gnn_region) ||
    asString(meta.slot);
  if (fromMeta) return fromMeta;
  const name = (obj.name || "").toLowerCase();
  if (name.includes("main_video") || name.includes("video mask")) {
    return "main_video_container";
  }
  if (name.includes("headline")) return "headline";
  if (name.includes("subheadline") || name.includes("sub-headline")) {
    return "subheadline";
  }
  if (name.includes("ticker")) return "ticker";
  if (name.includes("logo")) return "logo";
  if (name.includes("advert")) return "advertisement";
  return null;
}

function kindOf(obj: SceneObject, region: string | null): RuntimeLayerKind {
  if (region === "main_video_container") return "video";
  if (region === "logo") return "logo";
  if (region === "advertisement") return "advertisement";
  if (region === "ticker") return "ticker";
  if (region === "headline" || region === "subheadline") return "lower_third";
  const t = (obj.object_type || "").toLowerCase();
  if (t.includes("video")) return "video";
  if (t.includes("image") || t.includes("media")) return "image";
  if (t.includes("text") || t.includes("headline") || t.includes("ticker")) {
    return "text";
  }
  if (t.includes("shape") || getShapeConfig(obj)?.enabled) return "shape";
  if (t.includes("background")) return "background";
  return getShapeConfig(obj)?.enabled ? "shape" : "unknown";
}

function shapeOf(obj: SceneObject): RuntimeShape | null {
  const cfg = getShapeConfig(obj);
  if (!cfg?.enabled) return null;
  return {
    enabled: true,
    kind: cfg.kind,
    fill:
      cfg.fillMode === "none"
        ? "none"
        : typeof cfg.fill === "string"
          ? cfg.fill
          : "#ffffff",
    stroke: cfg.strokeStyle === "none" ? null : cfg.strokeColor ?? null,
    strokeWidth: cfg.strokeWidth ?? 0,
    radius: cfg.radius ?? 0,
    cornerRadii: cfg.cornerRadii ?? undefined,
    gradient:
      cfg.fillMode === "gradient" && cfg.gradient
        ? {
            type: cfg.gradient.type === "radial" ? "radial" : "linear",
            angle: cfg.gradient.angle,
            stops: (cfg.gradient.stops ?? []).map((s) => ({
              offset: s.offset,
              color: s.color,
            })),
          }
        : null,
    path: null,
    shadow: cfg.shadow?.enabled
      ? {
          color: cfg.shadow.color,
          blur: cfg.shadow.blur,
          offsetX: cfg.shadow.offsetX,
          offsetY: cfg.shadow.offsetY,
        }
      : null,
    glow: cfg.glow?.enabled
      ? {
          color: cfg.glow.color,
          blur: cfg.glow.radius,
          strength: cfg.glow.intensity ?? 1,
        }
      : null,
  };
}

function mediaUrlOf(obj: SceneObject): {
  url: string | null;
  kind: "video" | "image" | null;
} {
  const c = obj.content ?? {};
  const style = obj.style ?? {};
  const url =
    asString(c.src) ||
    asString(c.url) ||
    asString(c.media_url) ||
    asString(style.backgroundImage)?.replace(/^url\(["']?|["']?\)$/g, "") ||
    null;
  if (!url) return { url: null, kind: null };
  const lower = url.toLowerCase();
  if (/\.(mp4|webm|mov)(\?|$)/.test(lower) || asString(c.media_type) === "video") {
    return { url, kind: "video" };
  }
  return { url, kind: "image" };
}

function textOf(obj: SceneObject, bindings: Record<string, string>): string | null {
  const c = obj.content ?? {};
  const raw =
    asString(c.text) ||
    asString(c.value) ||
    asString(c.label) ||
    null;
  if (!raw) return null;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, key: string) => bindings[key] ?? "");
}

export function composerSceneToRuntime(
  scene: ComposerScene,
  opts?: {
    width?: number;
    height?: number;
    durationMs?: number;
    bindings?: Record<string, string>;
  },
): RuntimeScene {
  const doc = scene.composer_document;
  const objects = doc?.objects ?? [];
  const canvasW = opts?.width ?? scene.canvas?.width ?? 1920;
  const canvasH = opts?.height ?? scene.canvas?.height ?? 1080;
  const scaleX = canvasW / Math.max(1, scene.canvas?.width ?? canvasW);
  const scaleY = canvasH / Math.max(1, scene.canvas?.height ?? canvasH);
  const bindings = {
    ...(scene.resolved_bindings ?? {}),
    ...(opts?.bindings ?? {}),
  };

  const layers: RuntimeLayer[] = objects.map((obj) => {
    const region = regionKeyOf(obj);
    const media = mediaUrlOf(obj);
    const tr = obj.transform;
    return {
      id: obj.id,
      name: obj.name || obj.id,
      kind: kindOf(obj, region),
      sortOrder: obj.sort_order ?? 0,
      startMs: obj.start_ms ?? 0,
      endMs: obj.end_ms ?? opts?.durationMs ?? scene.duration_ms ?? 10_000,
      visible: obj.visible !== false,
      transform: {
        x: asNumber(tr?.x, 0) * scaleX,
        y: asNumber(tr?.y, 0) * scaleY,
        width: asNumber(tr?.width, canvasW) * scaleX,
        height: asNumber(tr?.height, 100) * scaleY,
        scale: asNumber(tr?.scale, 1),
        rotation: asNumber(tr?.rotation, 0),
        opacity: asNumber(tr?.opacity, 1),
      },
      text: textOf(obj, bindings),
      fontFamily: asString(obj.style?.fontFamily) || asString(obj.style?.font_family),
      fontSize: asNumber(obj.style?.fontSize ?? obj.style?.font_size, 0) || null,
      fontWeight: (obj.style?.fontWeight ?? obj.style?.font_weight ?? null) as
        | string
        | number
        | null,
      color: asString(obj.style?.color) || asString(obj.style?.fill),
      textAlign: (asString(obj.style?.textAlign) as CanvasTextAlign | null) || "left",
      mediaUrl: media.url,
      mediaKind: media.kind,
      objectFit: "cover",
      shape: shapeOf(obj),
      regionKey: region,
      metadata: {
        ...obj.metadata,
        sourceObjectId: obj.id,
      },
    };
  });

  return {
    id: scene.id,
    name: scene.name ?? "Scene",
    width: canvasW,
    height: canvasH,
    durationMs: opts?.durationMs ?? scene.duration_ms ?? 10_000,
    background:
      asString(scene.canvas?.background) ||
      asString((scene.canvas as { background_color?: string } | undefined)?.background_color) ||
      "#071225",
    layers,
    bindings,
  };
}

function clipToRuntime(clip: RenderPlanClip): RuntimeClip {
  return {
    clipId: clip.clipId,
    sceneId: clip.motionSceneId || clip.sceneInstanceId || clip.clipId,
    name: clip.name,
    startMs: clip.startMs,
    endMs: clip.endMs,
    durationMs: clip.durationMs,
    trimInMs: clip.trimInMs ?? 0,
    headline: clip.headline,
    subheadline: clip.subheadline,
    tickerText: clip.tickerText,
    videoUrl: clip.videoUrl,
    imageUrl: clip.imageUrl,
    logoUrl: clip.logoUrl,
    advertisementUrl: clip.advertisementUrl,
  };
}

export function buildRuntimePlan(
  plan: RenderPlan,
  scenes: Record<string, ComposerScene>,
): RuntimePlan {
  const runtimeScenes: Record<string, RuntimeScene> = {};
  for (const clip of plan.clips) {
    const id = clip.motionSceneId;
    if (!id || runtimeScenes[id]) continue;
    const scene = scenes[id];
    if (!scene) continue;
    runtimeScenes[id] = composerSceneToRuntime(scene, {
      width: plan.width,
      height: plan.height,
      durationMs: clip.durationMs,
      bindings: {
        headline: clip.headline,
        subheadline: clip.subheadline,
        ticker: clip.tickerText,
      },
    });
  }

  return {
    width: plan.width,
    height: plan.height,
    frameRate: plan.frameRate,
    durationMs: plan.durationMs,
    voiceUrl: plan.voiceUrl,
    musicUrl: plan.musicUrl,
    clips: plan.clips.map(clipToRuntime),
    scenes: runtimeScenes,
  };
}
