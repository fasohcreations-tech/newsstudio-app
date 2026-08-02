import type { Tables, TablesInsert, TablesUpdate } from "@/shared/types/database.types";
import type {
  IntakeExtractionStatus,
  IntakeSourceCategory,
  IntakeSourceCode,
} from "@/features/intake/constants/intake.constants";

export type SourceType = Tables<"source_types">;
export type SourceItem = Tables<"source_items">;
export type StorySource = Tables<"story_sources">;

export type SourceItemInsert = TablesInsert<"source_items">;
export type SourceItemUpdate = TablesUpdate<"source_items">;
export type StorySourceInsert = TablesInsert<"story_sources">;

export type SourceItemWithType = SourceItem & {
  source_type: Pick<SourceType, "id" | "code" | "name" | "category">;
  reporter: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
};

export type IntakeQueueFilters = {
  organizationId: string;
  sourceTypeCode?: IntakeSourceCode | "all";
  status?: IntakeExtractionStatus | "all";
  search?: string;
  limit?: number;
};

export type IntakeServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/** Workflow stages for documentation / future workers. */
export const INTAKE_WORKFLOW_STAGES = [
  "source",
  "validation",
  "content_extraction",
  "metadata_extraction",
  "create_story",
  "attach_assets",
  "store_original_source",
] as const;

export type IntakeWorkflowStage = (typeof INTAKE_WORKFLOW_STAGES)[number];

export type ExtractedContent = {
  title?: string;
  body?: string;
  language?: string;
  author?: string;
  publishedAt?: string;
  rawText?: string;
};

export type ExtractedMetadata = {
  sourceUrl?: string;
  canonicalUrl?: string;
  siteName?: string;
  contentType?: string;
  wordCount?: number;
  durationSeconds?: number;
  extra?: Record<string, unknown>;
};

export type SourceTypeSummary = {
  id: string;
  code: IntakeSourceCode | string;
  name: string;
  category: IntakeSourceCategory;
  description: string | null;
};
