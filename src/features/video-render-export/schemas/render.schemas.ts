import { z } from "zod";

import {
  VIDEO_EXPORT_FRAME_RATES,
} from "@/features/video-render-export/constants/render.constants";

export const exportSettingsSchema = z.object({
  format: z.enum(["mp4", "mov", "webm"]),
  resolution: z.enum(["1920x1080", "1280x720", "3840x2160"]),
  frameRate: z
    .number()
    .refine((n) => (VIDEO_EXPORT_FRAME_RATES as readonly number[]).includes(n), {
      message: "Unsupported frame rate",
    }),
  bitrateKbps: z.number().int().min(500).max(100_000),
  includeVoice: z.boolean(),
  includeMusic: z.boolean(),
  previewScope: z.enum(["full", "shortest"]).optional(),
});

export const createVideoRenderSchema = z.object({
  storyId: z.string().uuid(),
  settings: exportSettingsSchema,
});

export const updateRenderProgressSchema = z.object({
  renderId: z.string().uuid(),
  status: z
    .enum([
      "queued",
      "preparing",
      "rendering",
      "encoding",
      "uploading",
      "succeeded",
      "failed",
      "cancelled",
    ])
    .optional(),
  progress: z.number().min(0).max(100).optional(),
  elapsedMs: z.number().int().min(0).optional(),
  etaMs: z.number().int().min(0).nullable().optional(),
  error: z.string().nullable().optional(),
  outputBucket: z.string().optional(),
  outputPath: z.string().optional(),
  outputUrl: z.string().optional(),
  thumbnailPath: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  durationMs: z.number().int().min(0).optional(),
  fileSizeBytes: z.number().int().min(0).optional(),
  videoCodec: z.string().optional(),
  finished: z.boolean().optional(),
});

export const renderIdSchema = z.object({
  renderId: z.string().uuid(),
});
