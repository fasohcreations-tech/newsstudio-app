import type { AIWorkflowTaskType } from "@/features/ai-production/constants/production.constants";
import { AI_WORKFLOW_TASK_LABELS } from "@/features/ai-production/constants/production.constants";
import type { MockTaskOutput } from "@/features/ai-production/types/production.types";

export type MockTaskContext = {
  storyTitle: string;
  storySummary?: string | null;
  language?: string;
};

/**
 * Mock AI task runner — verifies pipeline architecture without external APIs.
 */
export async function runMockProductionTask(
  taskType: AIWorkflowTaskType,
  context: MockTaskContext,
): Promise<MockTaskOutput> {
  // Simulate processing latency for UX (short)
  await sleep(350 + Math.floor(Math.random() * 250));

  const label = AI_WORKFLOW_TASK_LABELS[taskType];
  const title = context.storyTitle || "Untitled story";
  const summary = context.storySummary?.trim() || "No summary provided.";
  const language = context.language || "en";
  const generatedAt = new Date().toISOString();

  switch (taskType) {
    case "research":
      return {
        title: `${label}: ${title}`,
        body: [
          `Background notes for “${title}”.`,
          `• Context: ${summary}`,
          "• Sources: (mock) wire services, archive desk, public statements.",
          "• Open questions: confirm quotes, verify timestamps, check B-roll.",
        ].join("\n"),
        extras: { sources: ["mock-wire", "mock-archive"] },
        mock: true,
        generatedAt,
      };
    case "headline_suggestion":
      return {
        title: "Headline options",
        body: [
          `1. ${title}`,
          `2. Breaking: ${title}`,
          `3. What you need to know about ${title}`,
        ].join("\n"),
        mock: true,
        generatedAt,
      };
    case "summary":
      return {
        title: "Editorial summary",
        body: `Summary (mock): ${summary}`,
        mock: true,
        generatedAt,
      };
    case "script_generation":
      return {
        title: "Draft script",
        body: [
          `[COLD OPEN]`,
          `${title}.`,
          ``,
          `[BODY]`,
          summary,
          ``,
          `[CLOSE]`,
          `We'll keep following this story. Back to you.`,
        ].join("\n"),
        mock: true,
        generatedAt,
      };
    case "translation":
      return {
        title: `Translation draft (${language} → ml)`,
        body: `(Mock Malayalam placeholder)\n${title}\n\n${summary}`,
        locale: "ml",
        mock: true,
        generatedAt,
      };
    case "voice_over":
      return {
        title: "Voice-over script",
        body: [
          `VO (mock, ~30s):`,
          `${title}. ${summary}`,
          `[PAUSE]`,
          `Stay with MediaOS for updates.`,
        ].join("\n"),
        extras: { estimatedDurationSeconds: 30 },
        mock: true,
        generatedAt,
      };
    case "timeline_draft":
      return {
        title: "Timeline draft",
        body: [
          "00:00 Cold open / slate",
          "00:05 VO + hero clip",
          "00:20 Soundbite / B-roll",
          "00:35 Graphic lower-third",
          "00:45 Outro",
        ].join("\n"),
        extras: { clips: 4 },
        mock: true,
        generatedAt,
      };
    case "thumbnail_suggestion":
      return {
        title: "Thumbnail brief",
        body: `Thumbnail (mock): bold headline “${title.slice(0, 42)}”, high-contrast subject, newsroom brand safe-area.`,
        extras: { aspectRatio: "16:9" },
        mock: true,
        generatedAt,
      };
    case "poster_suggestion":
      return {
        title: "Poster brief",
        body: `Poster (mock): vertical 9:16 layout, headline, kicker, and brand lockup for “${title}”.`,
        extras: { aspectRatio: "9:16" },
        mock: true,
        generatedAt,
      };
    case "seo_metadata":
      return {
        title: "SEO metadata",
        body: [
          `Title: ${title}`,
          `Description: ${summary.slice(0, 155)}`,
          `Keywords: news, mediaos, mock`,
        ].join("\n"),
        extras: { slugHint: title.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
        mock: true,
        generatedAt,
      };
    case "social_media_package":
      return {
        title: "Social package",
        body: [
          `X: ${title}`,
          `Facebook: ${summary}`,
          `Instagram: ${title} — swipe for more.`,
          `#News #MediaOS #Mock`,
        ].join("\n"),
        mock: true,
        generatedAt,
      };
    default:
      return {
        title: label,
        body: `Mock output for ${taskType}.`,
        mock: true,
        generatedAt,
      };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
