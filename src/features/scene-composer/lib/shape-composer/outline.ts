/**
 * Shape outline for Edge Sweep / Light Sweep — follows real geometry
 * (polygon, star, arrow, …) instead of the rectangular layer box.
 */

import { resolvePlacement } from "@/features/scene-composer/lib/shape-composer/anchor";
import {
  getShapeConfig,
  isShapeComposerActive,
} from "@/features/scene-composer/lib/shape-composer/apply";
import { buildShapePathD } from "@/features/scene-composer/lib/shape-composer/geometry";
import type {
  ShapeComposerConfig,
  ShapeKind,
} from "@/features/scene-composer/lib/shape-composer/types";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export function isRectLikeShapeKind(kind: ShapeKind): boolean {
  return [
    "rectangle",
    "rounded_rectangle",
    "glass_panel",
    "gradient_panel",
    "border_frame",
    "ticker_bar",
    "headline_bar",
    "reporter_card",
    "video_frame",
    "image_mask",
    "video_mask",
  ].includes(kind);
}

export type ShapeOutlineResolved = {
  /** True when a rounded-rect overlay is fine. */
  rectLike: boolean;
  /** Local path `d` inside the placement box (0..pw × 0..ph). */
  localD: string;
  /** Placement origin in layer pixels. */
  offsetX: number;
  offsetY: number;
  placementWidth: number;
  placementHeight: number;
  layerWidth: number;
  layerHeight: number;
};

/** Resolve the painted shape outline in layer-local coordinates. */
export function resolveShapeOutline(
  config: ShapeComposerConfig,
  layerWidth: number,
  layerHeight: number,
): ShapeOutlineResolved {
  const placement = resolvePlacement(config);
  const lw = Math.max(1, layerWidth);
  const lh = Math.max(1, layerHeight);
  const pw = Math.max(1, lw * placement.width);
  const ph = Math.max(1, lh * placement.height);
  const offsetX = lw * placement.x;
  const offsetY = lh * placement.y;
  const localD = buildShapePathD(config, pw, ph);
  return {
    rectLike: isRectLikeShapeKind(config.kind),
    localD,
    offsetX,
    offsetY,
    placementWidth: pw,
    placementHeight: ph,
    layerWidth: lw,
    layerHeight: lh,
  };
}

/**
 * Outline for sweeps when Shape Composer is active on the object.
 * Returns null → callers keep rectangular sweep behavior.
 */
export function resolveObjectShapeOutline(
  object: SceneObject,
): ShapeOutlineResolved | null {
  if (!isShapeComposerActive(object)) return null;
  const config = getShapeConfig(object);
  const outline = resolveShapeOutline(
    config,
    object.transform.width,
    object.transform.height,
  );
  // Circles / ellipses need the true oval path, not a rounded rect.
  if (config.kind === "circle" || config.kind === "ellipse") {
    return { ...outline, rectLike: false };
  }
  return outline;
}

/** Evenly spaced points along the shape perimeter in layer-local pixels. */
export function sampleShapePerimeter(
  config: ShapeComposerConfig,
  layerWidth: number,
  layerHeight: number,
  steps: number,
): Array<[number, number]> {
  const outline = resolveShapeOutline(config, layerWidth, layerHeight);
  const vertices = shapeVerticesLocal(config, outline.placementWidth, outline.placementHeight);
  if (vertices.length < 2) {
    return sampleRoundedRectPerimeter(
      outline.offsetX,
      outline.offsetY,
      outline.placementWidth,
      outline.placementHeight,
      0,
      steps,
    );
  }

  const closed =
    config.kind !== "line" && config.kind !== "divider_line";
  const edges: Array<{ a: [number, number]; b: [number, number]; len: number }> =
    [];
  const count = closed ? vertices.length : vertices.length - 1;
  for (let i = 0; i < count; i += 1) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len > 0.001) edges.push({ a, b, len });
  }
  const total = edges.reduce((sum, e) => sum + e.len, 0);
  if (total <= 0 || steps < 2) return [];

  const pts: Array<[number, number]> = [];
  for (let i = 0; i < steps; i += 1) {
    let d = (i / steps) * total;
    for (const edge of edges) {
      if (d <= edge.len) {
        const t = d / edge.len;
        pts.push([
          outline.offsetX + edge.a[0] + (edge.b[0] - edge.a[0]) * t,
          outline.offsetY + edge.a[1] + (edge.b[1] - edge.a[1]) * t,
        ]);
        break;
      }
      d -= edge.len;
    }
  }
  return pts;
}

