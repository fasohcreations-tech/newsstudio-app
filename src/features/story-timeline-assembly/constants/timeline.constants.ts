import type {
  StoryTimelineTrackKind,
  StoryTimelineTransitionType,
} from "@/features/story-timeline-assembly/types/timeline.types";

export const DEFAULT_TIMELINE_TRACKS: Array<{
  kind: StoryTimelineTrackKind;
  name: string;
  sortOrder: number;
  height: number;
  color: string;
}> = [
  { kind: "scene", name: "Scene Layer", sortOrder: 0, height: 64, color: "#38bdf8" },
  { kind: "voice", name: "Voice", sortOrder: 1, height: 48, color: "#a78bfa" },
  { kind: "music", name: "Background Music", sortOrder: 2, height: 40, color: "#34d399" },
  { kind: "graphics", name: "Graphics Overlay", sortOrder: 3, height: 40, color: "#fbbf24" },
  { kind: "ticker", name: "Ticker", sortOrder: 4, height: 36, color: "#fb7185" },
  {
    kind: "advertisement",
    name: "Advertisement",
    sortOrder: 5,
    height: 36,
    color: "#94a3b8",
  },
];

export const TIMELINE_TRANSITION_TYPES: Array<{
  id: StoryTimelineTransitionType;
  label: string;
  defaultDurationMs: number;
}> = [
  { id: "cut", label: "Cut", defaultDurationMs: 0 },
  { id: "fade", label: "Fade", defaultDurationMs: 500 },
  { id: "cross_dissolve", label: "Cross Dissolve", defaultDurationMs: 700 },
  { id: "slide", label: "Slide", defaultDurationMs: 600 },
  { id: "push", label: "Push", defaultDurationMs: 600 },
  { id: "wipe", label: "Wipe", defaultDurationMs: 700 },
  { id: "broadcast_reveal", label: "Broadcast Reveal", defaultDurationMs: 900 },
];

export const DEFAULT_FRAME_RATE = 30;
export const DEFAULT_RESOLUTION = { width: 1920, height: 1080 } as const;
export const DEFAULT_ASPECT_RATIO = "16:9";

/** Metadata flag marking clips created by Timeline Assembly (safe to replace on reassemble). */
export const ASSEMBLY_CLIP_ORIGIN = "timeline_assembly";
