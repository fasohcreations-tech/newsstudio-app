import { z } from "zod";

export const scriptSaveSchema = z.object({
  storyId: z.string().uuid(),
  contentHtml: z.string(),
  contentPlain: z.string(),
  wordCount: z.number().int().min(0),
  characterCount: z.number().int().min(0),
});

export type ScriptSaveInput = z.infer<typeof scriptSaveSchema>;

export function countWords(plain: string): number {
  const trimmed = plain.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