function shapeVerticesLocal(
  config: ShapeComposerConfig,
  w: number,
  h: number,
): Array<[number, number]> {
  const cx = w / 2;
  const cy = h / 2;
  switch (config.kind) {
    case "circle":
    case "ellipse": {
      const rx = config.kind === "circle" ? Math.min(w, h) / 2 : w / 2;
      const ry = config.kind === "circle" ? Math.min(w, h) / 2 : h / 2;
      const pts: Array<[number, number]> = [];
      const n = 64;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
      }
      return pts;
    }
    case "triangle":
      return regularPolygonVertices(w, h, 3, -Math.PI / 2);
    case "polygon":
      return regularPolygonVertices(w, h, Math.max(3, config.sides), -Math.PI / 2);
    case "star": {
      const points = Math.max(3, config.starPoints);
      const inner = Math.min(0.95, Math.max(0.1, config.starInnerRadius));
      const pts: Array<[number, number]> = [];
      const count = points * 2;
      for (let i = 0; i < count; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI) / points;
        const f = i % 2 === 0 ? 1 : inner;
        pts.push([cx + Math.cos(a) * (w / 2) * f, cy + Math.sin(a) * (h / 2) * f]);
      }
      return pts;
    }
    case "arrow": {
      const ah = Math.min(0.45, Math.max(0.08, config.arrowHeadSize));
      const mid = h / 2;
      const shaft = h * 0.22;
      const headW = w * ah;
      return [
        [0, mid - shaft],
        [w - headW, mid - shaft],
        [w - headW, h * 0.12],
        [w, mid],
        [w - headW, h * 0.88],
        [w - headW, mid + shaft],
        [0, mid + shaft],
      ];
    }
    case "ribbon": {
      const notch = Math.min(w * 0.12, h * 0.45);
      return [
        [0, 0],
        [w, 0],
        [w - notch, h / 2],
        [w, h],
        [0, h],
        [notch, h / 2],
      ];
    }
    case "corner_accent": {
      const t = Math.min(w, h) * 0.22;
      return [
        [0, 0],
        [w, 0],
        [w, t],
        [t, t],
        [t, h],
        [0, h],
      ];
    }
    case "line":
    case "divider_line":
      return [
        [0, h / 2],
        [w, h / 2],
      ];
    case "svg_path":
    case "custom_path":
      return (config.path?.points ?? []).map((pt) => [pt.x * w, pt.y * h] as [number, number]);
    case "speech_bubble":
      // Approximate with the body rounded-rect corners as a coarse ring.
      return [
        [0, 0],
        [w, 0],
        [w, h * 0.7],
        [w * 0.4, h * 0.7],
        [w * 0.22, h],
        [w * 0.15, h * 0.7],
        [0, h * 0.7],
      ];
    default:
      return [
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
      ];
  }
}

function regularPolygonVertices(
  w: number,
  h: number,
  sides: number,
  rotation: number,
): Array<[number, number]> {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i * 2 * Math.PI) / sides;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

function sampleRoundedRectPerimeter(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  steps: number,
): Array<[number, number]> {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  const straightW = Math.max(0, w - radius * 2);
  const straightH = Math.max(0, h - radius * 2);
  const arc = (Math.PI / 2) * radius;
  const total = straightW * 2 + straightH * 2 + arc * 4;
  if (total <= 0 || steps < 2) return [];
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < steps; i += 1) {
    let d = (i / steps) * total;
    if (d < straightW) {
      pts.push([x + radius + d, y]);
      continue;
    }
    d -= straightW;
    if (d < arc) {
      const a = -Math.PI / 2 + (d / arc) * (Math.PI / 2);
      pts.push([
        x + w - radius + Math.cos(a) * radius,
        y + radius + Math.sin(a) * radius,
      ]);
      continue;
    }
    d -= arc;
    if (d < straightH) {
      pts.push([x + w, y + radius + d]);
      continue;
    }
    d -= straightH;
    if (d < arc) {
      const a = (d / arc) * (Math.PI / 2);
      pts.push([
        x + w - radius + Math.cos(a) * radius,
        y + h - radius + Math.sin(a) * radius,
      ]);
      continue;
    }
    d -= arc;
    if (d < straightW) {
      pts.push([x + w - radius - d, y + h]);
      continue;
    }
    d -= straightW;
    if (d < arc) {
      const a = Math.PI / 2 + (d / arc) * (Math.PI / 2);
      pts.push([
        x + radius + Math.cos(a) * radius,
        y + h - radius + Math.sin(a) * radius,
      ]);
      continue;
    }
    d -= arc;
    if (d < straightH) {
      pts.push([x, y + h - radius - d]);
      continue;
    }
    d -= straightH;
    const a = Math.PI + (d / Math.max(arc, 0.0001)) * (Math.PI / 2);
    pts.push([
      x + radius + Math.cos(a) * radius,
      y + radius + Math.sin(a) * radius,
    ]);
  }
  return pts;
}
