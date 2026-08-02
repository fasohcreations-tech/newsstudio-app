import type {
  ComposerLeftTab,
  ComposerRightTab,
  SceneComponentKind,
  SceneObjectType,
  SceneWorkflowState,
} from "@/features/scene-composer/types/scene-composer.types";

export const SCENE_OBJECT_TYPES = [
  "rectangle",
  "rounded_rectangle",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "svg",
  "image",
  "video",
  "logo",
  "text",
  "rich_text",
  "ticker",
  "clock",
  "date",
  "weather",
  "qr_code",
  "countdown",
  "counter",
  "particle_placeholder",
  "gradient",
  "mask",
  "group",
  "component",
] as const satisfies readonly SceneObjectType[];

export const SCENE_OBJECT_TYPE_LABELS: Record<SceneObjectType, string> = {
  rectangle: "Rectangle",
  rounded_rectangle: "Rounded Rectangle",
  circle: "Circle",
  ellipse: "Ellipse",
  line: "Line",
  polygon: "Polygon",
  svg: "SVG",
  image: "Image",
  video: "Video",
  logo: "Logo",
  text: "Text",
  rich_text: "Rich Text",
  ticker: "Ticker",
  clock: "Clock",
  date: "Date",
  weather: "Weather",
  qr_code: "QR Code",
  countdown: "Countdown",
  counter: "Counter",
  particle_placeholder: "Particles",
  gradient: "Gradient",
  mask: "Mask",
  group: "Group",
  component: "Component",
};

export const WORKFLOW_STATES = [
  "draft",
  "review",
  "approved",
  "published",
  "archived",
] as const satisfies readonly SceneWorkflowState[];

export const WORKFLOW_STATE_LABELS: Record<SceneWorkflowState, string> = {
  draft: "Draft",
  review: "Review",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

export const RESOLUTION_PRESETS = [
  { id: "1920x1080", label: "1920×1080 (HD)", width: 1920, height: 1080 },
  { id: "1080x1920", label: "1080×1920 (Vertical)", width: 1080, height: 1920 },
  { id: "1080x1080", label: "1080×1080 (Square)", width: 1080, height: 1080 },
  { id: "3840x2160", label: "3840×2160 (4K)", width: 3840, height: 2160 },
] as const;

export const COMPOSER_VARIABLE_KEYS = [
  "headline",
  "subheadline",
  "summary",
  "reporter",
  "designation",
  "organization",
  "location",
  "date",
  "time",
  "logo",
  "image",
  "video",
  "voice",
  "music",
  "ticker",
  "verse",
  "verse_reference",
  "primary_color",
  "secondary_color",
] as const;

export const DEFAULT_SYSTEM_COMPONENTS: Array<{
  slug: string;
  name: string;
  component_kind: SceneComponentKind;
}> = [
  { slug: "logo", name: "Logo Component", component_kind: "logo" },
  { slug: "lower-third", name: "Lower Third Component", component_kind: "lower_third" },
  { slug: "title", name: "Title Component", component_kind: "title" },
  { slug: "background", name: "Background Component", component_kind: "background" },
  { slug: "animation", name: "Animation Component", component_kind: "animation" },
  { slug: "ticker", name: "Ticker Component", component_kind: "ticker" },
  { slug: "clock", name: "Clock Component", component_kind: "clock" },
];

export const SHAPE_TOOL_OBJECTS: SceneObjectType[] = [
  "rectangle",
  "rounded_rectangle",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "gradient",
];

export const MEDIA_TOOL_OBJECTS: SceneObjectType[] = [
  "image",
  "video",
  "logo",
  "svg",
];

export const TEXT_TOOL_OBJECTS: SceneObjectType[] = [
  "text",
  "rich_text",
  "ticker",
];

export const DATA_TOOL_OBJECTS: SceneObjectType[] = [
  "clock",
  "date",
  "weather",
  "countdown",
  "counter",
  "qr_code",
];

export const COMPOSER_LEFT_TABS: Array<{ id: ComposerLeftTab; label: string }> = [
  { id: "library", label: "Scenes" },
  { id: "templates", label: "Templates" },
  { id: "media", label: "Media" },
  { id: "brand", label: "Brand" },
  { id: "icons", label: "Icons" },
  { id: "shapes", label: "Shapes" },
  { id: "svg", label: "SVG" },
  { id: "stock", label: "Stock" },
  { id: "ai", label: "AI" },
];

export const COMPOSER_RIGHT_TABS: Array<{ id: ComposerRightTab; label: string }> = [
  { id: "properties", label: "Props" },
  { id: "inspector", label: "Inspect" },
  { id: "animations", label: "Anim" },
  { id: "variables", label: "Vars" },
  { id: "effects", label: "FX" },
  { id: "bindings", label: "Bind" },
  { id: "theme", label: "Theme" },
];

export const LAYER_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
];

export const ANIMATION_PRESET_CATALOG = [
  { id: "fade-in", name: "Fade In", kind: "fade" },
  { id: "fade-out", name: "Fade Out", kind: "fade" },
  { id: "slide-left", name: "Slide Left", kind: "slide" },
  { id: "slide-right", name: "Slide Right", kind: "slide" },
  { id: "slide-up", name: "Slide Up", kind: "slide" },
  { id: "slide-down", name: "Slide Down", kind: "slide" },
  { id: "zoom-in", name: "Zoom In", kind: "zoom" },
  { id: "scale-pop", name: "Scale Pop", kind: "scale" },
  { id: "bounce", name: "Bounce", kind: "bounce" },
  { id: "elastic", name: "Elastic", kind: "elastic" },
  { id: "typewriter", name: "Typewriter", kind: "typewriter" },
  { id: "reveal", name: "Reveal", kind: "reveal" },
  { id: "blur-in", name: "Blur In", kind: "blur" },
  { id: "rotate", name: "Rotate", kind: "rotate" },
] as const;

export const TRANSITION_PRESETS = [
  { id: "scene-in-fade", name: "Scene In — Fade", direction: "in" },
  { id: "scene-out-fade", name: "Scene Out — Fade", direction: "out" },
  { id: "crossfade", name: "Crossfade", direction: "both" },
  { id: "push-left", name: "Push Left", direction: "in" },
  { id: "reveal-mask", name: "Mask Reveal", direction: "in" },
  { id: "zoom-in", name: "Zoom In", direction: "in" },
  { id: "slide-up", name: "Slide Up", direction: "in" },
] as const;
