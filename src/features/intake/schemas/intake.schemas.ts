import { z } from "zod";

import { INTAKE_SOURCE_CODES } from "@/features/intake/constants/intake.constants";

export const enqueueSourceSchema = z
  .object({
    sourceTypeCode: z.enum(INTAKE_SOURCE_CODES),
    originalUrl: z
      .string()
      .trim()
      .url("Enter a valid URL")
      .optional()
      .or(z.literal("")),
    title: z
      .string()
      .trim()
      .max(300, "Title must be 300 characters or fewer")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const needsUrl = ![
      "manual_story",
      "pdf",
      "docx",
      "txt",
      "image_upload",
      "audio_upload",
    ].includes(value.sourceTypeCode);

    if (needsUrl && !value.originalUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["originalUrl"],
        message: "A source URL is required for this intake type.",
      });
    }

    if (value.sourceTypeCode === "manual_story" && !value.title) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Title is required for a manual story intake.",
      });
    }
  });

export type EnqueueSourceFormInput = z.infer<typeof enqueueSourceSchema>;

export const createStoryFromSourceSchema = z.object({
  sourceItemId: z.string().uuid(),
});
