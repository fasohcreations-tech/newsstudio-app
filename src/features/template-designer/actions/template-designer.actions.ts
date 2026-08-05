"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { createTemplateDesignerService } from "@/features/template-designer/services/template-designer.service.impl";
import type {
  CreateTemplateInput,
  TemplateCategory,
  TemplateAspectPreset,
  UpdateTemplateInput,
} from "@/features/template-designer/types/template-designer.types";
import { createClient } from "@/shared/lib/supabase/server";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function orgContext(redirectTo: string) {
  const user = await requireAuth(redirectTo);
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  if (!membership || error) {
    return {
      user: null as null,
      organizationId: null as null,
      error: error ?? "Organization context required",
    };
  }
  return {
    user,
    organizationId: membership.organization.id,
    error: null as null,
  };
}

export async function listTemplatesAction(): Promise<
  ActionResult<Awaited<ReturnType<ReturnType<typeof createTemplateDesignerService>["listTemplates"]>>["data"]>
> {
  const ctx = await orgContext("/templates");
  if (ctx.error || !ctx.organizationId) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }
  const service = createTemplateDesignerService();
  const result = await service.listTemplates(ctx.organizationId);
  if (result.error) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function createTemplateAction(input: {
  name: string;
  code?: string;
  description?: string;
  category?: TemplateCategory;
  aspectPreset?: TemplateAspectPreset;
  composerSceneId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await orgContext("/templates/new");
  if (ctx.error || !ctx.user || !ctx.organizationId) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }
  const payload: CreateTemplateInput = {
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    name: input.name,
    code: input.code,
    description: input.description,
    category: input.category,
    aspectPreset: input.aspectPreset,
    composerSceneId: input.composerSceneId,
  };
  const service = createTemplateDesignerService();
  const result = await service.createTemplate(payload);
  if (!result.data) return { success: false, error: result.error ?? "Create failed" };
  revalidatePath("/templates");
  return { success: true, data: { id: result.data.id } };
}

export async function updateTemplateAction(
  templateId: string,
  patch: UpdateTemplateInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await orgContext(`/templates/${templateId}`);
  if (ctx.error || !ctx.user) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }
  const service = createTemplateDesignerService();
  const result = await service.updateTemplate(templateId, ctx.user.id, patch);
  if (!result.data) return { success: false, error: result.error ?? "Update failed" };
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  return { success: true, data: { id: result.data.id } };
}

export async function duplicateTemplateAction(
  templateId: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await orgContext("/templates");
  if (ctx.error || !ctx.user) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }
  const service = createTemplateDesignerService();
  const result = await service.duplicateTemplate(templateId, ctx.user.id);
  if (!result.data) return { success: false, error: result.error ?? "Duplicate failed" };
  revalidatePath("/templates");
  return { success: true, data: { id: result.data.id } };
}
