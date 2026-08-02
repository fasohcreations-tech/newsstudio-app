import type { Json, Tables, TablesInsert, TablesUpdate } from "@/shared/types/database.types";
import type {
  AiJobStatus,
  ContentObjectStatus,
  ContentObjectType,
  OutputPackageStatus,
  OutputPlatform,
  PublishJobStatus,
  RenderJobStatus,
} from "@/features/content/constants/content-enums";

export type ContentObject = Tables<"content_objects">;
export type ContentObjectInsert = TablesInsert<"content_objects">;
export type ContentObjectUpdate = TablesUpdate<"content_objects">;

export type OutputPackage = Tables<"output_packages">;
export type OutputPackageInsert = TablesInsert<"output_packages">;
export type OutputPackageUpdate = TablesUpdate<"output_packages">;

export type AiJob = Tables<"ai_jobs">;
export type AiJobInsert = TablesInsert<"ai_jobs">;
export type AiJobUpdate = TablesUpdate<"ai_jobs">;

export type RenderJob = Tables<"render_jobs">;
export type RenderJobInsert = TablesInsert<"render_jobs">;
export type RenderJobUpdate = TablesUpdate<"render_jobs">;

export type PublishJob = Tables<"publish_jobs">;
export type PublishJobInsert = TablesInsert<"publish_jobs">;
export type PublishJobUpdate = TablesUpdate<"publish_jobs">;

/** Service result envelope used by content architecture services. */
export type ContentServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type StoryScopedQuery = {
  organizationId: string;
  storyId: string;
};

export type SoftDeletable = {
  deleted_at: string | null;
};

export type VersionedEntity = {
  version: number;
};

export type JsonMetadata = {
  metadata: Json;
};

export type ContentObjectFilters = Partial<{
  type: ContentObjectType;
  status: ContentObjectStatus;
  language: string;
  includeDeleted: boolean;
}>;

export type OutputPackageFilters = Partial<{
  platform: OutputPlatform;
  status: OutputPackageStatus;
  contentObjectId: string;
  includeDeleted: boolean;
}>;

export type AiJobFilters = Partial<{
  status: AiJobStatus;
  jobType: string;
  contentObjectId: string;
  provider: string;
}>;

export type RenderJobFilters = Partial<{
  status: RenderJobStatus;
  contentObjectId: string;
  renderer: string;
}>;

export type PublishJobFilters = Partial<{
  status: PublishJobStatus;
  destination: OutputPlatform;
  outputPackageId: string;
}>;

/** Future: Story graph aggregation for workspace dashboards. */
export type StoryContentGraph = {
  storyId: string;
  contentObjects: ContentObject[];
  outputPackages: OutputPackage[];
  aiJobs: AiJob[];
  renderJobs: RenderJob[];
  publishJobs: PublishJob[];
};
