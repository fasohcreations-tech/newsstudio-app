import {
  createDefaultShapeConfig,
  shapeKindFromObjectType,
} from "@/features/scene-composer/lib/shape-composer/defaults";
import {
  createDefaultReveal,
  defaultRevealEntranceBehavior,
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

export function getShapeConfig(object: SceneObject): ShapeComposerConfig {
  const raw = object.metadata?.[SHAPE_METADATA_KEY];
  const kind = isRecord(raw) && typeof raw.kind === "string"
    ? (raw.kind as ShapeKind)
    : shapeKindFromObjectType(object.object_type);
  const base = createDefaultShapeConfig(kind);
  if (!isRecord(raw)) {
    // Inferred only — Shape Composer stays off until the Enable toggle writes config.
    return createDefaultShapeConfig(kind, {
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
  }
  return createDefaultShapeConfig(kind, {
    ...(raw as Partial<ShapeComposerConfig>),
    // Missing enabled on older saves → treat as on.
    enabled: raw.enabled !== false,
  });
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
  const isVideoContainer =
    object.metadata?.layer === "main_video_container" ||
    object.metadata?.component_slug === "gnn-001-main-video-container" ||
    object.name === "Main Video Container";
  const reveal = createDefaultReveal({
    ...current.reveal,
    enabled: current.reveal?.enabled !== false,
  });
  const behaviors =
    current.behaviors.length > 0
      ? current.behaviors
      : reveal.enabled
        ? [defaultRevealEntranceBehavior()]
        : current.behaviors;

  return setShapeConfig(object, {
    ...current,
    enabled: true,
    hidden: false,
    reveal,
    behaviors,
    // Media / video layers get a frame overlay — never a solid fill wipe.
    ...(isVideoContainer
      ? {
          kind: "video_frame" as const,
          fillMode: "none" as const,
          fill: "transparent",
          strokeWidth: Math.max(3, current.strokeWidth || 0),
          strokeStyle: "solid" as const,
          strokeColor: current.strokeColor || "#FFFFFF",
          material: "broadcast_frame" as const,
          cornerRadii: {
            topLeft: Number(object.style.corner_radius ?? 10),
            topRight: Number(object.style.corner_radius ?? 10),
            bottomRight: Number(object.style.corner_radius ?? 10),
            bottomLeft: Number(object.style.corner_radius ?? 10),
          },
          uniformCorners: true,
        }
      : {
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
        }),
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
  return objects.some(
    (object) =>
      !hasExplicitShapeConfig(object) || !getShapeConfig(object).enabled,
  );
}

/** Enable shape on layers that are missing config or still disabled. */
export function seedShapeComposerOnAllLayers(
  objects: SceneObject[],
): SceneObject[] {
  return objects.map((object) => {
    if (hasExplicitShapeConfig(object) && getShapeConfig(object).enabled) {
      const raw = object.metadata?.[SHAPE_METADATA_KEY];
      if (isRecord(raw) && raw.reveal == null) {
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
      ...(fill !== undefined ? { fill } : {}),
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
  const current = getShapeConfig(object);
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
