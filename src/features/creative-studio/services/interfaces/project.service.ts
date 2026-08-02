import type {
  CreativeProject,
  CreativeProjectInsert,
  CreativeProjectListFilters,
  CreativeProjectUpdate,
  CreativeProjectWithTimeline,
  CreativeServiceResult,
} from "@/features/creative-studio/types/creative-studio.types";

export type CreateProjectInput = {
  organizationId: string;
  userId: string;
  title: string;
  description?: string;
  storyId?: string | null;
  frameRate?: number;
  resolutionWidth?: number;
  resolutionHeight?: number;
};

/**
 * Project lifecycle — create, open, duplicate, archive, delete (soft).
 * Story-linked projects bind to Newsroom stories.
 */
export interface ProjectService {
  list(
    organizationId: string,
    filters?: CreativeProjectListFilters,
  ): Promise<CreativeServiceResult<CreativeProject[]>>;

  get(projectId: string): Promise<CreativeServiceResult<CreativeProject>>;

  getWithTimeline(
    projectId: string,
  ): Promise<CreativeServiceResult<CreativeProjectWithTimeline>>;

  create(input: CreateProjectInput): Promise<CreativeServiceResult<CreativeProject>>;

  update(
    projectId: string,
    patch: CreativeProjectUpdate,
    userId: string,
  ): Promise<CreativeServiceResult<CreativeProject>>;

  duplicate(
    projectId: string,
    userId: string,
    title?: string,
  ): Promise<CreativeServiceResult<CreativeProject>>;

  archive(
    projectId: string,
    userId: string,
  ): Promise<CreativeServiceResult<CreativeProject>>;

  softDelete(
    projectId: string,
    userId: string,
  ): Promise<CreativeServiceResult<CreativeProject>>;
}

export type { CreativeProjectInsert };
