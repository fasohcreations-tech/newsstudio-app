import type {
  ShapeComposerConfig,
  ShapeKind,
  ShapePath,
  ShapePathPoint,
} from "@/features/scene-composer/lib/shape-composer/types";
import {
  createDefaultAnchorPoint,
  createDefaultPlacement,
  anchorPresetToPoint,
} from "@/features/scene-composer/lib/shape-composer/anchor";
import { createDefaultReveal } from "@/features/scene-composer/lib/shape-composer/reveal";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createPathPoint(
  x: number,
  y: number,
  partial?: Partial<ShapePathPoint>,
): ShapePathPoint {
  return {
    id: uid("pt"),
    x,
    y,
    handleInX: 0,
    handleInY: 0,
    handleOutX: 0,
    handleOutY: 0,
    corner: true,
    smooth: false,
    ...partial,
  };
}

export function createDefaultPath(closed = true): ShapePath {
  return {
    closed,
    points: [
      createPathPoint(0.15, 0.2),
      createPathPoint(0.85, 0.2),
      createPathPoint(0.85, 0.8),
      createPathPoint(0.15, 0.8),
    ],
  };
}

export function createDefaultShapeConfig(
  kind: ShapeKind = "rectangle",
  partial?: Partial<ShapeComposerConfig>,
): ShapeComposerConfig {
  const panelLike = [
    "glass_panel",
    "gradient_panel",
    "border_frame",
    "ticker_bar",
    "headline_bar",
    "reporter_card",
    "video_frame",
  ].includes(kind);

  const base: ShapeComposerConfig = {
    version: 1,
    enabled: true,
    kind,
    radius: kind === "circle" || kind === "ellipse" ? 999 : 0,
    cornerRadii: {
      topLeft: kind === "rounded_rectangle" || panelLike ? 12 : 0,
      topRight: kind === "rounded_rectangle" || panelLike ? 12 : 0,
      bottomRight: kind === "rounded_rectangle" || panelLike ? 12 : 0,
      bottomLeft: kind === "rounded_rectangle" || panelLike ? 12 : 0,
    },
    uniformCorners: true,
    sides: kind === "polygon" ? 6 : 3,
    starPoints: 5,
    starInnerRadius: 0.45,
    arrowHeadSize: 0.22,
    strokeWidth: kind === "line" || kind === "divider_line" || kind === "arrow" ? 3 : 2,
    strokeStyle: kind === "border_frame" || kind === "video_frame" ? "solid" : "solid",
    strokeColor:
      kind === "video_frame" || kind === "border_frame" ? "#FFFFFF" : "#94A3B8",
    fillMode:
      kind === "line" || kind === "divider_line" || kind === "arrow"
        ? "none"
        : kind === "gradient_panel"
          ? "gradient"
          : "solid",
    fill:
      kind === "glass_panel"
        ? "rgba(255,255,255,0.12)"
        : kind === "headline_bar"
          ? "#1D4ED8"
          : kind === "ticker_bar"
            ? "#0F172A"
            : kind === "reporter_card"
              ? "#FFFFFF"
              : "rgba(99,102,241,0.85)",
    gradient: {
      type: "linear",
      angle: 180,
      stops: [
        { offset: 0, color: "#0B1220" },
        { offset: 1, color: "#1E293B" },
      ],
    },
    opacity: 1,
    shadow: {
      enabled: panelLike,
      color: "#000000",
      blur: 18,
      spread: 0,
      offsetX: 0,
      offsetY: 8,
      opacity: 0.35,
    },
    glow: {
      enabled: false,
      color: "#5B8DEF",
      intensity: 0.45,
      radius: 12,
    },
    glass: {
      enabled: kind === "glass_panel",
      blur: 10,
      opacity: 0.55,
      tint: "rgba(255,255,255,0.18)",
      noise: 0.08,
      reflection: 0.25,
    },
    reflection: kind === "glass_panel" ? 0.2 : 0,
    borderPadding: kind === "border_frame" || kind === "video_frame" ? 8 : 0,
    padding: 0,
    margin: 0,
    rotation: 0,
    anchor: "center",
    anchorPoint: createDefaultAnchorPoint(anchorPresetToPoint("center")),
    placement: createDefaultPlacement(),
    path: createDefaultPath(kind !== "line" && kind !== "arrow"),
    maskSrc: "",
    material:
      kind === "glass_panel"
        ? "glass"
        : kind === "video_frame" || kind === "border_frame"
          ? "broadcast_frame"
          : "standard",
    behaviors: [],
    reveal: createDefaultReveal({ enabled: true }),
    lockedGeometry: false,
    hidden: false,
  };

  return {
    ...base,
    ...partial,
    version: 1,
    kind: partial?.kind ?? kind,
    reveal: createDefaultReveal({ ...base.reveal, ...partial?.reveal }),
    anchorPoint: createDefaultAnchorPoint({
      ...base.anchorPoint,
      ...partial?.anchorPoint,
    }),
    placement: createDefaultPlacement({
      ...base.placement,
      ...partial?.placement,
    }),
  };
}

/** Infer a starting shape kind from a scene object_type string. */
export function shapeKindFromObjectType(objectType: string): ShapeKind {
  switch (objectType) {
    case "rounded_rectangle":
      return "rounded_rectangle";
    case "circle":
      return "circle";
    case "ellipse":
      return "ellipse";
    case "line":
      return "line";
    case "polygon":
      return "polygon";
    case "gradient":
      return "gradient_panel";
    case "mask":
      return "image_mask";
    case "svg":
      return "svg_path";
    default:
      return "rectangle";
  }
}
