import type {
  CreativePlaceholderKind,
  CreativeServiceResult,
  CreativeTemplate,
  CreativeTemplateWithPlaceholders,
} from "@/features/creative-studio/types/creative-studio.types";

export type CreateTemplateInput = {
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  aspectRatio?: string;
  durationMs?: number;
  placeholders?: Array<{
    kind: CreativePlaceholderKind;
    label: string;
    defaultValue?: string;
  }>;
};

/**
 * Reusable newsroom templates with structured placeholders.
 */
export interface TemplateService {
  list(organizationId: string): Promise<CreativeServiceResult<CreativeTemplate[]>>;

  get(
    templateId: string,
  ): Promise<CreativeServiceResult<CreativeTemplateWithPlaceholders>>;

  create(
    input: CreateTemplateInput,
  ): Promise<CreativeServiceResult<CreativeTemplateWithPlaceholders>>;

  seedDefaults(
    organizationId: string,
    userId: string,
  ): Promise<CreativeServiceResult<CreativeTemplate[]>>;
}
