import type {
  VideoExportFormat,
  VideoExportResolutionId,
} from "@/features/video-render-export/types/render.types";

export const VIDEO_EXPORT_FORMATS: Array<{
  id: VideoExportFormat;
  label: string;
  codec: string;
  ready: boolean;
  note?: string;
}> = [
  { id: "mp4", label: "MP4 (H.264)", codec: "h264", ready: true },
  { id: "webm", label: "WebM (VP9)", codec: "vp9", ready: true },
  {
    id: "mov",
    label: "MOV",
    codec: "h264",
    ready: true,
    note: "H.264 in QuickTime container",
  },
];

/** Reserved for future adapters — architecture only. */
export const FUTURE_EXPORT_CODECS = ["hevc", "prores"] as const;

export const VIDEO_EXPORT_RESOLUTIONS: Array<{
  id: VideoExportResolutionId;
  label: string;
  width: number;
  height: number;
  ready: boolean;
}> = [
  { id: "1920x1080", label: "1920×1080 (Full HD)", width: 1920, height: 1080, ready: true },
  { id: "1280x720", label: "1280×720 (HD)", width: 1280, height: 720, ready: true },
  {
    id: "3840x2160",
    label: "3840×2160 (4K)",
    width: 3840,
    height: 2160,
    ready: false,
  },
];

export const VIDEO_EXPORT_FRAME_RATES = [24, 25, 30, 50, 60] as const;

export const DEFAULT_EXPORT_SETTINGS = {
  format: "mp4" as VideoExportFormat,
  resolution: "1280x720" as VideoExportResolutionId,
  frameRate: 24,
  bitrateKbps: 4000,
  includeVoice: true,
  includeMusic: true,
  previewScope: "full" as "full" | "shortest",
};

export const RENDER_STORAGE_BUCKET = "organizations";

export const RENDER_AUDIO = {
  codec: "aac",
  channels: 2,
  sampleRate: 48_000,
} as const;
