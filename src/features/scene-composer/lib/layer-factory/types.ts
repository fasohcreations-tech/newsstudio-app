/**
 * Feature 042 — LayerFactory kind registry.
 *
 * `LayerKind` is the creation-menu identity (Headline, Lower Third, …).
 * It maps onto a `SceneObject` via recipes — never assume Rectangle.
 */

import type { SceneObjectType } from "@/features/scene-composer/types/scene-composer.types";

export type LayerCategory =
  | "text"
  | "media"
  | "shapes"
  | "vector"
  | "broadcast"
  | "containers"
  | "generators";

export type LayerKind =
  // Text
  | "headline"
  | "subheadline"
  | "paragraph"
  | "rich_text"
  | "bible_verse"
  | "quote"
  | "scrolling_text"
  // Media
  | "image"
  | "video"
  | "audio"
  | "image_sequence"
  | "live_stream"
  | "web_page"
  // Shapes
  | "rectangle"
  | "rounded_rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "polygon"
  | "line"
  | "arrow"
  | "star"
  // Vector
  | "svg"
  | "icon"
  | "logo"
  // Broadcast
  | "lower_third"
  | "clock"
  | "date"
  | "breaking_news_strap"
  | "ticker"
  | "reporter_box"
  | "location_box"
  | "qr_code"
  // Containers
  | "group"
  | "folder"
  | "mask"
  | "component"
  | "smart_container"
  // Generators
  | "gradient"
  | "noise"
  | "background"
  | "grid"
  | "pattern";

export type LayerMenuItem = {
  kind: LayerKind;
  label: string;
  category: LayerCategory;
  description?: string;
};

export const LAYER_CATEGORY_LABELS: Record<LayerCategory, string> = {
  text: "Text",
  media: "Media",
  shapes: "Shapes",
  vector: "Vector",
  broadcast: "Broadcast",
  containers: "Containers",
  generators: "Generators",
};

/** Menu order for the Add Layer panel. */
export const LAYER_CATEGORY_ORDER: LayerCategory[] = [
  "text",
  "media",
  "shapes",
  "vector",
  "broadcast",
  "containers",
  "generators",
];

/**
 * Canonical menu catalog. Adding a new layer type later =
 * register a recipe + add one entry here (or via LayerFactory.register).
 */
export const LAYER_MENU_CATALOG: LayerMenuItem[] = [
  // Text
  { kind: "headline", label: "Headline", category: "text" },
  { kind: "subheadline", label: "Subheadline", category: "text" },
  { kind: "paragraph", label: "Paragraph", category: "text" },
  { kind: "rich_text", label: "Rich Text", category: "text" },
  { kind: "bible_verse", label: "Bible Verse", category: "text" },
  { kind: "quote", label: "Quote", category: "text" },
  { kind: "scrolling_text", label: "Scrolling Text", category: "text" },
  // Media
  { kind: "image", label: "Image", category: "media" },
  { kind: "video", label: "Video", category: "media" },
  { kind: "audio", label: "Audio", category: "media" },
  { kind: "image_sequence", label: "Image Sequence", category: "media" },
  { kind: "live_stream", label: "Live Stream", category: "media" },
  { kind: "web_page", label: "Web Page", category: "media" },
  // Shapes
  { kind: "rectangle", label: "Rectangle", category: "shapes" },
  { kind: "rounded_rectangle", label: "Rounded Rectangle", category: "shapes" },
  { kind: "circle", label: "Circle", category: "shapes" },
  { kind: "ellipse", label: "Ellipse", category: "shapes" },
  { kind: "triangle", label: "Triangle", category: "shapes" },
  { kind: "polygon", label: "Polygon", category: "shapes" },
  { kind: "line", label: "Line", category: "shapes" },
  { kind: "arrow", label: "Arrow", category: "shapes" },
  { kind: "star", label: "Star", category: "shapes" },
  // Vector
  { kind: "svg", label: "SVG", category: "vector" },
  { kind: "icon", label: "Icon", category: "vector" },
  { kind: "logo", label: "Logo", category: "vector" },
  // Broadcast
  { kind: "lower_third", label: "Lower Third", category: "broadcast" },
  { kind: "clock", label: "Clock", category: "broadcast" },
  { kind: "date", label: "Date", category: "broadcast" },
  { kind: "breaking_news_strap", label: "Breaking News Strap", category: "broadcast" },
  { kind: "ticker", label: "Ticker", category: "broadcast" },
  { kind: "reporter_box", label: "Reporter Box", category: "broadcast" },
  { kind: "location_box", label: "Location Box", category: "broadcast" },
  { kind: "qr_code", label: "QR Code", category: "broadcast" },
  // Containers
  { kind: "group", label: "Group", category: "containers" },
  { kind: "folder", label: "Folder", category: "containers" },
  { kind: "mask", label: "Mask", category: "containers" },
  { kind: "component", label: "Component", category: "containers" },
  { kind: "smart_container", label: "Smart Container", category: "containers" },
  // Generators
  { kind: "gradient", label: "Gradient", category: "generators" },
  { kind: "noise", label: "Noise", category: "generators" },
  { kind: "background", label: "Background", category: "generators" },
  { kind: "grid", label: "Grid", category: "generators" },
  { kind: "pattern", label: "Pattern", category: "generators" },
];

/**
 * Maps a LayerKind onto the persisted SceneObjectType.
 * Kinds that are not yet first-class object types store identity in metadata.
 */
export const LAYER_KIND_TO_OBJECT_TYPE: Record<LayerKind, SceneObjectType> = {
  headline: "text",
  subheadline: "text",
  paragraph: "text",
  rich_text: "rich_text",
  bible_verse: "text",
  quote: "text",
  scrolling_text: "ticker",
  image: "image",
  video: "video",
  audio: "video",
  image_sequence: "image",
  live_stream: "video",
  web_page: "image",
  rectangle: "rectangle",
  rounded_rectangle: "rounded_rectangle",
  circle: "circle",
  ellipse: "ellipse",
  triangle: "polygon",
  polygon: "polygon",
  line: "line",
  arrow: "line",
  star: "polygon",
  svg: "svg",
  icon: "svg",
  logo: "logo",
  lower_third: "text",
  clock: "clock",
  date: "date",
  breaking_news_strap: "text",
  ticker: "ticker",
  reporter_box: "text",
  location_box: "text",
  qr_code: "qr_code",
  group: "group",
  folder: "group",
  mask: "mask",
  component: "component",
  smart_container: "group",
  gradient: "gradient",
  noise: "rectangle",
  background: "rectangle",
  grid: "rectangle",
  pattern: "rectangle",
};
