import { createDefaultShapeConfig } from "@/features/scene-composer/lib/shape-composer/defaults";
import type {
  ShapeLibraryCategory,
  ShapeLibraryItem,
} from "@/features/scene-composer/lib/shape-composer/types";

export const SHAPE_LIBRARY_CATEGORIES: Array<{
  id: ShapeLibraryCategory;
  label: string;
}> = [
  { id: "video_frames", label: "Video Frames" },
  { id: "reporter_cards", label: "Reporter Cards" },
  { id: "lower_third_panels", label: "Lower Third Panels" },
  { id: "headline_panels", label: "Headline Panels" },
  { id: "tickers", label: "Tickers" },
  { id: "background_panels", label: "Background Panels" },
  { id: "corner_accents", label: "Corner Accents" },
  { id: "broadcast_frames", label: "Broadcast Frames" },
  { id: "divider_lines", label: "Divider Lines" },
  { id: "information_boxes", label: "Information Boxes" },
  { id: "buttons", label: "Buttons" },
  { id: "icons", label: "Icons" },
  { id: "live_badges", label: "Live Badges" },
  { id: "breaking_news_bars", label: "Breaking News Bars" },
];

function item(
  partial: Omit<ShapeLibraryItem, "config"> & {
    config?: ShapeLibraryItem["config"];
  },
): ShapeLibraryItem {
  return {
    ...partial,
    config: partial.config ?? createDefaultShapeConfig(partial.kind),
  };
}

