import type { SupabaseClient } from "@supabase/supabase-js";

import { CREATIVE_PLACEHOLDER_KINDS } from "@/features/creative-studio/constants/creative-studio.constants";
import type {
  CreateTemplateInput,
  TemplateService,
} from "@/features/creative-studio/services/interfaces/template.service";
import type {
  CreativeServiceResult,
  CreativeTemplate,
  CreativeTemplateWithPlaceholders,
} from "@/features/creative-studio/types/creative-studio.types";

type Client = SupabaseClient;

const CREATIVE_TEMPLATE_SELECT =
  "id, organization_id, name, description, category, thumbnail_url, aspect_ratio, duration_ms, metadata, created_by, updated_by, created_at, updated_at, deleted_at";

const CREATIVE_TEMPLATE_PLACEHOLDER_SELECT =
  "id, organization_id, template_id, kind, label, sort_order, default_value, constraints, created_at, updated_at";

function ok<T>(data: T): CreativeServiceResult<T> {
  return { data, error: null };
}

function fail<T>(error: string): CreativeServiceResult<T> {
  return { data: null, error };
}

const DEFAULT_TEMPLATES: Array<{
  name: string;
  description: string;
  category: string;
  aspectRatio: string;
}> = [
  {
    name: "Breaking News Lower Third",
    description: "Headline + ticker for live breaking coverage.",
    category: "broadcast",
    aspectRatio: "16:9",
  },
  {
    name: "YouTube News Package",
    description: "Intro, anchor, B-roll, and outro placeholders.",
    category: "youtube",
    aspectRatio: "16:9",
  },
  {
    name: "Social Vertical Reel",
    description: "9:16 short-form news template.",
    category: "social",
    aspectRatio: "9:16",
  },
];

export class SupabaseTemplateService implements TemplateService {
  constructor(private client: Client) {}

  async list(
    organizationId: string,
  ): Promise<CreativeServiceResult<CreativeTemplate[]>> {
    const { data, error } = await this.client
      .from("creative_studio_templates")
      .select(CREATIVE_TEMPLATE_SELECT)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) return fail(error.message);
    return ok((data ?? []) as CreativeTemplate[]);
  }

  async get(
    templateId: string,
  ): Promise<CreativeServiceResult<CreativeTemplateWithPlaceholders>> {
    const { data: template, error } = await this.client
      .from("creative_studio_templates")
      .select(CREATIVE_TEMPLATE_SELECT)
      .eq("id", templateId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return fail(error.message);
    if (!template) return fail("Template not found.");

    const { data: placeholders, error: phError } = await this.client
      .from("creative_studio_template_placeholders")
      .select(CREATIVE_TEMPLATE_PLACEHOLDER_SELECT)
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });

    if (phError) return fail(phError.message);

    return ok({
      ...(template as CreativeTemplate),
      placeholders: placeholders ?? [],
    });
  }

  async create(
    input: CreateTemplateInput,
  ): Promise<CreativeServiceResult<CreativeTemplateWithPlaceholders>> {
    const { data: template, error } = await this.client
      .from("creative_studio_templates")
      .insert({
        organization_id: input.organizationId,
        name: input.name.trim(),
        description: input.description?.trim() ?? "",
        category: input.category ?? "general",
        aspect_ratio: input.aspectRatio ?? "16:9",
        duration_ms: input.durationMs ?? 30_000,
        created_by: input.userId,
        updated_by: input.userId,
      })
      .select(CREATIVE_TEMPLATE_SELECT)
      .single();

    if (error || !template) return fail(error?.message ?? "Create failed");

    const placeholders = input.placeholders ?? [];
    if (placeholders.length > 0) {
      await this.client.from("creative_studio_template_placeholders").insert(
        placeholders.map((p, i) => ({
          organization_id: input.organizationId,
          template_id: template.id,
          kind: p.kind,
          label: p.label,
          sort_order: i,
          default_value: p.defaultValue ?? "",
        })),
      );
    }

    return this.get(template.id);
  }

  async seedDefaults(
    organizationId: string,
    userId: string,
  ): Promise<CreativeServiceResult<CreativeTemplate[]>> {
    const existing = await this.list(organizationId);
    if (existing.data && existing.data.length > 0) {
      return existing;
    }

    const created: CreativeTemplate[] = [];
    for (const def of DEFAULT_TEMPLATES) {
      const result = await this.create({
        organizationId,
        userId,
        name: def.name,
        description: def.description,
        category: def.category,
        aspectRatio: def.aspectRatio,
        placeholders: CREATIVE_PLACEHOLDER_KINDS.map((kind, i) => ({
          kind,
          label: kind.charAt(0).toUpperCase() + kind.slice(1),
        })),
      });
      if (result.data) created.push(result.data);
    }

    return ok(created);
  }
}

export function createTemplateService(client: Client): TemplateService {
  return new SupabaseTemplateService(client);
}
