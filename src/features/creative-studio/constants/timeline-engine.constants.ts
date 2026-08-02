import type {
  ClipColorLabel,
  EnterpriseTrackKind,
} from "@/features/creative-studio/types/timeline-engine.types";

export const ENTERPRISE_TRACK_KINDS = [
  "video",
  "image",
  "graphics",
  "title",
  "subtitle",
  "voice",
  "music",
  "sfx",
  "marker",
  "ai_suggestion",
] as const;

export const ENTERPRISE_TRACK_LABELS: Record<EnterpriseTrackKind, string> = {
  video: "Video",
  image: "Images",
  graphics: "Graphics",
  title: "Titles",
  subtitle: "Subtitles",
  voice: "Voice",
  music: "Music",
  sfx: "Sound FX",
  marker: "Markers",
  ai_suggestion: "AI Suggestions",
  audio: "Audio",
};

export const ENTERPRISE_TRACK_COLORS: Record<EnterpriseTrackKind, string> = {
  video: "#3b82f6",
  image: "#6366f1",
  graphics: "#a855f7",
  title: "#ec4899",
  subtitle: "#f59e0b",
  voice: "#22c55e",
  music: "#14b8a6",
  sfx: "#84cc16",
  marker: "#f97316",
  ai_suggestion: "#8b5cf6",
  audio: "#22c55e",
};

/** Default newsroom track stack seeded on new projects (Module 3.1). */
export const DEFAULT_ENTERPRISE_TRACKS: Array<{
  kind: EnterpriseTrackKind;
  name: string;
}> = [
  { kind: "video", name: "Video 1" },
  { kind: "image", name: "Images" },
  { kind: "graphics", name: "Graphics" },
  { kind: "title", name: "Titles" },
  { kind: "subtitle", name: "Subtitles" },
  { kind: "voice", name: "Voice" },
  { kind: "music", name: "Music" },
  { kind: "sfx", name: "Sound FX" },
  { kind: "marker", name: "Markers" },
  { kind: "ai_suggestion", name: "AI Suggestions" },
];

export const CLIP_COLOR_LABELS: Record<ClipColorLabel, string> = {
  default: "Default",
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  pink: "Pink",
};

export const CLIP_COLOR_HEX: Record<ClipColorLabel, string> = {
  default: "",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
};

export const TRACK_HEADER_WIDTH = 168;
export const MIN_TRACK_HEIGHT = 32;
export const MAX_TRACK_HEIGHT = 160;
export const DEFAULT_TRACK_HEIGHT = 48;
export const COLLAPSED_TRACK_HEIGHT = 28;

export const RIPPLE_MODES = [
  { id: "off", label: "Off" },
  { id: "standard", label: "Standard" },
  { id: "trim", label: "Trim" },
  { id: "roll", label: "Roll" },
] as const;
