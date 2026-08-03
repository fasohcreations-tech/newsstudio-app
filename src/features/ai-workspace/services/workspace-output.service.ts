import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/shared/types/database.types";
import type { AIWorkspaceSuggestedAction } from "@/features/ai-workspace/constants/workspace.constants";
import { runMockWorkspaceAction } from "@/features/ai-workspace/services/mock-assistant";
import * as AIJobManager from "@/features/ai/services/ai-job-manager";
import { AI_JOB_SELECT } from "@/features/content/services/ai-job.service";
import type {
  AIWorkspaceOutput,
  AIWorkspaceServiceResult,
  StoryAIContext,
} from "@/features/ai-workspace/types/workspace.types";

type Client = SupabaseClient<Database>;

const AI_WORKSPACE_OUTPUT_SELECT =
  "id, organization_id, story_id, conversation_id, message_id, action_type, status, title, content, content_version, ai_job_id, structured, error, approved_at, approved_by, rejected_at, rejected_by, rejection_reason, created_by, updated_by, created_at, updated_at, deleted_at";

export async function listOutputsForStory(
  client: Client,
  storyId: string,
): Promise<AIWorkspaceServiceResult<AIWorkspaceOutput[]>> {
  const { data, error } = await client
    .from("ai_workspace_outputs")
    .select(AI_WORKSPACE_OUTPUT_SELECT)
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function approveOutput(
  client: Client,
  args: { outputId: string; userId: string },
): Promise<AIWorkspaceServiceResult<AIWorkspaceOutput>> {
  const { data, error } = await client
    .from("ai_workspace_outputs")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: args.userId,
      updated_by: args.userId,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
    })
    .eq("id", args.outputId)
    .eq("status", "waiting_for_approval")
    .select(AI_WORKSPACE_OUTPUT_SELECT)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Only outputs waiting for approval can be approved.",
    };
  }
  return { data, error: null };
}

export async function rejectOutput(
  client: Client,
  args: { outputId: string; userId: string; reason?: string },
): Promise<AIWorkspaceServiceResult<AIWorkspaceOutput>> {
  const { data, error } = await client
    .from("ai_workspace_outputs")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejected_by: args.userId,
      rejection_reason: args.reason ?? "Rejected by editor",
      updated_by: args.userId,
    })
    .eq("id", args.outputId)
    .eq("status", "waiting_for_approval")
    .select(AI_WORKSPACE_OUTPUT_SELECT)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Only outputs waiting for approval can be rejected.",
    };
  }
  return { data, error: null };
}

export async function updateOutputContent(
  client: Client,
  args: {
    outputId: string;
    userId: string;
    content: string;
    title?: string;
  },
): Promise<AIWorkspaceServiceResult<AIWorkspaceOutput>> {
  const { data: current, error: loadError } = await client
    .from("ai_workspace_outputs")
    .select(AI_WORKSPACE_OUTPUT_SELECT)
    .eq("id", args.outputId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError || !current) {
    return { data: null, error: loadError?.message ?? "Output not found." };
  }

  const { data, error } = await client
    .from("ai_workspace_outputs")
    .update({
      content: args.content,
      title: args.title ?? current.title,
      content_version: (current.content_version ?? 1) + 1,
      updated_by: args.userId,
    })
    .eq("id", args.outputId)
    .select(AI_WORKSPACE_OUTPUT_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Failed to update output." };
  }
  return { data, error: null };
}

export async function regenerateOutput(
  client: Client,
  args: {
    outputId: string;
    userId: string;
    context: StoryAIContext;
  },
): Promise<AIWorkspaceServiceResult<AIWorkspaceOutput>> {
  const { data: current, error: loadError } = await client
    .from("ai_workspace_outputs")
    .select(AI_WORKSPACE_OUTPUT_SELECT)
    .eq("id", args.outputId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError || !current) {
    return { data: null, error: loadError?.message ?? "Output not found." };
  }

  const action = current.action_type;
  if (action === "chat") {
    return { data: null, error: "This output cannot be regenerated." };
  }

  const regenerable = [
    "waiting_for_approval",
    "approved",
    "rejected",
  ].includes(current.status);

  if (!regenerable) {
    return { data: null, error: "This output cannot be regenerated right now." };
  }

  await client
    .from("ai_workspace_outputs")
    .update({
      status: "generating",
      updated_by: args.userId,
      error: null,
    })
    .eq("id", args.outputId);

  const job = await AIJobManager.enqueueJob(client, {
    organizationId: current.organization_id,
    userId: args.userId,
    storyId: current.story_id,
    provider: "mock",
    model: "workspace-assistant",
    jobType: `workspace.regenerate.${action}`,
    request: {
      outputId: current.id,
      action,
      mock: true,
    },
  });

  if (job.job) {
    await AIJobManager.markJobRunning(client, job.job.id, args.userId);
  }

  const started = Date.now();
  try {
    const generated = await runMockWorkspaceAction(
      action as AIWorkspaceSuggestedAction,
      args.context,
    );

    const { data, error } = await client
      .from("ai_workspace_outputs")
      .update({
        status: "waiting_for_approval",
        title: generated.title,
        content: generated.content,
        content_version: (current.content_version ?? 1) + 1,
        structured: {
          ...generated.structured,
          mock: true,
          regenerated: true,
        } as unknown as Json,
        ai_job_id: job.job?.id ?? current.ai_job_id,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        updated_by: args.userId,
        error: null,
      })
      .eq("id", args.outputId)
      .select(AI_WORKSPACE_OUTPUT_SELECT)
      .single();

    if (error || !data) {
      if (job.job) {
        await AIJobManager.markJobFailed(
          client,
          job.job.id,
          args.userId,
          error?.message ?? "Regenerate failed.",
        );
      }
      return { data: null, error: error?.message ?? "Regenerate failed." };
    }

    if (job.job) {
      await AIJobManager.markJobSucceeded(client, job.job.id, args.userId, {
        response: { outputId: data.id, mock: true } as unknown as Json,
        tokensUsed: 0,
        cost: 0,
        processingTimeMs: Date.now() - started,
      });
    }

    return { data, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Regenerate failed.";
    await client
      .from("ai_workspace_outputs")
      .update({
        status: "waiting_for_approval",
        error: message,
        updated_by: args.userId,
      })
      .eq("id", args.outputId);
    if (job.job) {
      await AIJobManager.markJobFailed(client, job.job.id, args.userId, message);
    }
    return { data: null, error: message };
  }
}

export async function listJobsForStory(
  client: Client,
  storyId: string,
  limit = 40,
): Promise<AIWorkspaceServiceResult<Database["public"]["Tables"]["ai_jobs"]["Row"][]>> {
  const { data, error } = await client
    .from("ai_jobs")
    .select(AI_JOB_SELECT)
    .eq("story_id", storyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}
