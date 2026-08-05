/**
 * Adapts MediaOS ComposerScene / RenderPlan → @mediaos/render-engine RuntimePlan.
 * Does not modify Scene Builder or Story Preview — read-only conversion.
 */

import {
  buildDefaultBindings,
  resolveVariableTokens,
} from "@/features/motion-scene-engine/lib/variable-binding";
import { isLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import type {
  ComposerScene,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import { patchGnn001LightSweepDemos } from "@/features/scene-composer/lib/broadcast-effects";
import { patchGnn001EdgeSweepDemos } from "@/features/scene-composer/lib/edge-sweep";
import { patchGnn001LeftRailObjects } from "@/features/scene-composer/lib/gnn-001-left-rail.layout";
import {
  GNN_001_LOWER_PANEL_BORDER,
  GNN_001_LOWER_PANEL_FILL,
  GNN_001_LOWER_PANEL_TEXT_COLOR,
  patchGnn001LowerPanelObjects,
} from "@/features/scene-composer/lib/gnn-001-lower-panel.styles";
import { getShapeConfig } from "@/features/scene-composer/lib/shape-composer";
import {
  resolveStoryMalayalamFont,
} from "@/features/story-production/constants/story-font-options";
import {
  isTextLikeObject,
  resolveObjectDisplayText,
  resolveObjectMediaUrl,
} from "@/features/story-production/services/story-preview.service";
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

/** Canvas ctx.font cannot use CSS vars — resolve to a concrete family stack. */
function malayalamFamilyStack(family: string): string {
  return `"${family}", "Noto Sans Malayalam", "Manjari", system-ui, sans-serif`;
}

/**
 * Same runtime patches StoryLivePreview applies before draw. Without these the
 * left rail, lower panel chrome, Edge Sweep demos and Light Sweep demos never
 * appear on Canvas — which is exactly what 74f693d1 showed.
 */
export function patchComposerSceneForPreview(
  scene: ComposerScene,
): ComposerScene {
  const packageCode = (scene.metadata as Record<string, unknown> | undefined)
    ?.package_code;
  const isGnn001 =
    packageCode === "GNN-001" ||
    scene.name.includes("GNN-001") ||
    scene.name.includes("Full News Story");
  if (!isGnn001) return scene;

  let objects = scene.composer_document.objects;
  objects = patchGnn001LowerPanelObjects(objects);
  objects = patchGnn001LeftRailObjects(objects);
  objects = patchGnn001EdgeSweepDemos(objects);
  objects = patchGnn001LightSweepDemos(objects);
  if (objects === scene.composer_document.objects) return scene;
  return {
    ...scene,
    composer_document: {
      ...scene.composer_document,
      objects,
    },
  };
}

/** Same merge as the DOM capture host — plan media into binding keys. */
export function bindingsForClip(
  composer: ComposerScene | null,
  clip: RenderPlanClip | null,
): Record<string, string> {
  const base: Record<string, string> = {
    ...buildDefaultBindings(),
    ...(composer?.resolved_bindings ?? {}),
  };
  if (!clip) return base;

  if (clip.headline?.trim()) base.headline = clip.headline.trim();
  if (clip.subheadline?.trim()) base.subheadline = clip.subheadline.trim();
  if (clip.tickerText?.trim()) {
    base.ticker = clip.tickerText.trim();
    base.ticker_text = clip.tickerText.trim();
  }
  if (clip.videoUrl?.trim()) {
    base.main_video = clip.videoUrl.trim();
    base.video = clip.videoUrl.trim();
  }
  if (clip.imageUrl?.trim()) {
    base.main_image = clip.imageUrl.trim();
    base.image = clip.imageUrl.trim();
  }
  // The plan carries a demo logo fallback. Only use it when the scene has no
  // real logo binding of its own, otherwise it stomps the assigned asset.
  const sceneLogo = composer?.resolved_bindings?.logo?.trim();
  if (clip.logoUrl?.trim() && !sceneLogo) {
    base.logo = clip.logoUrl.trim();
    base.channel_logo = clip.logoUrl.trim();
  }
  if (clip.advertisementUrl?.trim()) {
    base.advertisement = clip.advertisementUrl.trim();
    base.ad = clip.advertisementUrl.trim();
  }
  return base;
}

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
  if (
    name.includes("main video") ||
    name.includes("main_video") ||
    name.includes("video mask")
  ) {
    return "main-video";
  }
  if (name.includes("subheadline") || name.includes("sub-headline")) {
    return "subheadline";
  }
  if (name.includes("headline")) return "headline";
  if (name.includes("ticker")) return "ticker";
  if (name.includes("logo")) return "logo";
  if (name.includes("advert")) return "advertisement";
  return null;
}

function isMainVideoRegion(region: string | null, obj: SceneObject): boolean {
  return (
    region === "main-video" ||
    region === "main_video_container" ||
    obj.metadata?.layer === "main_video_container" ||
    obj.metadata?.component_slug === "gnn-001-main-video-container" ||
    obj.name === "Main Video Container"
  );
}

function isLowerInfoPanelRegion(region: string | null): boolean {
  return region === "lower-info-panel";
}

/**
 * GNN-001's white lower-third chrome is a *frame* object whose colour lives in
 * `content.solid_fill`, not in a Shape Composer config. StoryLivePreview paints
 * it via the frame renderer; the Canvas adapter has to synthesize the fill or
 * the panel falls back to the dark scene background.
 */
function frameSolidFill(obj: SceneObject): string | null {
  const meta = obj.metadata ?? {};
  const slug =
    typeof meta.component_slug === "string" ? meta.component_slug : "";
  const isFrameLayer = meta.layer === "frames" || slug.startsWith("gnn-001-frame-");
  if (!isFrameLayer) return null;
  const isLowerInfoFrame =
    meta.frame_kind === "lower_info" || slug === "gnn-001-frame-lower-info";
  if (!isLowerInfoFrame) return null;
  const solid = obj.content?.solid_fill;
  return typeof solid === "string" && solid.trim().length > 0
    ? solid
    : GNN_001_LOWER_PANEL_FILL;
}

function kindOf(obj: SceneObject, region: string | null): RuntimeLayerKind {
  if (isMainVideoRegion(region, obj)) return "video";
  if (
    region === "logo" ||
    region === "reporter-logo" ||
    obj.object_type === "logo"
  ) {
    return "logo";
  }
  if (region === "advertisement") return "advertisement";
  // Optional-info panels are authored as skeleton/shape objects but Story
  // Preview paints their assigned media — classify them as image slots so the
  // playlist actually draws.
  if (isOptionalInfoRegion(region)) return "image";
  if (region === "ticker" || obj.object_type === "ticker") return "ticker";
  if (region === "headline" || region === "subheadline") return "lower_third";
  // Frame chrome (e.g. the white lower-third bar) must land in the shape
  // bucket — the `unknown` bucket paints last and would cover the headline.
  if (frameSolidFill(obj)) return "shape";
  const t = (obj.object_type || "").toLowerCase();
  if (t === "video") return "video";
  if (t === "image") return "image";
  if (isTextLikeObject(obj)) return "text";
  if (getShapeConfig(obj)?.enabled) return "shape";
  if (t.includes("background") || obj.metadata?.layer === "background") {
    return "background";
  }
  if (isLowerInfoPanelRegion(region)) return "shape";
  return "unknown";
}

/** Region-aware text styling mirroring StoryLivePreview.PreviewObject. */
function textStyleFor(
  obj: SceneObject,
  region: string | null,
  storyFontFamily: string,
  storyFontWeight: number,
  primaryColor: string,
): {
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundFill: string | null;
  textAlign: CanvasTextAlign;
  verticalAlign: "top" | "middle" | "bottom";
  lineHeight: number;
  letterSpacing: number;
  singleLine: boolean;
} {
  const style = obj.style ?? {};
  const isHeadline = region === "headline" || /headline/i.test(obj.name);
  const isSubheadline =
    region === "subheadline" || /subheadline/i.test(obj.name);
  const isLowerPanelText = isHeadline || isSubheadline;
  const isTicker = obj.object_type === "ticker" || region === "ticker";

  const defaultSize = isHeadline ? 48 : isSubheadline ? 28 : isTicker ? 22 : 24;
  const defaultWeight = isHeadline
    ? Math.max(storyFontWeight, 800)
    : isTicker
      ? 600
      : storyFontWeight;

  const color = isLowerPanelText
    ? GNN_001_LOWER_PANEL_TEXT_COLOR
    : isTicker
      ? "#ffffff"
      : asString(style.color) || "#ffffff";

  // Only the ticker gets a solid bar behind text. Headline/subheadline sit on
  // the separate white lower-info-panel object, so their own fill is
  // transparent when text is present (mirrors StoryLivePreview).
  const backgroundFill = isTicker ? primaryColor : null;

  const vAlign =
    style.vertical_alignment === "top"
      ? "top"
      : style.vertical_alignment === "bottom"
        ? "bottom"
        : "middle";

  return {
    fontSize: asNumber(style.font_size ?? style.fontSize, defaultSize),
    fontWeight: asNumber(style.font_weight ?? style.fontWeight, defaultWeight),
    color,
    backgroundFill,
    textAlign:
      (asString(style.alignment) as CanvasTextAlign | null) ||
      (asString(style.textAlign) as CanvasTextAlign | null) ||
      "left",
    verticalAlign: vAlign,
    lineHeight: asNumber(style.line_height ?? style.lineHeight, 1.35),
    letterSpacing: asNumber(style.letter_spacing ?? style.letterSpacing, 0),
    singleLine: isTicker,
  };
}

function isOptionalInfoRegion(region: string | null): boolean {
  return (
    region === "optional-info" ||
    region === "optional-info-1" ||
    region === "optional-info-2" ||
    region === "optional-info-3"
  );
}

/**
 * Optional-info panels cycle a comma-separated playlist. Mirrors
 * StoryLivePreview.optionalSlides exactly — same source list, same filtering,
 * no per-panel offset — so render and preview show the same slide.
 */
function optionalInfoPlaylist(
  region: string | null,
  bindings: Record<string, string>,
): string[] {
  const source =
    region === "optional-info-3"
      ? (bindings.optional_info_image_3 ?? "")
      : (bindings.optional_info_image || "").trim().length > 0
        ? bindings.optional_info_image
        : (bindings.gallery_images ?? "");
  return source
    .split(",")
    .map((s) => s.trim())
    .filter(
      (s) => Boolean(s) && !s.startsWith("{{") && !isLibraryMediaRef(s),
    );
}

/** Frame/mask kinds show media through them — stroke/rim only, never a solid fill. */
const RIM_ONLY_SHAPE_KINDS = new Set([
  "video_frame",
  "border_frame",
  "image_mask",
  "video_mask",
]);

function shapeOf(obj: SceneObject): RuntimeShape | null {
  const cfg = getShapeConfig(obj);
  if (!cfg?.enabled) return null;
  const rimOnly =
    RIM_ONLY_SHAPE_KINDS.has(cfg.kind) ||
    cfg.fillMode === "none" ||
    cfg.fill === "transparent";
  return {
    enabled: true,
    kind: cfg.kind,
    fill: rimOnly
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

function mediaUrlOf(
  obj: SceneObject,
  bindings: Record<string, string>,
): {
  url: string | null;
  kind: "video" | "image" | null;
} {
  const c = obj.content ?? {};
  const style = obj.style ?? {};

  // Per-object assigned asset lives in `object.bindings.src` (token or URL).
  // StoryLivePreview falls back to it; skipping it left logo / optional-info
  // panels empty even though the user had assigned media.
  const rawSrc = obj.bindings?.src;
  const fromObjectSrc =
    typeof rawSrc === "string" ? resolveVariableTokens(rawSrc, bindings) : null;
  const objectSrc =
    fromObjectSrc &&
    !fromObjectSrc.startsWith("{{") &&
    !isLibraryMediaRef(fromObjectSrc) &&
    fromObjectSrc.trim().length > 0
      ? fromObjectSrc
      : null;

  // Prefer the same story-binding resolution Story Preview uses.
  const url =
    resolveObjectMediaUrl(obj, bindings) ||
    objectSrc ||
    asString(c.src) ||
    asString(c.url) ||
    asString(c.media_url) ||
    asString(style.backgroundImage)?.replace(/^url\(["']?|["']?\)$/g, "") ||
    null;
  if (!url || url.startsWith("{{")) return { url: null, kind: null };
  const lower = url.toLowerCase();
  if (
    obj.object_type === "video" ||
    /\.(mp4|webm|mov)(\?|$)/.test(lower) ||
    asString(c.media_type) === "video"
  ) {
    return { url, kind: "video" };
  }
  return { url, kind: "image" };
}

function isMainVideoSkeleton(obj: SceneObject): boolean {
  return (
    obj.metadata?.skeleton === true &&
    (obj.metadata?.region_key === "main-video" ||
      obj.metadata?.component_slug === "gnn-001-main-video")
  );
}

function isMainVideoFrame(obj: SceneObject): boolean {
  return (
    obj.metadata?.frame_kind === "main_video" ||
    obj.metadata?.component_slug === "gnn-001-frame-main-video"
  );
}

function isMainVideoContainerObject(obj: SceneObject): boolean {
  return (
    obj.metadata?.component_slug === "gnn-001-main-video-container" ||
    obj.metadata?.layer === "main_video_container" ||
    obj.name === "Main Video Container"
  );
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
  const patched = patchComposerSceneForPreview(scene);
  const doc = patched.composer_document;
  const hasMainVideoContainer = (doc?.objects ?? []).some(
    isMainVideoContainerObject,
  );
  const objects = (doc?.objects ?? []).filter((obj) => {
    // Same as StoryLivePreview hideMainVideoChrome — drop the skeleton /
    // frame chrome that otherwise double-draws the main media (ghosting).
    if (
      hasMainVideoContainer &&
      (isMainVideoSkeleton(obj) || isMainVideoFrame(obj))
    ) {
      return false;
    }
    return true;
  });
  const canvasW = opts?.width ?? patched.canvas?.width ?? 1920;
  const canvasH = opts?.height ?? patched.canvas?.height ?? 1080;
  const scaleX = canvasW / Math.max(1, patched.canvas?.width ?? canvasW);
  const scaleY = canvasH / Math.max(1, patched.canvas?.height ?? canvasH);
  const bindings = {
    ...buildDefaultBindings(),
    ...(patched.resolved_bindings ?? {}),
    ...(opts?.bindings ?? {}),
  };
  const storyFont = resolveStoryMalayalamFont(bindings);
  const storyFontFamily = malayalamFamilyStack(storyFont.family);
  const primaryColor = asString(bindings.primary_color) || "#1D4ED8";
  const slideIntervalMs = Math.max(
    1000,
    Number(bindings.optional_info_slide_interval_ms || "3500") || 3500,
  );

  const layers: RuntimeLayer[] = objects.map((obj) => {
    const region = regionKeyOf(obj);
    const media = mediaUrlOf(obj, bindings);
    const tr = obj.transform;
    const kind = kindOf(obj, region);
    const playlist = isOptionalInfoRegion(region)
      ? optionalInfoPlaylist(region, bindings)
      : [];

    const isTextual =
      kind === "text" ||
      kind === "ticker" ||
      kind === "lower_third" ||
      isTextLikeObject(obj);

    // Resolve text against the SAME bindings/rules Story Preview uses.
    let text: string | null = null;
    if (isTextual) {
      const resolved = resolveObjectDisplayText(obj, bindings);
      text =
        resolved && !resolved.startsWith("{{") && resolved.trim().length > 0
          ? resolved
          : null;
    }

    const ts = isTextual
      ? textStyleFor(obj, region, storyFontFamily, storyFont.weight, primaryColor)
      : null;

    // Lower-info panel chrome is a solid bar behind headline/subheadline — it
    // is authored either as a `lower-info-panel` region object or (in GNN-001)
    // as a `gnn-001-frame-lower-info` frame carrying `content.solid_fill`.
    const lowerPanelFill = isLowerInfoPanelRegion(region)
      ? GNN_001_LOWER_PANEL_FILL
      : frameSolidFill(obj);

    // The panel/frame has no Shape Composer config in the doc — synthesize a
    // filled rectangle so the chrome actually paints behind the text. This wins
    // over any rim-only shape config so the panel can never fall back to dark.
    const shape = lowerPanelFill
      ? ({
          enabled: true,
          kind: "rectangle",
          fill: lowerPanelFill,
          stroke: GNN_001_LOWER_PANEL_BORDER,
          strokeWidth: 1,
          radius: asNumber(obj.style?.corner_radius, 0),
        } as RuntimeShape)
      : shapeOf(obj);

    return {
      id: obj.id,
      name: obj.name || obj.id,
      kind,
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
      text,
      fontFamily: storyFontFamily,
      fontSize: ts ? ts.fontSize * scaleY : null,
      fontWeight: ts ? ts.fontWeight : null,
      color: ts ? ts.color : null,
      textAlign: ts ? ts.textAlign : "left",
      verticalAlign: ts?.verticalAlign ?? "middle",
      lineHeight: ts?.lineHeight ?? 1.35,
      letterSpacing: ts ? ts.letterSpacing * scaleY : 0,
      backgroundFill: ts?.backgroundFill ?? lowerPanelFill,
      singleLine: ts?.singleLine ?? false,
      mediaUrl: playlist.length > 0 ? playlist[0]! : media.url,
      mediaKind: playlist.length > 0 ? "image" : media.kind,
      mediaPlaylist: playlist.length > 0 ? playlist : null,
      slideIntervalMs: playlist.length > 0 ? slideIntervalMs : null,
      objectFit: "cover",
      shape,
      regionKey: region,
      metadata: {
        ...obj.metadata,
        sourceObjectId: obj.id,
        lowerPanelBorder: lowerPanelFill ? GNN_001_LOWER_PANEL_BORDER : undefined,
      },
    };
  });

  return {
    id: patched.id,
    name: patched.name ?? "Scene",
    width: canvasW,
    height: canvasH,
    durationMs: opts?.durationMs ?? patched.duration_ms ?? 10_000,
    background:
      asString(patched.canvas?.background) ||
      asString(
        (patched.canvas as { background_color?: string } | undefined)
          ?.background_color,
      ) ||
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
  /**
   * Bindings with `library://` / `clip://` refs already resolved to URLs,
   * keyed by motion scene id. Warm-up resolves these once; without them the
   * logo and optional-info panels render empty.
   */
  resolvedBindingsBySceneId?: Record<string, Record<string, string>>,
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
      bindings: resolvedBindingsBySceneId?.[id] ?? bindingsForClip(scene, clip),
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
