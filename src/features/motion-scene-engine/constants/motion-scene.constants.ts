import type {
  AnimationKind,
  MotionSceneType,
  SceneAspectFormat,
  SceneLayerType,
  ScenePlaceholderKind,
} from "@/features/motion-scene-engine/types/motion-scene.types";

export const MOTION_SCENE_TYPES = [
  "intro",
  "headline",
  "anchor",
  "story",
  "image",
  "video",
  "quote",
  "scripture",
  "breaking_news",
  "live",
  "lower_third",
  "reporter",
  "guest",
  "location",
  "statistics",
  "timeline",
  "map",
  "comparison",
  "weather",
  "promo",
  "sponsor",
  "cta",
  "social",
  "outro",
  "credits",
  "custom",
] as const satisfies readonly MotionSceneType[];

export const MOTION_SCENE_TYPE_LABELS: Record<MotionSceneType, string> = {
  intro: "Intro Scene",
  headline: "Headline Scene",
  anchor: "Anchor Scene",
  story: "Story Scene",
  image: "Image Scene",
  video: "Video Scene",
  quote: "Quote Scene",
  scripture: "Scripture Scene",
  breaking_news: "Breaking News Scene",
  live: "Live Scene",
  lower_third: "Lower Third Scene",
  reporter: "Reporter Scene",
  guest: "Guest Scene",
  location: "Location Scene",
  statistics: "Statistics Scene",
  timeline: "Timeline Scene",
  map: "Map Scene",
  comparison: "Comparison Scene",
  weather: "Weather Scene",
  promo: "Promo Scene",
  sponsor: "Sponsor Scene",
  cta: "CTA Scene",
  social: "Social Scene",
  outro: "Outro Scene",
  credits: "Credits Scene",
  custom: "Custom Scene",
};

export const SCENE_LAYER_TYPES = [
  "rectangle",
  "circle",
  "line",
  "gradient",
  "text",
  "image",
  "video",
  "logo",
  "svg",
  "icon",
  "shape",
  "mask",
  "blur",
  "shadow",
  "particle_placeholder",
  "countdown_placeholder",
  "clock_placeholder",
  "ticker_placeholder",
] as const satisfies readonly SceneLayerType[];

export const PLACEHOLDER_KINDS = [
  "text",
  "headline",
  "subtitle",
  "body",
  "quote",
  "bible_verse",
  "reference",
  "reporter",
  "guest",
  "designation",
  "location",
  "organization",
  "ticker",
  "breaking_title",
  "image",
  "video",
  "logo",
  "portrait",
  "background_video",
  "background_image",
  "date",
  "time",
  "weather",
  "temperature",
  "counter",
  "score",
  "election_result",
  "stock_data",
  "custom_variable",
] as const satisfies readonly ScenePlaceholderKind[];

export const SCENE_VARIABLE_TOKENS = [
  { key: "headline", token: "{{headline}}", label: "Headline" },
  { key: "subtitle", token: "{{subtitle}}", label: "Subtitle" },
  { key: "summary", token: "{{summary}}", label: "Summary" },
  { key: "speaker", token: "{{speaker}}", label: "Speaker" },
  { key: "designation", token: "{{designation}}", label: "Designation" },
  { key: "organization", token: "{{organization}}", label: "Organization" },
  { key: "reporter", token: "{{reporter}}", label: "Reporter" },
  { key: "location", token: "{{location}}", label: "Location" },
  { key: "date", token: "{{date}}", label: "Date" },
  { key: "time", token: "{{time}}", label: "Time" },
  { key: "logo", token: "{{logo}}", label: "Logo" },
  { key: "image", token: "{{image}}", label: "Image" },
  { key: "video", token: "{{video}}", label: "Video" },
  { key: "voice", token: "{{voice}}", label: "Voice" },
  { key: "music", token: "{{music}}", label: "Music" },
  { key: "theme", token: "{{theme}}", label: "Theme" },
  { key: "primary_color", token: "{{primary_color}}", label: "Primary Color" },
  { key: "secondary_color", token: "{{secondary_color}}", label: "Secondary Color" },
] as const;

export const ANIMATION_KINDS = [
  "fade",
  "slide",
  "zoom",
  "scale",
  "push",
  "wipe",
  "typewriter",
  "reveal",
  "blur",
  "bounce",
  "elastic",
  "rotate",
  "opacity",
  "custom",
] as const satisfies readonly AnimationKind[];

export const ANIMATION_KIND_LABELS: Record<AnimationKind, string> = {
  fade: "Fade",
  slide: "Slide",
  zoom: "Zoom",
  scale: "Scale",
  push: "Push",
  wipe: "Wipe",
  typewriter: "Typewriter",
  reveal: "Reveal",
  blur: "Blur",
  bounce: "Bounce",
  elastic: "Elastic",
  rotate: "Rotate",
  opacity: "Opacity",
  custom: "Custom",
};

