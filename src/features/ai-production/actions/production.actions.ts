"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getStoryById } from "@/features/newsroom/services/story.service";
import {
  approveTask,
  cancelWorkflow,
  getLatestWorkflowForStory,
  regenerateTask,
  rejectTask,
  retryFailedTask,
  startProductionWorkflow,
  updateTaskOutput,
} from "@/features/ai-production/services/workflow-manager";
import type { AIWorkflowWithTasks } from "@/features/ai-production/types/production.types";

export type ProductionActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireOrg() {
  const user = await requireAuth();
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

function revalidateStory(storyId: string) {
  revalidatePath(`/newsroom/stories/${storyId}`);
  revalidatePath("/ai-center");
}

export async function getStoryProductionWorkflowAction(
  storyId: string,
): Promise<ProductionActionResult<AIWorkflowWithTasks | null>> {
  const { supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await getLatestWorkflowForStory(supabase, storyId);
  if (result.error) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function startStoryProductionWorkflowAction(
  storyId: string,
): Promise<ProductionActionResult<AIWorkflowWithTasks>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const storyResult = await getStoryById(supabase, storyId);
  if (storyResult.error || !storyResult.story) {
    return {
      success: false,
      error: storyResult.error ?? "Story not found.",
    };
  }

  const story = storyResult.story;
  const result = await startProductionWorkflow(supabase, {
    organizationId: membership.organization.id,
    storyId,
    userId: user.id,
    storyTitle: story.title,
    storySummary: story.summary,
    language: story.language,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Unable to start workflow." };
  }

  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function approveProductionTaskAction(
  taskId: string,
  storyId: string,
): Promise<ProductionActionResult<AIWorkflowWithTasks>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await approveTask(supabase, { taskId, userId: user.id });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Approve failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function rejectProductionTaskAction(
  taskId: string,
  storyId: string,
  reason?: string,
): Promise<ProductionActionResult<AIWorkflowWithTasks>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await rejectTask(supabase, {
    taskId,
    userId: user.id,
    reason,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Reject failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function regenerateProductionTaskAction(
  taskId: string,
  storyId: string,
): Promise<ProductionActionResult<AIWorkflowWithTasks>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await regenerateTask(supabase, { taskId, userId: user.id });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Regenerate failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function retryProductionTaskAction(
  taskId: string,
  storyId: string,
): Promise<ProductionActionResult<AIWorkflowWithTasks>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await retryFailedTask(supabase, { taskId, userId: user.id });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Retry failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function updateProductionTaskOutputAction(input: {
  taskId: string;
  storyId: string;
  content: string;
  title?: string;
}): Promise<ProductionActionResult<{ outputVersion: number }>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await updateTaskOutput(supabase, {
    taskId: input.taskId,
    userId: user.id,
    content: input.content,
    title: input.title,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Save failed." };
  }
  revalidateStory(input.storyId);
  return {
    success: true,
    data: { outputVersion: result.data.output_version },
  };
}

export async function cancelProductionWorkflowAction(
  workflowId: string,
  storyId: string,
): Promise<ProductionActionResult<AIWorkflowWithTasks>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await cancelWorkflow(supabase, {
    workflowId,
    userId: user.id,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Cancel failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}
