import type { MotionSceneType } from "@/features/motion-scene-engine/types/motion-scene.types";
import type {
  ComposerSceneDocument,
  SceneObject,
  SceneObjectType,
} from "@/features/scene-composer/types/scene-composer.types";

export const GNN_BROADCAST_PACKAGE_ID = "gnn-broadcast-v1";

export const GNN_MASTER_SCENE_CODES = [
  "GNN-001",
  "GNN-002",
  "GNN-003",
  "GNN-004",
  "GNN-005",
  "GNN-006",
  "GNN-007",
  "GNN-008",
  "GNN-009",
  "GNN-010",
] as const;

export type GnnMasterSceneCode = (typeof GNN_MASTER_SCENE_CODES)[number];

export const GNN_VARIABLES = [
  "headline",
  "subheadline",
  "summary",
  "reporter",
  "guest",
  "designation",
  "location",
  "date",
  "time",
  "logo",
  "image",
  "video",
  "voice",
  "music",
  "ticker",
  "quote",
  "author",
  "verse",
  "reference",
] as const;

export const GNN_DESIGN_SYSTEM = {
  package_id: GNN_BROADCAST_PACKAGE_ID,
  package_name: "GNN Broadcast Package v1",
  typography: {
    primary_font: "Noto Sans Malayalam",
    secondary_font: "Inter",
    malayalam_support: true,
    english_support: true,
  },
  color_palette: {
    primary_blue: "#1D4ED8",
    secondary_blue: "#2563EB",
    breaking_red: "#DC2626",
    warning_yellow: "#FACC15",
    success_green: "#16A34A",
    white: "#FFFFFF",
    dark_grey: "#1F2937",
    black: "#000000",
  },
  spacing: {
    grid: 8,
    safe_margin: 48,
  },
  motion_language: {
    style: "fast-professional-minimal-smooth",
    presets: [
      "fade",
      "slide",
      "reveal",
      "zoom",
      "push",
      "typewriter",
      "blur",
      "elastic",
      "bounce",
      "mask_reveal",
    ],
  },
  visual_tokens: {
    border_radius: 8,
    shadow: "0 8px 24px rgba(0,0,0,0.24)",
    glass_panel: "rgba(15,23,42,0.65)",
    card_bg: "rgba(15,23,42,0.9)",
  },
  themes: ["light", "dark", "channel"],
} as const;

export const GNN_COMPONENT_LIBRARY = [
  { slug: "gnn-background", name: "Background Component", component_kind: "background" },
  { slug: "gnn-header", name: "Header Component", component_kind: "title" },
  { slug: "gnn-footer", name: "Footer Component", component_kind: "ticker" },
  { slug: "gnn-headline", name: "Headline Component", component_kind: "title" },
  { slug: "gnn-video", name: "Video Component", component_kind: "custom" },
  { slug: "gnn-image", name: "Image Component", component_kind: "custom" },
  { slug: "gnn-logo", name: "Logo Component", component_kind: "logo" },
  { slug: "gnn-ticker", name: "Ticker Component", component_kind: "ticker" },
  { slug: "gnn-clock", name: "Clock Component", component_kind: "clock" },
  { slug: "gnn-date", name: "Date Component", component_kind: "custom" },
  { slug: "gnn-reporter", name: "Reporter Component", component_kind: "lower_third" },
  { slug: "gnn-quote", name: "Quote Component", component_kind: "custom" },
  { slug: "gnn-verse", name: "Bible Verse Component", component_kind: "custom" },
  { slug: "gnn-statistics", name: "Statistics Component", component_kind: "custom" },
  { slug: "gnn-animation", name: "Animation Component", component_kind: "animation" },
] as const;

export const GNN_MOTION_PRESETS = [
  { name: "GNN Fade In", kind: "fade", duration_ms: 320, config: { from: 0, to: 1 } },
  { name: "GNN Slide Up", kind: "slide", duration_ms: 460, config: { direction: "up", distance: 48 } },
  { name: "GNN Reveal Wipe", kind: "reveal", duration_ms: 540, config: { mask: "wipe", softness: 0.12 } },
  { name: "GNN Zoom Soft", kind: "zoom", duration_ms: 420, config: { from: 0.92, to: 1 } },
  { name: "GNN Push Left", kind: "push", duration_ms: 500, config: { direction: "left" } },
  { name: "GNN Typewriter", kind: "typewriter", duration_ms: 1350, config: { chars_per_sec: 24 } },
  { name: "GNN Blur In", kind: "blur", duration_ms: 380, config: { from: 10, to: 0 } },
  { name: "GNN Elastic", kind: "elastic", duration_ms: 560, config: { tension: 0.58 } },
  { name: "GNN Bounce", kind: "bounce", duration_ms: 480, config: { amplitude: 0.14 } },
  { name: "GNN Mask Reveal", kind: "reveal", duration_ms: 620, config: { mask: "gradient" } },
] as const;

export type GnnMasterSceneDefinition = {
  code: GnnMasterSceneCode;
  name: string;
  scene_type: MotionSceneType;
  description: string;
  defaults: {
    duration_ms: number;
    objects: Array<{
      key: string;
      name: string;
      object_type: SceneObjectType;
      x: number;
      y: number;
      width: number;
      height: number;
      text?: string;
      fill?: string;
    }>;
  };
};

export type GnnSceneDraft = {
  scene_type: MotionSceneType;
  name: string;
  description: string;
  duration_ms: number;
  composer_document: ComposerSceneDocument;
  responsive_documents: Record<string, ComposerSceneDocument>;
  metadata: Record<string, unknown>;
};

export type GnnSceneObjectFactory = (input: {
  name: string;
  object_type: SceneObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fill?: string;
}) => SceneObject;
