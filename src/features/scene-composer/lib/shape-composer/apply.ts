import {
  createDefaultShapeConfig,
  shapeKindFromObjectType,
} from "@/features/scene-composer/lib/shape-composer/defaults";
import {
  createDefaultReveal,
  defaultRevealEntranceBehavior,
  syncRevealExitBehavior,
} from "@/features/scene-composer/lib/shape-composer/reveal";
import type {
  ShapeComposerConfig,
  ShapeKind,
  ShapeLibraryItem,
  ShapePreset,
} from "@/features/scene-composer/lib/shape-composer/types";
import { SHAPE_METADATA_KEY } from "@/features/scene-composer/lib/shape-composer/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isMainVideoContainerObject(object: SceneObject): boolean {
  return (
    object.metadata?.layer === "main_video_container" ||
    object.metadata?.component_slug === "gnn-001-main-video-container" ||
    object.name === "Main Video Container"
  );
}

export function isPureShapeObjectType(objectType: string): boolean {
  return [
    "rectangle",
    "rounded_rectangle",
    "circle",
    "ellipse",
    "line",
    "polygon",
    "gradient",
    "svg",
    "mask",
    "triangle",
    "star",
    "arrow",
  ].includes(objectType);
}

/** Main video must use a rectangular rim — never an inscribed ellipse/circle. */
export function normalizeMainVideoFrameShape(
  config: ShapeComposerConfig,
  object: SceneObject,
): ShapeComposerConfig {
  const frameKinds = new Set([
    "video_frame",
    "border_frame",
    "rounded_rectangle",
    "rectangle",
    "ellipse",
    "circle",
    "video_mask",
    "image_mask",
  ]);
  const kind = frameKinds.has(config.kind) ? config.kind : "video_frame";
  const isMaskKind =
    kind === "ellipse" ||
    kind === "circle" ||
    kind === "video_mask" ||
    kind === "image_mask";
  const revealOn = config.reveal?.enabled !== false;
  const corner = Math.min(
    24,
    Math.max(
      0,
      Number(
        object.style.corner_radius ??
          config.cornerRadii.topLeft ??
          10,
      ) || 10,
    ),
  );
  // Reveal on: solid cover shape → exit → video. Reveal off: stroke rim only.
  // Use a clearly visible panel color (dark navy reads as “empty” on the canvas).
  const coverFill =
    typeof config.fill === "string" &&
    config.fill.length > 0 &&
    config.fill !== "transparent" &&
    config.fillMode !== "none"
      ? config.fill
      : "#1D4ED8";
  return {
    ...config,
    kind: isMaskKind ? kind : revealOn ? (kind === "video_frame" ? "rounded_rectangle" : kind) : "video_frame",
    radius: isMaskKind ? config.radius : 0,
    fillMode: revealOn ? "solid" : "none",
    fill: revealOn ? coverFill : "transparent",
    material: "broadcast_frame",
    strokeStyle: config.strokeStyle === "none" ? "solid" : config.strokeStyle,
    strokeWidth: Math.max(2, config.strokeWidth || 3),
    strokeColor: config.strokeColor || "#FFFFFF",
    opacity: 1,
    uniformCorners: true,
    cornerRadii: {
      topLeft: corner,
      topRight: corner,
      bottomRight: corner,
      bottomLeft: corner,
    },
    placement: {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    borderPadding: revealOn
      ? 0
      : Math.min(12, Math.max(0, config.borderPadding || 0)),
    reveal: createDefaultReveal({
      ...config.reveal,
      enabled: revealOn,
    }),
  };
}

export function getShapeConfig(object: SceneObject): ShapeComposerConfig {
  const raw = object.metadata?.[SHAPE_METADATA_KEY];
  const kind = isRecord(raw) && typeof raw.kind === "string"
    ? (raw.kind as ShapeKind)
    : shapeKindFromObjectType(object.object_type);
  const base = createDefaultShapeConfig(kind);
  if (!isRecord(raw)) {
    // Inferred only — Shape Composer stays off until the Enable toggle writes config.
    const inferred = createDefaultShapeConfig(kind, {
      enabled: false,
      fill: typeof object.style.fill === "string" ? object.style.fill : base.fill,
      cornerRadii: {
        topLeft: Number(object.style.corner_radius ?? base.cornerRadii.topLeft),
        topRight: Number(object.style.corner_radius ?? base.cornerRadii.topRight),
        bottomRight: Number(
          object.style.corner_radius ?? base.cornerRadii.bottomRight,
        ),
        bottomLeft: Number(
          object.style.corner_radius ?? base.cornerRadii.bottomLeft,
        ),
      },
      opacity: object.transform.opacity,
      rotation: object.transform.rotation,
    });
    return isMainVideoContainerObject(object)
      ? normalizeMainVideoFrameShape(inferred, object)
      : inferred;
  }
  const config = createDefaultShapeConfig(kind, {
    ...(raw as Partial<ShapeComposerConfig>),
    // Missing enabled on older saves → treat as on.
    enabled: raw.enabled !== false,
  });
  return isMainVideoContainerObject(object)
    ? normalizeMainVideoFrameShape(config, object)
    : config;
}

export function hasExplicitShapeConfig(object: SceneObject): boolean {
  return isRecord(object.metadata?.[SHAPE_METADATA_KEY]);
}

/** Shape Composer is active and should drive live preview. */
export function isShapeComposerActive(object: SceneObject): boolean {
  if (!hasExplicitShapeConfig(object)) return false;
  return getShapeConfig(object).enabled && !getShapeConfig(object).hidden;
}

function layerFillColor(object: SceneObject, fallback: string) {
  const fill = object.style.fill;
  return typeof fill === "string" && fill.length > 0 && fill !== "transparent"
    ? fill
    : fallback;
}

export function enableShapeComposer(object: SceneObject): SceneObject {
  const current = getShapeConfig(object);
  if (hasExplicitShapeConfig(object) && current.enabled && !current.hidden) {
    return object;
  }
  const isVideoContainer = isMainVideoContainerObject(object);
  const isTextLike = ["text", "rich_text", "ticker", "clock", "date"].includes(
    object.object_type,
  );
  // Text: Shape is optional chrome behind glyphs — reveal stays off unless
  // the designer already turned it on. Video/shapes keep intro→exit reveal.
  const reveal = createDefaultReveal({
    ...current.reveal,
    enabled: isTextLike
      ? current.reveal?.enabled === true
      : current.reveal?.enabled !== false,
  });
  const baseBehaviors =
    current.behaviors.length > 0
      ? current.behaviors
      : reveal.enabled
        ? [defaultRevealEntranceBehavior()]
        : current.behaviors;
  const behaviors = reveal.enabled
    ? syncRevealExitBehavior(baseBehaviors, reveal)
    : baseBehaviors;

  if (isVideoContainer) {
    return setShapeConfig(
      object,
      normalizeMainVideoFrameShape(
        {
          ...current,
          enabled: true,
          hidden: false,
          reveal,
          behaviors,
        },
        object,
      ),
    );
  }

  if (isTextLike) {
    return setShapeConfig(object, {
      ...current,
      enabled: true,
      hidden: false,
      reveal,
      behaviors: reveal.enabled ? behaviors : [],
      strokeStyle:
        current.strokeStyle === "none" ? "solid" : current.strokeStyle,
      strokeWidth: Math.max(0, current.strokeWidth || 0),
      strokeColor: current.strokeColor || "#5B8DEF",
      fill:
        !current.fill || current.fill === "transparent"
          ? "rgba(99,102,241,0.45)"
          : current.fill,
      fillMode: current.fillMode === "none" ? "solid" : current.fillMode,
    });
  }

  // Pure shape layers (rect/ellipse/…): keep Reveal off so attributes stay
  // visible in the editor without pressing Preview.
  if (isPureShapeObjectType(object.object_type)) {
    const shapeReveal = createDefaultReveal({
      ...current.reveal,
      enabled: current.reveal?.enabled === true,
    });
    return setShapeConfig(object, {
      ...current,
      enabled: true,
      hidden: false,
      reveal: shapeReveal,
      behaviors: shapeReveal.enabled
        ? syncRevealExitBehavior(
            current.behaviors.length > 0
              ? current.behaviors
              : [defaultRevealEntranceBehavior()],
            shapeReveal,
          )
        : [],
      strokeStyle:
        current.strokeStyle === "none" ? "solid" : current.strokeStyle,
      strokeWidth: Math.max(2, current.strokeWidth || 0),
      strokeColor: current.strokeColor || "#5B8DEF",
      fill: layerFillColor(
        object,
        !current.fill || current.fill === "transparent"
          ? "rgba(99,102,241,0.85)"
          : current.fill,
      ),
      fillMode: current.fillMode === "none" ? "solid" : current.fillMode,
    });
  }

  return setShapeConfig(object, {
    ...current,
    enabled: true,
    hidden: false,
    reveal,
    behaviors,
    strokeStyle:
      current.strokeStyle === "none" ? "solid" : current.strokeStyle,
    strokeWidth: Math.max(2, current.strokeWidth || 0),
    strokeColor: current.strokeColor || "#5B8DEF",
    fill: layerFillColor(
      object,
      !current.fill || current.fill === "transparent"
        ? "rgba(99,102,241,0.85)"
        : current.fill,
    ),
    fillMode: current.fillMode === "none" ? "solid" : current.fillMode,
  });
}

/** Enable Shape Composer + reveal on every layer. */
export function enableShapeComposerOnAllLayers(
  objects: SceneObject[],
): SceneObject[] {
  return objects.map((object) => enableShapeComposer(object));
}

/** Disable Shape Composer on every layer that has config. */
export function disableShapeComposerOnAllLayers(
  objects: SceneObject[],
): SceneObject[] {
  return objects.map((object) => disableShapeComposer(object));
}

/** True when every object has Shape Composer explicitly enabled. */
export function areShapesEnabledOnAllLayers(objects: SceneObject[]): boolean {
  if (objects.length === 0) return false;
  return objects.every(
    (object) =>
      hasExplicitShapeConfig(object) && getShapeConfig(object).enabled,
  );
}

export function needsShapeComposerSeed(objects: SceneObject[]): boolean {
  return objects.some((object) => {
    // Text is not auto-seeded — only clean leaked style.fill from older builds.
    if (
      ["text", "rich_text", "ticker", "clock", "date"].includes(
        object.object_type,
      )
    ) {
      return Boolean(
        object.style.fill &&
          object.style.fill !== "transparent" &&
          object.style.text_background !== true &&
          // If Shape is intentionally enabled, leave style alone — Shape owns paint.
          !(
            hasExplicitShapeConfig(object) && getShapeConfig(object).enabled
          ),
      );
    }
    // Pure shapes with Reveal on were invisible at edit rest — normalize.
    if (
      isPureShapeObjectType(object.object_type) &&
      hasExplicitShapeConfig(object) &&
      getShapeConfig(object).reveal?.enabled
    ) {
      return true;
    }
    // Only fill missing shape config — never strip existing Shape Composer data.
    return !hasExplicitShapeConfig(object);
  });
}

/**
 * Enable Shape Composer on layers that do not already have config.
 * Layers with existing shape metadata (enabled or disabled) are left untouched
 * so custom Shape Composer work is never overwritten.
 */
export function seedShapeComposerOnAllLayers(
  objects: SceneObject[],
): SceneObject[] {
  return objects.map((object) => {
    // Feature 043 — do not auto-enable Shape on text (avoids forced plates).
    // Designers can still turn Shape on from the Shape tab.
    if (
      ["text", "rich_text", "ticker", "clock", "date"].includes(
        object.object_type,
      )
    ) {
      // Clear leaked shell fills from older seeds when Shape is off and the
      // Text Background toggle is not in use.
      if (
        object.style.fill &&
        object.style.fill !== "transparent" &&
        object.style.text_background !== true &&
        !(hasExplicitShapeConfig(object) && getShapeConfig(object).enabled)
      ) {
        return {
          ...object,
          style: { ...object.style, fill: "transparent" },
        };
      }
      return object;
    }

    // Rect / ellipse / … must stay visible while editing — turn off Reveal
    // covers that were defaulted on in older builds.
    if (
      isPureShapeObjectType(object.object_type) &&
      hasExplicitShapeConfig(object)
    ) {
      const config = getShapeConfig(object);
      if (config.reveal?.enabled) {
        return patchShapeConfig(object, {
          reveal: { ...config.reveal, enabled: false },
        });
      }
      return object;
    }

    if (hasExplicitShapeConfig(object)) {
      const raw = object.metadata?.[SHAPE_METADATA_KEY];
      // Repair / normalize main-video shape config when needed.
      if (isMainVideoContainerObject(object) && isRecord(raw)) {
        const kind = typeof raw.kind === "string" ? raw.kind : "";
        const revealRaw = isRecord(raw.reveal) ? raw.reveal : null;
        if (
          revealRaw == null ||
          kind === "polygon" ||
          kind === "star" ||
          kind === "ribbon" ||
          kind === "speech_bubble"
        ) {
          const current = getShapeConfig(object);
          return setShapeConfig(
            object,
            normalizeMainVideoFrameShape(
              {
                ...current,
                reveal: createDefaultReveal({
                  ...current.reveal,
                  enabled: revealRaw == null ? true : current.reveal.enabled,
                }),
              },
              object,
            ),
          );
        }
      }
      // Backfill reveal defaults only when missing — keep user toggles/behaviors.
      if (isRecord(raw) && raw.reveal == null && getShapeConfig(object).enabled) {
        return patchShapeConfig(object, {
          reveal: createDefaultReveal({ enabled: true }),
        });
      }
      return object;
    }
    return enableShapeComposer(object);
  });
}

export function disableShapeComposer(object: SceneObject): SceneObject {
  if (!hasExplicitShapeConfig(object)) return object;
  return patchShapeConfig(object, { enabled: false });
}

export function setShapeConfig(
  object: SceneObject,
  config: ShapeComposerConfig,
): SceneObject {
  const isTextLike = ["text", "rich_text", "ticker", "clock", "date"].includes(
    object.object_type,
  );
  const fill =
    config.fillMode === "gradient"
      ? undefined
      : config.fillMode === "none"
        ? "transparent"
        : config.fill;
  const corner = config.uniformCorners
    ? config.cornerRadii.topLeft
    : Math.max(
        config.cornerRadii.topLeft,
        config.cornerRadii.topRight,
        config.cornerRadii.bottomRight,
        config.cornerRadii.bottomLeft,
      );

  return {
    ...object,
    transform: {
      ...object.transform,
      opacity: config.opacity,
      rotation: config.rotation,
    },
    style: {
      ...object.style,
      // Text keeps style.fill for the Text → Background toggle only.
      // Shape fill is painted by ShapeRenderer, not the text shell.
      ...(fill !== undefined && !isTextLike ? { fill } : {}),
      corner_radius: corner,
      stroke_width: config.strokeWidth,
      stroke_color: config.strokeColor,
      stroke_style: config.strokeStyle,
    },
    metadata: {
      ...object.metadata,
      [SHAPE_METADATA_KEY]: { ...config, version: 1 },
    },
  };
}

export function patchShapeConfig(
  object: SceneObject,
  patch: Partial<ShapeComposerConfig>,
): SceneObject {
  const current = getShapeConfig(object);
  return setShapeConfig(object, {
    ...current,
    ...patch,
    version: 1,
    cornerRadii: patch.cornerRadii
      ? { ...current.cornerRadii, ...patch.cornerRadii }
      : current.cornerRadii,
    gradient: patch.gradient
      ? { ...current.gradient, ...patch.gradient }
      : current.gradient,
    shadow: patch.shadow ? { ...current.shadow, ...patch.shadow } : current.shadow,
    glow: patch.glow ? { ...current.glow, ...patch.glow } : current.glow,
    glass: patch.glass ? { ...current.glass, ...patch.glass } : current.glass,
    path: patch.path ? { ...current.path, ...patch.path } : current.path,
    reveal: patch.reveal
      ? { ...current.reveal, ...patch.reveal }
      : current.reveal,
    anchorPoint: patch.anchorPoint
      ? { ...current.anchorPoint, ...patch.anchorPoint }
      : current.anchorPoint,
    placement: patch.placement
      ? { ...current.placement, ...patch.placement }
      : current.placement,
  });
}

export function convertShapeKind(
  object: SceneObject,
  kind: ShapeKind,
): SceneObject {
  if (isMainVideoContainerObject(object)) {
    const allowed = new Set([
      "video_frame",
      "border_frame",
      "rounded_rectangle",
      "rectangle",
      "ellipse",
      "circle",
      "video_mask",
      "image_mask",
    ]);
    const nextKind = (allowed.has(kind) ? kind : "video_frame") as ShapeKind;
    const current = getShapeConfig(object);
    // Normalize may map video_frame → rounded_rectangle when reveal is on.
    // Bail when the live kind already matches so Select sync cannot rewrite
    // metadata every render.
    const preview = normalizeMainVideoFrameShape(
      {
        ...current,
        kind: nextKind,
        enabled: true,
      },
      object,
    );
    if (
      current.enabled &&
      current.kind === preview.kind &&
      current.fill === preview.fill &&
      current.fillMode === preview.fillMode
    ) {
      return object;
    }
    return setShapeConfig(object, preview);
  }
  const current = getShapeConfig(object);
  if (current.kind === kind && current.enabled) return object;
  return setShapeConfig(object, createDefaultShapeConfig(kind, {
    ...current,
    kind,
    fill: current.fill,
    strokeColor: current.strokeColor,
    opacity: current.opacity,
  }));
}

export function applyShapeLibraryItem(
  object: SceneObject,
  item: ShapeLibraryItem,
): SceneObject {
  const next = createDefaultShapeConfig(item.kind, {
    ...getShapeConfig(object),
    ...item.config,
    kind: item.kind,
  });
  const withShape = setShapeConfig(object, next);
  return {
    ...withShape,
    name: object.name || item.name,
    transform: {
      ...withShape.transform,
      width: item.defaultWidth || withShape.transform.width,
      height: item.defaultHeight || withShape.transform.height,
    },
  };
}

export function applyShapePreset(
  object: SceneObject,
  preset: ShapePreset,
): SceneObject {
  return patchShapeConfig(object, preset.config);
}

export function syncShapeFromTransform(object: SceneObject): SceneObject {
  if (!hasExplicitShapeConfig(object)) return object;
  return patchShapeConfig(object, {
    opacity: object.transform.opacity,
    rotation: object.transform.rotation,
  });
}