/** Reusable broadcast shape components for the Shape Library. */
export const SHAPE_LIBRARY: ShapeLibraryItem[] = [
  item({
    id: "lib.video-frame-16x9",
    name: "Video Frame 16:9",
    description: "Clean broadcast video frame",
    category: "video_frames",
    kind: "video_frame",
    tags: ["video", "frame"],
    defaultWidth: 960,
    defaultHeight: 540,
    config: createDefaultShapeConfig("video_frame", {
      strokeWidth: 4,
      strokeColor: "#FFFFFF",
      fillMode: "none",
      borderPadding: 10,
      material: "broadcast_frame",
    }),
  }),
  item({
    id: "lib.reporter-card",
    name: "Reporter Card",
    description: "Name plate / reporter lower card",
    category: "reporter_cards",
    kind: "reporter_card",
    tags: ["reporter", "card"],
    defaultWidth: 420,
    defaultHeight: 96,
    config: createDefaultShapeConfig("reporter_card", {
      fill: "#FFFFFF",
      cornerRadii: { topLeft: 8, topRight: 8, bottomRight: 8, bottomLeft: 8 },
    }),
  }),
  item({
    id: "lib.lower-third-panel",
    name: "Lower Third Panel",
    description: "Wide lower-third plate",
    category: "lower_third_panels",
    kind: "rounded_rectangle",
    tags: ["lower-third"],
    defaultWidth: 1100,
    defaultHeight: 140,
    config: createDefaultShapeConfig("rounded_rectangle", {
      fill: "#FFFFFF",
      cornerRadii: { topLeft: 6, topRight: 6, bottomRight: 6, bottomLeft: 6 },
    }),
  }),
  item({
    id: "lib.headline-bar",
    name: "Headline Bar",
    description: "Solid headline accent bar",
    category: "headline_panels",
    kind: "headline_bar",
    tags: ["headline"],
    defaultWidth: 1280,
    defaultHeight: 72,
    config: createDefaultShapeConfig("headline_bar", {
      fill: "#1D4ED8",
      cornerRadii: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    }),
  }),
  item({
    id: "lib.ticker-bar",
    name: "Ticker Bar",
    description: "Full-width ticker plate",
    category: "tickers",
    kind: "ticker_bar",
    tags: ["ticker"],
    defaultWidth: 1920,
    defaultHeight: 64,
    config: createDefaultShapeConfig("ticker_bar", {
      fill: "#0F172A",
    }),
  }),
  item({
    id: "lib.glass-panel",
    name: "Glass Panel",
    description: "Frosted glass broadcast panel",
    category: "background_panels",
    kind: "glass_panel",
    tags: ["glass"],
    defaultWidth: 640,
    defaultHeight: 360,
    config: createDefaultShapeConfig("glass_panel"),
  }),
  item({
    id: "lib.gradient-panel",
    name: "Gradient Panel",
    description: "Linear gradient backdrop panel",
    category: "background_panels",
    kind: "gradient_panel",
    tags: ["gradient"],
    defaultWidth: 800,
    defaultHeight: 450,
    config: createDefaultShapeConfig("gradient_panel"),
  }),
  item({
    id: "lib.corner-accent",
    name: "Corner Accent",
    description: "L-shaped corner mark",
    category: "corner_accents",
    kind: "corner_accent",
    tags: ["corner", "accent"],
    defaultWidth: 120,
    defaultHeight: 120,
    config: createDefaultShapeConfig("corner_accent", {
      fill: "#5B8DEF",
      strokeWidth: 0,
    }),
  }),
  item({
    id: "lib.border-frame",
    name: "Border Frame",
    description: "Inset border frame",
    category: "broadcast_frames",
    kind: "border_frame",
    tags: ["frame", "border"],
    defaultWidth: 720,
    defaultHeight: 405,
    config: createDefaultShapeConfig("border_frame", {
      fillMode: "none",
      strokeWidth: 3,
      strokeColor: "#FFFFFF",
      borderPadding: 12,
    }),
  }),
  item({
    id: "lib.divider-line",
    name: "Divider Line",
    description: "Horizontal divider",
    category: "divider_lines",
    kind: "divider_line",
    tags: ["divider"],
    defaultWidth: 480,
    defaultHeight: 8,
    config: createDefaultShapeConfig("divider_line", {
      strokeWidth: 3,
      strokeColor: "#94A3B8",
    }),
  }),
  item({
    id: "lib.info-box",
    name: "Information Box",
    description: "Rounded info container",
    category: "information_boxes",
    kind: "rounded_rectangle",
    tags: ["info"],
    defaultWidth: 360,
    defaultHeight: 220,
    config: createDefaultShapeConfig("rounded_rectangle", {
      fill: "rgba(15,23,42,0.92)",
      cornerRadii: { topLeft: 14, topRight: 14, bottomRight: 14, bottomLeft: 14 },
    }),
  }),
  item({
    id: "lib.button-pill",
    name: "Broadcast Button",
    description: "Pill CTA shape",
    category: "buttons",
    kind: "rounded_rectangle",
    tags: ["button"],
    defaultWidth: 220,
    defaultHeight: 56,
    config: createDefaultShapeConfig("rounded_rectangle", {
      fill: "#1D4ED8",
      cornerRadii: { topLeft: 28, topRight: 28, bottomRight: 28, bottomLeft: 28 },
    }),
  }),
  item({
    id: "lib.icon-star",
    name: "Star Icon",
    description: "Five-point star",
    category: "icons",
    kind: "star",
    tags: ["icon", "star"],
    defaultWidth: 96,
    defaultHeight: 96,
    config: createDefaultShapeConfig("star", { fill: "#C6A15B" }),
  }),
  item({
    id: "lib.live-badge",
    name: "LIVE Badge",
    description: "On-air live pill",
    category: "live_badges",
    kind: "rounded_rectangle",
    tags: ["live"],
    defaultWidth: 110,
    defaultHeight: 36,
    config: createDefaultShapeConfig("rounded_rectangle", {
      fill: "#DC2626",
      cornerRadii: { topLeft: 6, topRight: 6, bottomRight: 6, bottomLeft: 6 },
    }),
  }),
  item({
    id: "lib.breaking-bar",
    name: "Breaking News Bar",
    description: "Urgent breaking strip",
    category: "breaking_news_bars",
    kind: "ribbon",
    tags: ["breaking"],
    defaultWidth: 720,
    defaultHeight: 64,
    config: createDefaultShapeConfig("ribbon", {
      fill: "#B91C1C",
      strokeWidth: 0,
    }),
  }),
  item({
    id: "lib.speech-bubble",
    name: "Speech Bubble",
    description: "Callout bubble",
    category: "information_boxes",
    kind: "speech_bubble",
    tags: ["bubble"],
    defaultWidth: 320,
    defaultHeight: 180,
    config: createDefaultShapeConfig("speech_bubble", { fill: "#FFFFFF" }),
  }),
  item({
    id: "lib.arrow",
    name: "Arrow",
    description: "Directional arrow",
    category: "icons",
    kind: "arrow",
    tags: ["arrow"],
    defaultWidth: 240,
    defaultHeight: 72,
    config: createDefaultShapeConfig("arrow", { fill: "#5B8DEF" }),
  }),
];

export function listShapeLibrary(
  category?: ShapeLibraryCategory | "all",
): ShapeLibraryItem[] {
  if (!category || category === "all") return SHAPE_LIBRARY;
  return SHAPE_LIBRARY.filter((item) => item.category === category);
}

export function getShapeLibraryItem(id: string): ShapeLibraryItem | undefined {
  return SHAPE_LIBRARY.find((item) => item.id === id);
}
