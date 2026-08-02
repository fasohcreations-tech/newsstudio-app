"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getStoryById } from "@/features/newsroom/services/story.service";
import { getLatestWorkflowForStory } from "@/features/ai-production/services/workflow-manager";
import {
  getOrCreateConversation,
  loadConversationForStory,
  runSuggestedAction,
  sendChatMessage,
} from "@/features/ai-workspace/services/conversation.service";
import {
  approveOutput,
  listJobsForStory,
  listOutputsForStory,
  regenerateOutput,
  rejectOutput,
  updateOutputContent,
} from "@/features/ai-workspace/services/workspace-output.service";
import type { AIWorkspaceSuggestedAction } from "@/features/ai-workspace/constants/workspace.constants";
import type {
  AIConversationWithMessages,
  AIWorkspaceBundle,
  AIWorkspaceOutput,
  StoryAIContext,
} from "@/features/ai-workspace/types/workspace.types";
import type { AiJob } from "@/features/content/types/content.types";

export type WorkspaceActionResult<T> =
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
}

async function loadStoryContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storyId: string,
): Promise<{ context: StoryAIContext | null; organizationId: string | null; error: string | null }> {
  const { story, error } = await getStoryById(supabase, storyId);
  if (error || !story) {
    return { context: null, organizationId: null, error: error ?? "Story not found." };
  }
  return {
    context: {
      storyId: story.id,
      storyTitle: story.title,
      storySummary: story.summary,
      language: story.language?.toLowerCase().startsWith("ml")
        ? story.language
        : "ml",
    },
    organizationId: story.organization_id,
    error: null,
  };
}

export async function getStoryAIWorkspaceAction(
  storyId: string,
): Promise<WorkspaceActionResult<AIWorkspaceBundle>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const storyCtx = await loadStoryContext(supabase, storyId);
  if (!storyCtx.context || !storyCtx.organizationId) {
    return { success: false, error: storyCtx.error ?? "Story not found." };
  }

  const convo = await getOrCreateConversation(supabase, {
    organizationId: storyCtx.organizationId,
    storyId,
    userId: user.id,
    context: storyCtx.context,
  });
  if (convo.error) {
    return { success: false, error: convo.error };
  }

  const [outputs, jobs, workflow] = await Promise.all([
    listOutputsForStory(supabase, storyId),
    listJobsForStory(supabase, storyId),
    getLatestWorkflowForStory(supabase, storyId),
  ]);

  if (outputs.error) return { success: false, error: outputs.error };
  if (jobs.error) return { success: false, error: jobs.error };
  if (workflow.error) return { success: false, error: workflow.error };

  return {
    success: true,
    data: {
      conversation: convo.data,
      outputs: outputs.data ?? [],
      jobs: (jobs.data ?? []) as AiJob[],
      workflow: workflow.data,
    },
  };
}

export async function sendAIWorkspaceMessageAction(
  storyId: string,
  content: string,
): Promise<WorkspaceActionResult<AIConversationWithMessages>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const storyCtx = await loadStoryContext(supabase, storyId);
  if (!storyCtx.context || !storyCtx.organizationId) {
    return { success: false, error: storyCtx.error ?? "Story not found." };
  }

  const result = await sendChatMessage(supabase, {
    organizationId: storyCtx.organizationId,
    userId: user.id,
    context: storyCtx.context,
    content,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Send failed." };
  }

  revalidateStory(storyId);
  return { success: true, data: result.data.conversation };
}

export async function runAIWorkspaceSuggestedAction(
  storyId: string,
  action: AIWorkspaceSuggestedAction,
): Promise<
  WorkspaceActionResult<{
    conversation: AIConversationWithMessages;
    output: AIWorkspaceOutput;
  }>
> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const storyCtx = await loadStoryContext(supabase, storyId);
  if (!storyCtx.context || !storyCtx.organizationId) {
    return { success: false, error: storyCtx.error ?? "Story not found." };
  }

  const result = await runSuggestedAction(supabase, {
    organizationId: storyCtx.organizationId,
    userId: user.id,
    context: storyCtx.context,
    action,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Action failed." };
  }

  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function approveAIWorkspaceOutputAction(
  outputId: string,
  storyId: string,
): Promise<WorkspaceActionResult<AIWorkspaceOutput>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await approveOutput(supabase, {
    outputId,
    userId: user.id,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Approve failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function rejectAIWorkspaceOutputAction(
  outputId: string,
  storyId: string,
  reason?: string,
): Promise<WorkspaceActionResult<AIWorkspaceOutput>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await rejectOutput(supabase, {
    outputId,
    userId: user.id,
    reason,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Reject failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function updateAIWorkspaceOutputAction(args: {
  outputId: string;
  storyId: string;
  content: string;
  title?: string;
}): Promise<WorkspaceActionResult<AIWorkspaceOutput>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const result = await updateOutputContent(supabase, {
    outputId: args.outputId,
    userId: user.id,
    content: args.content,
    title: args.title,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Update failed." };
  }
  revalidateStory(args.storyId);
  return { success: true, data: result.data };
}

export async function regenerateAIWorkspaceOutputAction(
  outputId: string,
  storyId: string,
): Promise<WorkspaceActionResult<AIWorkspaceOutput>> {
  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const storyCtx = await loadStoryContext(supabase, storyId);
  if (!storyCtx.context) {
    return { success: false, error: storyCtx.error ?? "Story not found." };
  }

  const result = await regenerateOutput(supabase, {
    outputId,
    userId: user.id,
    context: storyCtx.context,
  });
  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Regenerate failed." };
  }
  revalidateStory(storyId);
  return { success: true, data: result.data };
}

export async function listAIWorkspacePromptHistoryAction(
  storyId: string,
): Promise<WorkspaceActionResult<AIConversationWithMessages["messages"]>> {
  const { membership, error, supabase } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const convo = await loadConversationForStory(supabase, storyId);
  if (convo.error) return { success: false, error: convo.error };

  const prompts = (convo.data?.messages ?? []).filter((m) => m.role === "user");
  return { success: true, data: prompts };
}
