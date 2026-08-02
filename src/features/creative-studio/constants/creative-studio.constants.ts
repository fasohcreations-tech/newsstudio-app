import type {
  CreativeClipKind,
  CreativePlaceholderKind,
  CreativeTrackKind,
} from "@/features/creative-studio/types/creative-studio.types";

export const CREATIVE_PROJECT_STATUSES = ["draft", "active", "archived"] as const;

export const CREATIVE_TRACK_KINDS = [
  "video",
  "audio",
  "graphics",
  "subtitle",
] as const;

export const CREATIVE_CLIP_KINDS = [
  "image",
  "video",
  "audio",
  "graphic",
  "subtitle",
  "marker",
] as const;

export const CREATIVE_PLACEHOLDER_KINDS = [
  "headline",
  "anchor",
  "image",
  "video",
  "voice",
  "music",
  "logo",
  "ticker",
  "outro",
] as const;

export const TRACK_KIND_LABELS: Record<CreativeTrackKind, string> = {
  video: "Video",
  audio: "Audio",
  graphics: "Graphics",
  subtitle: "Subtitle",
};

export const TRACK_KIND_COLORS: Record<CreativeTrackKind, string> = {
  video: "#3b82f6",
  audio: "#22c55e",
  graphics: "#a855f7",
  subtitle: "#f59e0b",
};

export const PLACEHOLDER_KIND_LABELS: Record<CreativePlaceholderKind, string> = {
  headline: "Headline",
  anchor: "Anchor",
  image: "Images",
  video: "Videos",
  voice: "Voice",
  music: "Music",
  logo: "Logo",
  ticker: "Ticker",
  outro: "Outro",
};

export const CLIP_KIND_LABELS: Record<CreativeClipKind, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  graphic: "Graphic",
  subtitle: "Subtitle",
  marker: "Marker",
};

export const DEFAULT_FRAME_RATE = 25;
export const DEFAULT_RESOLUTION = { width: 1920, height: 1080 };
export const DEFAULT_TIMELINE_DURATION_MS = 60_000;
export const DEFAULT_TRACK_HEIGHT = 56;
export const MIN_TIMELINE_HEIGHT = 160;
export const MAX_TIMELINE_HEIGHT = 480;
export const DEFAULT_TIMELINE_HEIGHT = 240;
export const PIXELS_PER_SECOND = 80;

export const STUDIO_LAYOUT_STORAGE_KEY = "mediaos.creative-studio.layout";

export const DEFAULT_STUDIO_TRACKS: Array<{
  kind: CreativeTrackKind;
  name: string;
}> = [
  { kind: "video", name: "Video 1" },
  { kind: "graphics", name: "Graphics" },
  { kind: "subtitle", name: "Subtitles" },
  { kind: "audio", name: "Audio 1" },
  { kind: "audio", name: "Music" },
];

export const MEDIA_BIN_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "audio", label: "Audio" },
  { id: "graphic", label: "Graphics" },
  { id: "document", label: "Documents" },
  { id: "story", label: "Story Assets" },
  { id: "favorites", label: "Favorites" },
] as const;
