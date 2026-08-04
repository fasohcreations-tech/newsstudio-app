import { z } from "zod";

export const assetClipCreateSchema = z
  .object({
    parentAssetId: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(5000).optional().nullable(),
    tags: z.array(z.string().trim().min(1).max(64)).max(30).default([]),
    inPointMs: z.number().int().min(0),
    outPointMs: z.number().int().min(1),
    frameRate: z.number().positive().max(120).optional(),
    thumbnailUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
    width: z.number().int().positive().optional().nullable(),
    height: z.number().int().positive().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.outPointMs <= data.inPointMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "OUT point must be after IN point.",
        path: ["outPointMs"],
      });
    }
  });

export const assetClipUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
    tags: z.array(z.string().trim().min(1).max(64)).max(30).optional(),
    inPointMs: z.number().int().min(0).optional(),
    outPointMs: z.number().int().min(1).optional(),
    frameRate: z.number().positive().max(120).optional(),
    thumbnailUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.inPointMs != null &&
      data.outPointMs != null &&
      data.outPointMs <= data.inPointMs
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "OUT point must be after IN point.",
        path: ["outPointMs"],
      });
    }
  });

export const youtubeImportSchema = z.object({
  url: z.string().trim().url(),
  name: z.string().trim().min(1).max(200).optional(),
});

export type AssetClipCreateInput = z.infer<typeof assetClipCreateSchema>;
export type AssetClipUpdateInput = z.infer<typeof assetClipUpdateSchema>;
export type YoutubeImportInput = z.infer<typeof youtubeImportSchema>;
