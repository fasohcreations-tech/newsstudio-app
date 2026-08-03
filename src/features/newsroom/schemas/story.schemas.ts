import { z } from "zod";

import {
  DEFAULT_STORY_LANGUAGE,
  STORY_PRIORITIES,
  STORY_STATUSES,
} from "@/features/newsroom/constants/story.constants";
import { emptySubHeadlineMediaSlots } from "@/features/story-production/lib/sub-headlines";

const subHeadlineMediaItemSchema = z.object({
  kind: z.union([
    z.literal(""),
    z.literal("image"),
    z.literal("video"),
    z.literal("caption"),
  ]),
  ref: z.string(),
  caption: z.string(),
});

export const storyFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  subtitle: z
    .string()
    .trim()
    .max(300, "Subtitle must be 300 characters or fewer")
    .optional()
    .or(z.literal("")),
  summary: z
    .string()
    .trim()
    .max(4000, "Summary must be 4000 characters or fewer")
    .optional()
    .or(z.literal("")),
  sub_headline_media: z.array(subHeadlineMediaItemSchema).max(4).optional(),
  status: z.enum(STORY_STATUSES, { message: "Status is required" }),
  priority: z.enum(STORY_PRIORITIES),
  category: z
    .string()
    .trim()
    .max(80, "Category must be 80 characters or fewer")
    .optional()
    .or(z.literal("")),
  language: z
    .string()
    .trim()
    .min(2, "Language is required")
    .max(16, "Language is too long"),
  organization_id: z.string().uuid("Organization is required"),
});

export const storyCreateSchema = storyFormSchema;
export const storyUpdateSchema = storyFormSchema.omit({ organization_id: true });

export type StoryFormInput = z.infer<typeof storyFormSchema>;
export type StoryCreateInput = z.infer<typeof storyCreateSchema>;
export type StoryUpdateInput = z.infer<typeof storyUpdateSchema>;

export const storyFormDefaults = {
  title: "",
  subtitle: "",
  summary: "",
  sub_headline_media: emptySubHeadlineMediaSlots(),
  status: "draft" as const,
  priority: "normal" as const,
  category: "",
  language: DEFAULT_STORY_LANGUAGE,
  organization_id: "",
};
