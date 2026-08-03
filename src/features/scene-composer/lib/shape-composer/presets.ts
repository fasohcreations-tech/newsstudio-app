import type { ShapePreset } from "@/features/scene-composer/lib/shape-composer/types";

export const SHAPE_PRESETS: ShapePreset[] = [
  {
    id: "preset.border-hairline",
    name: "Hairline Border",
    group: "border",
    config: { strokeWidth: 1, strokeStyle: "solid", strokeColor: "#FFFFFF" },
  },
  {
    id: "preset.border-broadcast",
    name: "Broadcast Border",
    group: "border",
    config: { strokeWidth: 3, strokeStyle: "solid", strokeColor: "#FFFFFF" },
  },
  {
    id: "preset.border-dashed",
    name: "Dashed Border",
    group: "border",
    config: { strokeWidth: 2, strokeStyle: "dashed", strokeColor: "#94A3B8" },
  },
  {
    id: "preset.corner-soft",
    name: "Soft Corners",
    group: "corner",
    config: {
      uniformCorners: true,
      cornerRadii: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 },
    },
  },
  {
    id: "preset.corner-pill",
    name: "Pill Corners",
    group: "corner",
    config: {
      uniformCorners: true,
      cornerRadii: { topLeft: 999, topRight: 999, bottomRight: 999, bottomLeft: 999 },
    },
  },
  {
    id: "preset.corner-sharp",
    name: "Sharp Corners",
    group: "corner",
    config: {
      uniformCorners: true,
      cornerRadii: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    },
  },
  {
    id: "preset.material-glass",
    name: "Glass Material",
    group: "material",
    config: {
      material: "glass",
      glass: {
        enabled: true,
        blur: 12,
        opacity: 0.55,
        tint: "rgba(255,255,255,0.2)",
        noise: 0.1,
        reflection: 0.3,
      },
      fill: "rgba(255,255,255,0.12)",
    },
  },
  {
    id: "preset.material-metallic",
    name: "Metallic Style",
    group: "material",
    config: {
      material: "metallic",
      fillMode: "gradient",
      gradient: {
        type: "linear",
        angle: 135,
        stops: [
          { offset: 0, color: "#E2E8F0" },
          { offset: 0.5, color: "#94A3B8" },
          { offset: 1, color: "#64748B" },
        ],
      },
      strokeColor: "#CBD5E1",
      strokeWidth: 1.5,
    },
  },
  {
    id: "preset.material-broadcast-frame",
    name: "Broadcast Frame Style",
    group: "material",
    config: {
      material: "broadcast_frame",
      fillMode: "none",
      strokeWidth: 4,
      strokeColor: "#FFFFFF",
      borderPadding: 10,
      shadow: {
        enabled: true,
        color: "#000000",
        blur: 20,
        spread: 0,
        offsetX: 0,
        offsetY: 10,
        opacity: 0.4,
      },
    },
  },
  {
    id: "preset.accent-blue",
    name: "Blue Corner Accent",
    group: "accent",
    config: {
      kind: "corner_accent",
      fill: "#5B8DEF",
      strokeWidth: 0,
    },
  },
  {
    id: "preset.panel-lower-third",
    name: "Lower Third Panel",
    group: "panel",
    config: {
      kind: "rounded_rectangle",
      fill: "#FFFFFF",
      uniformCorners: true,
      cornerRadii: { topLeft: 6, topRight: 6, bottomRight: 6, bottomLeft: 6 },
      shadow: {
        enabled: true,
        color: "#000000",
        blur: 16,
        spread: 0,
        offsetX: 0,
        offsetY: 6,
        opacity: 0.28,
      },
    },
  },
];

export const SHAPE_KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "rectangle", label: "Rectangle" },
  { value: "rounded_rectangle", label: "Rounded Rectangle" },
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "line", label: "Line" },
  { value: "arrow", label: "Arrow" },
  { value: "triangle", label: "Triangle" },
  { value: "polygon", label: "Polygon" },
  { value: "star", label: "Star" },
  { value: "ribbon", label: "Ribbon" },
  { value: "speech_bubble", label: "Speech Bubble" },
  { value: "svg_path", label: "SVG Path" },
  { value: "custom_path", label: "Custom Path" },
  { value: "image_mask", label: "Image Mask" },
  { value: "video_mask", label: "Video Mask" },
  { value: "glass_panel", label: "Glass Panel" },
  { value: "gradient_panel", label: "Gradient Panel" },
  { value: "border_frame", label: "Border Frame" },
  { value: "corner_accent", label: "Corner Accent" },
  { value: "divider_line", label: "Divider Line" },
  { value: "ticker_bar", label: "Ticker Bar" },
  { value: "headline_bar", label: "Headline Bar" },
  { value: "reporter_card", label: "Reporter Card" },
  { value: "video_frame", label: "Video Frame" },
];

export const SHAPE_BEHAVIOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "draw_on", label: "Draw On" },
  { value: "border_build", label: "Border Build" },
  { value: "corner_build", label: "Corner Build" },
  { value: "panel_grow", label: "Panel Grow" },
  { value: "ribbon_expand", label: "Ribbon Expand" },
  { value: "morph", label: "Morph" },
  { value: "split", label: "Split" },
  { value: "merge", label: "Merge" },
  { value: "trace", label: "Trace" },
  { value: "outline_sweep", label: "Outline Sweep" },
  { value: "edge_sweep", label: "Edge Sweep" },
  { value: "light_sweep", label: "Light Sweep" },
  { value: "travel_across", label: "Travel Across" },
  { value: "shape_cascade", label: "Shape Cascade" },
  { value: "reveal_exit", label: "Reveal Exit" },
];

export const SHAPE_TRAVEL_DIRECTION_OPTIONS: Array<{
  value: "left" | "right" | "up" | "down";
  label: string;
}> = [
  { value: "right", label: "Left → Right" },
  { value: "left", label: "Right → Left" },
  { value: "down", label: "Top → Bottom" },
  { value: "up", label: "Bottom → Top" },
];

export const SHAPE_REVEAL_EXIT_STYLE_OPTIONS: Array<{
  value: "fade" | "scale_out" | "wipe" | "slide" | "reverse";
  label: string;
}> = [
  { value: "fade", label: "Fade out" },
  { value: "scale_out", label: "Scale out" },
  { value: "wipe", label: "Wipe" },
  { value: "slide", label: "Slide" },
  { value: "reverse", label: "Reverse grow" },
];

export const SHAPE_REVEAL_EXIT_DIRECTION_OPTIONS: Array<{
  value: "up" | "down" | "left" | "right" | "center";
  label: string;
}> = [
  { value: "up", label: "Up" },
  { value: "down", label: "Down" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "center", label: "Center" },
];
