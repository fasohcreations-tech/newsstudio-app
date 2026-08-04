import { z } from "zod";

export const assembleTimelineSchema = z.object({
  storyId: z.string().uuid(),
  /** Soft-replace prior assembly clips (keeps manually inserted clips). */
  replaceAssemblyClips: z.boolean().optional().default(true),
});

export const updateClipSchema = z.object({
  clipId: z.string().uuid(),
  startMs: z.number().int().min(0).optional(),
  endMs: z.number().int().positive().optional(),
  trimInMs: z.number().int().min(0).optional(),
  trimOutMs: z.number().int().min(0).nullable().optional(),
  enabled: z.boolean().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  trackId: z.string().uuid().optional(),
});

export const splitClipSchema = z.object({
  clipId: z.string().uuid(),
  atMs: z.number().int().min(0),
});

export const setTransitionSchema = z.object({
  timelineId: z.string().uuid(),
  fromClipId: z.string().uuid(),
  toClipId: z.string().uuid(),
  transitionType: z.enum([
    "cut",
    "fade",
    "cross_dissolve",
    "slide",
    "push",
    "wipe",
    "broadcast_reveal",
  ]),
  durationMs: z.number().int().min(0).max(10_000).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export const syncDecisionSchema = z.object({
  clipId: z.string().uuid(),
  decision: z.enum(["apply", "ignore"]),
});

export type AssembleTimelineInput = z.infer<typeof assembleTimelineSchema>;
export type UpdateClipInput = z.infer<typeof updateClipSchema>;
export type SplitClipInput = z.infer<typeof splitClipSchema>;
export type SetTransitionInput = z.infer<typeof setTransitionSchema>;
export type SyncDecisionInput = z.infer<typeof syncDecisionSchema>;