export const ASPECT_FORMATS: SceneAspectFormat[] = [
  "16:9",
  "9:16",
  "1:1",
  "4:5",
  "21:9",
];

export const ASPECT_DIMENSIONS: Record<
  SceneAspectFormat,
  { width: number; height: number }
> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "21:9": { width: 2560, height: 1080 },
};

export const DEFAULT_SCENE_CATEGORIES = [
  { slug: "intros", name: "Intros & Outros", icon: "play" },
  { slug: "headlines", name: "Headlines", icon: "type" },
  { slug: "lower-thirds", name: "Lower Thirds", icon: "subtitles" },
  { slug: "breaking", name: "Breaking News", icon: "alert-circle" },
  { slug: "live", name: "Live", icon: "radio" },
  { slug: "faith", name: "Faith & Scripture", icon: "book-open" },
  { slug: "data", name: "Statistics & Data", icon: "bar-chart" },
  { slug: "brand", name: "Brand & Sponsors", icon: "badge" },
  { slug: "social", name: "Social", icon: "share-2" },
  { slug: "custom", name: "Custom", icon: "palette" },
] as const;

export const NEWSROOM_QUICK_CREATE = [
  { id: "breaking_news", label: "Breaking News", sceneType: "breaking_news" as const },
  { id: "top_story", label: "Top Story", sceneType: "headline" as const },
  { id: "exclusive", label: "Exclusive", sceneType: "story" as const },
  { id: "live", label: "LIVE", sceneType: "live" as const },
  { id: "reporter", label: "Reporter", sceneType: "reporter" as const },
  { id: "interview", label: "Interview", sceneType: "guest" as const },
  { id: "discussion", label: "Discussion", sceneType: "anchor" as const },
  { id: "debate", label: "Debate", sceneType: "comparison" as const },
  { id: "scripture", label: "Scripture", sceneType: "scripture" as const },
  { id: "prayer", label: "Prayer Request", sceneType: "quote" as const },
  { id: "announcement", label: "Announcement", sceneType: "promo" as const },
  { id: "weather", label: "Weather", sceneType: "weather" as const },
  { id: "election", label: "Election", sceneType: "statistics" as const },
  { id: "finance", label: "Finance", sceneType: "statistics" as const },
  { id: "sports", label: "Sports", sceneType: "statistics" as const },
] as const;

export const MOTION_SCENE_DRAG_TYPE =
  "application/vnd.mediaos.motion-scene+json";

export const SCENE_THEME_MODES = [
  "light",
  "dark",
  "channel",
  "custom",
] as const;

export const STANDARD_VARIABLE_KEYS = SCENE_VARIABLE_TOKENS.map(
  (token) => token.key,
);

export const SYSTEM_ANIMATION_PRESETS: Array<{
  name: string;
  kind: AnimationKind;
  duration_ms: number;
  config: Record<string, unknown>;
}> = [
  { name: "Fade In", kind: "fade", duration_ms: 400, config: { from: 0, to: 1 } },
  { name: "Fade Out", kind: "fade", duration_ms: 350, config: { from: 1, to: 0 } },
  { name: "Slide Left", kind: "slide", duration_ms: 500, config: { direction: "left" } },
  { name: "Slide Right", kind: "slide", duration_ms: 500, config: { direction: "right" } },
  { name: "Slide Up", kind: "slide", duration_ms: 500, config: { direction: "up" } },
  { name: "Slide Down", kind: "slide", duration_ms: 500, config: { direction: "down" } },
  { name: "Zoom In", kind: "zoom", duration_ms: 450, config: { from: 0.85, to: 1 } },
  { name: "Scale Pop", kind: "scale", duration_ms: 380, config: { overshoot: 1.08 } },
  { name: "Push", kind: "push", duration_ms: 520, config: { direction: "left" } },
  { name: "Reveal", kind: "reveal", duration_ms: 600, config: { mask: "wipe" } },
  { name: "Mask Reveal", kind: "reveal", duration_ms: 700, config: { mask: "gradient" } },
  { name: "Blur In", kind: "blur", duration_ms: 400, config: { from: 12, to: 0 } },
  { name: "Blur Out", kind: "blur", duration_ms: 400, config: { from: 0, to: 12 } },
  { name: "Typewriter", kind: "typewriter", duration_ms: 1400, config: { chars_per_sec: 22 } },
  { name: "Bounce", kind: "bounce", duration_ms: 500, config: { amplitude: 0.15 } },
  { name: "Elastic", kind: "elastic", duration_ms: 650, config: { tension: 0.6 } },
  { name: "Rotate", kind: "rotate", duration_ms: 500, config: { from: -8, to: 0 } },
  { name: "Opacity Pulse", kind: "opacity", duration_ms: 800, config: { min: 0.6, max: 1 } },
];
