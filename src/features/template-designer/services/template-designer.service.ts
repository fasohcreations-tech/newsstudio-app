import type {
  BroadcastTemplate,
  BroadcastTemplateSummary,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "@/features/template-designer/types/template-designer.types";

export type TemplateDesignerService = {
  listTemplates(
    organizationId: string,
  ): Promise<{ data: BroadcastTemplateSummary[] | null; error: string | null }>;
  getTemplate(
    templateId: string,
  ): Promise<{ data: BroadcastTemplate | null; error: string | null }>;
  createTemplate(
    input: CreateTemplateInput,
  ): Promise<{ data: BroadcastTemplate | null; error: string | null }>;
  updateTemplate(
    templateId: string,
    userId: string,
    patch: UpdateTemplateInput,
  ): Promise<{ data: BroadcastTemplate | null; error: string | null }>;
  duplicateTemplate(
    templateId: string,
    userId: string,
  ): Promise<{ data: BroadcastTemplate | null; error: string | null }>;
  archiveTemplate(
    templateId: string,
    userId: string,
  ): Promise<{ data: BroadcastTemplate | null; error: string | null }>;
};
