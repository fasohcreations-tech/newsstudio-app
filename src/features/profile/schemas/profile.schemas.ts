import { z } from "zod";

export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120, "Full name must be 120 characters or fewer"),
  preferred_locale: z
    .string()
    .min(2, "Locale is required")
    .max(16, "Locale is too long"),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .max(64, "Timezone is too long"),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
