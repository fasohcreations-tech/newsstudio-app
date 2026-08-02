import { z } from "zod";

import { MEDIA_FILE_TYPES } from "@/features/media/constants/media.constants";

export const mediaRenameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or fewer"),
});

export const mediaMoveSchema = z.object({
  folderId: z.string().uuid().nullable(),
});

export const mediaFolderCreateSchema = z.object({
  organizationId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Folder name is required")
    .max(120, "Folder name must be 120 characters or fewer"),
});

export const mediaFilterSchema = z.object({
  fileType: z.enum(["all", ...MEDIA_FILE_TYPES]).default("all"),
  storyId: z.string().uuid().nullable().optional(),
  search: z.string().optional(),
});

export const storyMediaAttachSchema = z.object({
  organizationId: z.string().uuid(),
  storyId: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  label: z.string().trim().max(120).optional().or(z.literal("")),
});

export type MediaRenameInput = z.infer<typeof mediaRenameSchema>;
export type MediaMoveInput = z.infer<typeof mediaMoveSchema>;
export type MediaFolderCreateInput = z.infer<typeof mediaFolderCreateSchema>;
export type StoryMediaAttachInput = z.infer<typeof storyMediaAttachSchema>;
