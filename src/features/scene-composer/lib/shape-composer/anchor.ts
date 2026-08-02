import type {
  ShapeAnchor,
  ShapeAnchorPoint,
  ShapeComposerConfig,
  ShapePlacement,
} from "@/features/scene-composer/lib/shape-composer/types";

export function createDefaultAnchorPoint(
  partial?: Partial<ShapeAnchorPoint>,
): ShapeAnchorPoint {
  return {
    x: clamp01(partial?.x ?? 0.5),
    y: clamp01(partial?.y ?? 0.5),
  };
}

export function createDefaultPlacement(
  partial?: Partial<ShapePlacement>,
): ShapePlacement {
  const width = clamp01(partial?.width ?? 1);
  const height = clamp01(partial?.height ?? 1);
  const x = clamp01(partial?.x ?? 0);
  const y = clamp01(partial?.y ?? 0);
  return {
    x: Math.min(x, 1 - width * 0.001),
    y: Math.min(y, 1 - height * 0.001),
    width: Math.max(0.02, width),
    height: Math.max(0.02, height),
  };
}

export function anchorPresetToPoint(anchor: ShapeAnchor): ShapeAnchorPoint {
  switch (anchor) {
    case "top_left":
      return { x: 0, y: 0 };
    case "top":
      return { x: 0.5, y: 0 };
    case "top_right":
      return { x: 1, y: 0 };
    case "left":
      return { x: 0, y: 0.5 };
    case "right":
      return { x: 1, y: 0.5 };
    case "bottom_left":
      return { x: 0, y: 1 };
    case "bottom":
      return { x: 0.5, y: 1 };
    case "bottom_right":
      return { x: 1, y: 1 };
    case "center":
    default:
      return { x: 0.5, y: 0.5 };
  }
}

export function nearestAnchorPreset(point: ShapeAnchorPoint): ShapeAnchor {
  const presets: ShapeAnchor[] = [
    "center",
    "top_left",
    "top",
    "top_right",
    "left",
    "right",
    "bottom_left",
    "bottom",
    "bottom_right",
  ];
  let best: ShapeAnchor = "center";
  let bestDist = Number.POSITIVE_INFINITY;
  for (const preset of presets) {
    const p = anchorPresetToPoint(preset);
    const d = (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = preset;
    }
  }
  return best;
}

export function resolveAnchorPoint(
  config: ShapeComposerConfig,
): ShapeAnchorPoint {
  if (config.anchorPoint) {
    return createDefaultAnchorPoint(config.anchorPoint);
  }
  return anchorPresetToPoint(config.anchor ?? "center");
}

export function resolvePlacement(config: ShapeComposerConfig): ShapePlacement {
  return createDefaultPlacement(config.placement);
}

/** CSS transform-origin from normalized anchor point. */
export function cssTransformOriginFromAnchor(point: ShapeAnchorPoint): string {
  return `${clamp01(point.x) * 100}% ${clamp01(point.y) * 100}%`;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
