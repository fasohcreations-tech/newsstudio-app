"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { createProjectService } from "@/features/creative-studio/services/project.service.impl";
import { createTimelineService } from "@/features/creative-studio/services/timeline.service.impl";
import { createTemplateService } from "@/features/creative-studio/services/template.service.impl";
import type { CreativeProject } from "@/features/creative-studio/types/creative-studio.types";

export type StudioActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  storyId: z.string().uuid().optional().nullable(),
});

const updateClipSchema = z.object({
  clipId: z.string().uuid(),
  patch: z.object({
    name: z.string().optional(),
    start_ms: z.number().int().min(0).optional(),
    end_ms: z.number().int().min(0).optional(),
    position_x: z.number().optional(),
    position_y: z.number().optional(),
    scale: z.number().positive().optional(),
    rotation: z.number().optional(),
    opacity: z.number().min(0).max(1).optional(),
    volume: z.number().min(0).max(1).optional(),
    speed: z.number().positive().optional(),
  }),
});

async function requireStudioContext() {
  const user = await requireAuth("/creative-studio");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  return { user, supabase, membership, error };
}

function revalidateStudio(projectId?: string) {
  revalidatePath("/creative-studio");
  if (projectId) revalidatePath(`/creative-studio/projects/${projectId}`);
}

export async function listCreativeProjectsAction(): Promise<
  StudioActionResult<CreativeProject[]>
> {
  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createProjectService(supabase);
  const result = await service.list(membership.organization.id);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function getCreativeProjectAction(
  projectId: string,
): Promise<StudioActionResult<Awaited<ReturnType<ReturnType<typeof createProjectService>["getWithTimeline"]>>["data"]>> {
  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createProjectService(supabase);
  const result = await service.getWithTimeline(projectId);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function createCreativeProjectAction(
  raw: z.infer<typeof createProjectSchema>,
): Promise<StudioActionResult<CreativeProject>> {
  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { user, supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createProjectService(supabase);
  const result = await service.create({
    organizationId: membership.organization.id,
    userId: user.id,
    ...parsed.data,
  });

  if (!result.data) return { success: false, error: result.error };
  revalidateStudio(result.data.id);
  return { success: true, data: result.data };
}

export async function duplicateCreativeProjectAction(
  projectId: string,
  title?: string,
): Promise<StudioActionResult<CreativeProject>> {
  const { user, supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createProjectService(supabase);
  const result = await service.duplicate(projectId, user.id, title);
  if (!result.data) return { success: false, error: result.error };
  revalidateStudio(result.data.id);
  return { success: true, data: result.data };
}

export async function archiveCreativeProjectAction(
  projectId: string,
): Promise<StudioActionResult<CreativeProject>> {
  const { user, supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createProjectService(supabase);
  const result = await service.archive(projectId, user.id);
  if (!result.data) return { success: false, error: result.error };
  revalidateStudio(projectId);
  return { success: true, data: result.data };
}

export async function deleteCreativeProjectAction(
  projectId: string,
): Promise<StudioActionResult<CreativeProject>> {
  const { user, supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createProjectService(supabase);
  const result = await service.softDelete(projectId, user.id);
  if (!result.data) return { success: false, error: result.error };
  revalidateStudio(projectId);
  return { success: true, data: result.data };
}

export async function updateTimelineClipAction(
  raw: z.infer<typeof updateClipSchema>,
): Promise<StudioActionResult<unknown>> {
  const parsed = updateClipSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createTimelineService(supabase);
  const result = await service.updateClip(parsed.data.clipId, parsed.data.patch);
  if (!result.data) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function seedCreativeTemplatesAction(): Promise<
  StudioActionResult<unknown[]>
> {
  const { user, supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const service = createTemplateService(supabase);
  const result = await service.seedDefaults(
    membership.organization.id,
    user.id,
  );
  if (!result.data) return { success: false, error: result.error };
  revalidatePath("/creative-studio");
  return { success: true, data: result.data };
}

export async function listCreativeTemplatesAction() {
  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false as const, error: error ?? "Organization required" };
  }

  const service = createTemplateService(supabase);
  const result = await service.list(membership.organization.id);
  if (!result.data) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}
