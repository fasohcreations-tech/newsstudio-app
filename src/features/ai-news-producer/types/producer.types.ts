import type { Json } from "@/shared/types/database.types";
import type { ContentObject } from "@/features/content/types/content.types";
import type {
  NewsProducerApprovalStatus,
  NewsProducerKind,
  NewsProducerSection,
} from "@/features/ai-news-producer/constants/producer.constants";
import {
  parseSubHeadlineMedia,
  type SubHeadlineMediaRef,
} from "@/features/story-production/lib/sub-headlines";

export type NewsProducerAiMeta = {
  jobId: string | null;
  provider: string;
  model: string;
  promptId: string;
  promptVersion: string;
  locale: string;
  tokensUsed: number | null;
  executionTimeMs: number | null;
  finishReason: string | null;
};

export type NewsProducerMetadata = {
  module: "ai-news-producer";
  kind: NewsProducerKind;
  section: NewsProducerSection;
  body: string;
  bodyFormat: "markdown" | "plain";
  approvalStatus: NewsProducerApprovalStatus;
  ai: NewsProducerAiMeta;
  /** Per-slot media refs when kind is summary (sub-headlines). */
  subHeadlineMedia?: SubHeadlineMediaRef[];
};

export type NewsProducerOutput = ContentObject & {
  producer: NewsProducerMetadata;
};

export type NewsProducerBundle = {
  outputs: NewsProducerOutput[];
};

export type NewsProducerServiceResult<T> = {
  data: T | null;
  error: string | null;
};

export function parseProducerMetadata(
  raw: Json | null | undefined,
): NewsProducerMetadata | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const bag = raw as Record<string, unknown>;
  if (bag.module !== "ai-news-producer") return null;
  if (typeof bag.kind !== "string" || typeof bag.body !== "string") return null;
  if (typeof bag.section !== "string") return null;

  const aiRaw =
    bag.ai && typeof bag.ai === "object" && !Array.isArray(bag.ai)
      ? (bag.ai as Record<string, unknown>)
      : {};

  const approval =
    bag.approvalStatus === "approved" ||
    bag.approvalStatus === "rejected" ||
    bag.approvalStatus === "waiting_for_approval"
      ? bag.approvalStatus
      : "waiting_for_approval";

  return {
    module: "ai-news-producer",
    kind: bag.kind as NewsProducerKind,
    section: bag.section as NewsProducerSection,
    body: bag.body,
    bodyFormat: bag.bodyFormat === "plain" ? "plain" : "markdown",
    approvalStatus: approval,
    subHeadlineMedia:
      bag.kind === "summary"
        ? parseSubHeadlineMedia(bag.subHeadlineMedia)
        : undefined,
    ai: {
      jobId: typeof aiRaw.jobId === "string" ? aiRaw.jobId : null,
      provider: typeof aiRaw.provider === "string" ? aiRaw.provider : "unknown",
      model: typeof aiRaw.model === "string" ? aiRaw.model : "unknown",
      promptId: typeof aiRaw.promptId === "string" ? aiRaw.promptId : "",
      promptVersion:
        typeof aiRaw.promptVersion === "string" ? aiRaw.promptVersion : "",
      locale: typeof aiRaw.locale === "string" ? aiRaw.locale : "en",
      tokensUsed:
        typeof aiRaw.tokensUsed === "number" ? aiRaw.tokensUsed : null,
      executionTimeMs:
        typeof aiRaw.executionTimeMs === "number"
          ? aiRaw.executionTimeMs
          : null,
      finishReason:
        typeof aiRaw.finishReason === "string" ? aiRaw.finishReason : null,
    },
  };
}

export function toProducerOutput(
  row: ContentObject,
): NewsProducerOutput | null {
  const producer = parseProducerMetadata(row.metadata);
  if (!producer) return null;
  return { ...row, producer };
}
