import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/shared/types/database.types";
import type { AIProviderId } from "@/features/ai/types/ai";
import { getAIOrgSettings } from "@/features/ai/services/ai-settings.service";
import {
  AI_PRODUCTION_PIPELINE,
  AI_PRODUCTION_STAGES,
  createDefaultAIProductionSettings,
  type AIProductionSettings,
  type AIProductionStage,
  type AIWorkflowTaskType,
} from "@/features/ai-production/constants/production.constants";
import { runMockProductionTask } from "@/features/ai-production/services/mock-task-runner";
import type {
  AIProductionServiceResult,
  AIWorkflowTask,
  AIWorkflowWithTasks,
  TaskOutputDocument,
} from "@/features/ai-production/types/production.types";
import * as AIJobManager from "@/features/ai/services/ai-job-manager";

type Client = SupabaseClient<Database>;

const AI_WORKFLOW_SELECT =
  "id, organization_id, story_id, status, current_stage, estimated_seconds, started_at, finished_at, metadata, error, created_by, updated_by, created_at, updated_at, deleted_at";

const AI_WORKFLOW_TASK_SELECT =
  "id, organization_id, workflow_id, story_id, task_type, stage, sort_order, status, provider, model, ai_job_id, input, output, output_version, estimated_seconds, error, started_at, finished_at, approved_at, approved_by, rejected_at, rejected_by, rejection_reason, created_by, updated_by, created_at, updated_at, deleted_at";

const TASK_SELECT = AI_WORKFLOW_TASK_SELECT;

/**
 * AI Workflow Manager — Story → production pipeline orchestration.
 * Uses mock runners only (no external AI calls).
 */
export async function getLatestWorkflowForStory(
  client: Client,
  storyId: string,
): Promise<AIProductionServiceResult<AIWorkflowWithTasks | null>> {
  const { data: workflow, error } = await client
    .from("ai_workflows")
    .select(AI_WORKFLOW_SELECT)
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!workflow) return { data: null, error: null };

  const { data: tasks, error: tasksError } = await client
    .from("ai_workflow_tasks")
    .select(TASK_SELECT)
    .eq("workflow_id", workflow.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (tasksError) return { data: null, error: tasksError.message };

  return {
    data: { ...workflow, tasks: tasks ?? [] },
    error: null,
  };
}

export async function startProductionWorkflow(
  client: Client,
  args: {
    organizationId: string;
    storyId: string;
    userId: string;
    storyTitle: string;
    storySummary?: string | null;
    language?: string;
  },
): Promise<AIProductionServiceResult<AIWorkflowWithTasks>> {
  const existing = await getLatestWorkflowForStory(client, args.storyId);
  if (existing.error) return { data: null, error: existing.error };
  if (
    existing.data &&
    (existing.data.status === "queued" ||
      existing.data.status === "running" ||
      existing.data.status === "waiting_for_approval")
  ) {
    return {
      data: null,
      error: "A production workflow is already in progress for this story.",
    };
  }

  const { settings } = await getAIOrgSettings(client, args.organizationId);
  const production = resolveProductionSettings(settings.production);

  const enabledStages = AI_PRODUCTION_PIPELINE.filter(
    (step) => production.stages[step.stage],
  );

  if (!enabledStages.length) {
    return {
      data: null,
      error: "All AI Production stages are disabled in settings.",
    };
  }

  const estimatedSeconds = enabledStages.reduce(
    (sum, step) => sum + step.estimatedSeconds,
    0,
  );

  const { data: workflow, error: wfError } = await client
    .from("ai_workflows")
    .insert({
      organization_id: args.organizationId,
      story_id: args.storyId,
      status: "queued",
      current_stage: enabledStages[0]?.stage ?? null,
      estimated_seconds: estimatedSeconds,
      metadata: {
        mock: true,
        storyTitle: args.storyTitle,
      },
      created_by: args.userId,
      updated_by: args.userId,
    })
    .select(AI_WORKFLOW_SELECT)
    .single();

  if (wfError || !workflow) {
    return { data: null, error: wfError?.message ?? "Unable to create workflow." };
  }

  let sortOrder = 0;
  const taskRows: Database["public"]["Tables"]["ai_workflow_tasks"]["Insert"][] =
    [];

  for (const step of enabledStages) {
    for (const taskType of step.tasks) {
      const provider =
        production.taskProviders[taskType] ?? settings.defaultProvider;
      taskRows.push({
        organization_id: args.organizationId,
        workflow_id: workflow.id,
        story_id: args.storyId,
        task_type: taskType,
        stage: step.stage,
        sort_order: sortOrder++,
        status: "queued",
        provider,
        model: settings.preferredModel,
        input: {
          storyTitle: args.storyTitle,
          storySummary: args.storySummary ?? null,
          language: args.language ?? "en",
        },
        output: {},
        estimated_seconds: Math.round(
          step.estimatedSeconds / Math.max(1, step.tasks.length),
        ),
        created_by: args.userId,
        updated_by: args.userId,
      });
    }
  }

  const { error: tasksError } = await client
    .from("ai_workflow_tasks")
    .insert(taskRows);

  if (tasksError) {
    return { data: null, error: tasksError.message };
  }

  // Kick first queued task through mock runner
  const advanced = await advanceWorkflow(client, {
    workflowId: workflow.id,
    userId: args.userId,
  });

  if (advanced.error || !advanced.data) {
    return {
      data: null,
      error: advanced.error ?? "Workflow created but could not start.",
    };
  }

  return advanced;
}

/**
 * Run the next queued task (mock), then pause at waiting_for_approval.
 */
export async function advanceWorkflow(
  client: Client,
  args: { workflowId: string; userId: string },
): Promise<AIProductionServiceResult<AIWorkflowWithTasks>> {
  const bundle = await loadWorkflowBundle(client, args.workflowId);
  if (bundle.error || !bundle.data) {
    return { data: null, error: bundle.error ?? "Workflow not found." };
  }

  const { workflow, tasks } = bundle.data;

  if (
    workflow.status === "cancelled" ||
    workflow.status === "completed" ||
    workflow.status === "failed"
  ) {
    return {
      data: { ...workflow, tasks },
      error: null,
    };
  }

  const waiting = tasks.find((t) => t.status === "waiting_for_approval");
  if (waiting) {
    await client
      .from("ai_workflows")
      .update({
        status: "waiting_for_approval",
        current_stage: waiting.stage,
        updated_by: args.userId,
      })
      .eq("id", workflow.id);

    return loadWorkflowResult(client, args.workflowId);
  }

  const next = tasks.find((t) => t.status === "queued");
  if (!next) {
    const hasFailed = tasks.some((t) => t.status === "failed");
    const allDone = tasks.every(
      (t) =>
        t.status === "completed" ||
        t.status === "cancelled" ||
        t.status === "rejected",
    );

    await client
      .from("ai_workflows")
      .update({
        status: hasFailed ? "failed" : allDone ? "completed" : "running",
        finished_at:
          hasFailed || allDone ? new Date().toISOString() : null,
        updated_by: args.userId,
      })
      .eq("id", workflow.id);

    return loadWorkflowResult(client, args.workflowId);
  }

  await client
    .from("ai_workflows")
    .update({
      status: "running",
      current_stage: next.stage,
      started_at: workflow.started_at ?? new Date().toISOString(),
      updated_by: args.userId,
    })
    .eq("id", workflow.id);

  await client
    .from("ai_workflow_tasks")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      updated_by: args.userId,
      error: null,
    })
    .eq("id", next.id);

  const input = (next.input ?? {}) as {
    storyTitle?: string;
    storySummary?: string | null;
    language?: string;
  };

  // Ledger row (architecture link to ai_jobs)
  const job = await AIJobManager.enqueueJob(client, {
    organizationId: workflow.organization_id,
    userId: args.userId,
    storyId: workflow.story_id,
    provider: next.provider ?? "openai",
    model: next.model,
    jobType: `production.${next.task_type}`,
    request: {
      workflowId: workflow.id,
      taskId: next.id,
      mock: true,
      input,
    },
  });

  if (job.job) {
    await AIJobManager.markJobRunning(client, job.job.id, args.userId);
  }

  try {
    const mock = await runMockProductionTask(next.task_type as AIWorkflowTaskType, {
      storyTitle: input.storyTitle ?? "Untitled story",
      storySummary: input.storySummary,
      language: input.language,
    });

    const output: TaskOutputDocument = {
      title: mock.title,
      content: mock.body,
      structured: (mock.extras ?? {}) as Json,
      mock: true,
      generatedAt: mock.generatedAt,
    };

    await client
      .from("ai_workflow_tasks")
      .update({
        status: "waiting_for_approval",
        output: output as unknown as Json,
        output_version: next.output_version ?? 1,
        finished_at: new Date().toISOString(),
        ai_job_id: job.job?.id ?? null,
        updated_by: args.userId,
      })
      .eq("id", next.id);

    if (job.job) {
      await AIJobManager.markJobSucceeded(client, job.job.id, args.userId, {
        response: output as unknown as Json,
        tokensUsed: 0,
        cost: 0,
        processingTimeMs: next.estimated_seconds * 1000,
      });
    }

    await client
      .from("ai_workflows")
      .update({
        status: "waiting_for_approval",
        current_stage: next.stage,
        updated_by: args.userId,
      })
      .eq("id", workflow.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mock task failed.";

    await client
      .from("ai_workflow_tasks")
      .update({
        status: "failed",
        error: message,
        finished_at: new Date().toISOString(),
        updated_by: args.userId,
      })
      .eq("id", next.id);

    if (job.job) {
      await AIJobManager.markJobFailed(client, job.job.id, args.userId, message);
    }

    await client
      .from("ai_workflows")
      .update({
        status: "failed",
        error: message,
        finished_at: new Date().toISOString(),
        updated_by: args.userId,
      })
      .eq("id", workflow.id);
  }

  return loadWorkflowResult(client, args.workflowId);
}

export async function approveTask(
  client: Client,
  args: { taskId: string; userId: string },
): Promise<AIProductionServiceResult<AIWorkflowWithTasks>> {
  const task = await getTask(client, args.taskId);
  if (task.error || !task.data) {
    return { data: null, error: task.error ?? "Task not found." };
  }
  if (task.data.status !== "waiting_for_approval") {
    return { data: null, error: "Only tasks waiting for approval can be approved." };
  }

  const { data: approved, error: approveError } = await client
    .from("ai_workflow_tasks")
    .update({
      status: "completed",
      approved_at: new Date().toISOString(),
      approved_by: args.userId,
      updated_by: args.userId,
    })
    .eq("id", args.taskId)
    .eq("status", "waiting_for_approval")
    .select(AI_WORKFLOW_TASK_SELECT)
    .single();

  if (approveError || !approved) {
    return {
      data: null,
      error: approveError?.message ?? "Could not approve task.",
    };
  }

  return advanceWorkflow(client, {
    workflowId: task.data.workflow_id,
    userId: args.userId,
  });
}

export async function rejectTask(
  client: Client,
  args: { taskId: string; userId: string; reason?: string },
): Promise<AIProductionServiceResult<AIWorkflowWithTasks>> {
  const task = await getTask(client, args.taskId);
  if (task.error || !task.data) {
    return { data: null, error: task.error ?? "Task not found." };
  }
  if (task.data.status !== "waiting_for_approval") {
    return { data: null, error: "Only tasks waiting for approval can be rejected." };
  }

  const { data: rejected, error: rejectError } = await client
    .from("ai_workflow_tasks")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejected_by: args.userId,
      rejection_reason: args.reason ?? "Rejected by editor",
      updated_by: args.userId,
    })
    .eq("id", args.taskId)
    .eq("status", "waiting_for_approval")
    .select(AI_WORKFLOW_TASK_SELECT)
    .single();

  if (rejectError || !rejected) {
    return {
      data: null,
      error: rejectError?.message ?? "Could not reject task.",
    };
  }

  const { error: cancelError } = await client
    .from("ai_workflows")
    .update({
      status: "cancelled",
      error: "Workflow stopped after task rejection.",
      finished_at: new Date().toISOString(),
      updated_by: args.userId,
    })
    .eq("id", task.data.workflow_id);

  if (cancelError) {
    return { data: null, error: cancelError.message };
  }

  return loadWorkflowResult(client, task.data.workflow_id);
}

export async function updateTaskOutput(
  client: Client,
  args: {
    taskId: string;
    userId: string;
    content: string;
    title?: string;
  },
): Promise<AIProductionServiceResult<AIWorkflowTask>> {
  const task = await getTask(client, args.taskId);
  if (task.error || !task.data) {
    return { data: null, error: task.error ?? "Task not found." };
  }

  const prev = (task.data.output ?? {}) as TaskOutputDocument;
  const nextOutput: TaskOutputDocument = {
    ...prev,
    title: args.title ?? prev.title,
    content: args.content,
    editedAt: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("ai_workflow_tasks")
    .update({
      output: nextOutput as unknown as Json,
      output_version: (task.data.output_version ?? 1) + 1,
      updated_by: args.userId,
    })
    .eq("id", args.taskId)
    .select(AI_WORKFLOW_TASK_SELECT)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function regenerateTask(
  client: Client,
  args: { taskId: string; userId: string },
): Promise<AIProductionServiceResult<AIWorkflowWithTasks>> {
  const task = await getTask(client, args.taskId);
  if (task.error || !task.data) {
    return { data: null, error: task.error ?? "Task not found." };
  }

  const regenerable = [
    "waiting_for_approval",
    "failed",
    "rejected",
    "completed",
  ].includes(task.data.status);

  if (!regenerable) {
    return { data: null, error: "This task cannot be regenerated right now." };
  }

  // Cancel other waiting tasks in the same workflow stage progression:
  // Reset this task to queued and cancel later incomplete tasks so pipeline can resume.
  const bundle = await loadWorkflowBundle(client, task.data.workflow_id);
  if (bundle.error || !bundle.data) {
    return { data: null, error: bundle.error ?? "Workflow not found." };
  }

  for (const t of bundle.data.tasks) {
    if (t.sort_order > task.data.sort_order && t.status !== "completed") {
      await client
        .from("ai_workflow_tasks")
        .update({
          status: "queued",
          error: null,
          approved_at: null,
          approved_by: null,
          rejected_at: null,
          rejected_by: null,
          updated_by: args.userId,
        })
        .eq("id", t.id);
    }
  }

  await client
    .from("ai_workflow_tasks")
    .update({
      status: "queued",
      error: null,
      approved_at: null,
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
      started_at: null,
      finished_at: null,
      updated_by: args.userId,
    })
    .eq("id", args.taskId);

  await client
    .from("ai_workflows")
    .update({
      status: "running",
      error: null,
      finished_at: null,
      updated_by: args.userId,
    })
    .eq("id", task.data.workflow_id);

  return advanceWorkflow(client, {
    workflowId: task.data.workflow_id,
    userId: args.userId,
  });
}

export async function retryFailedTask(
  client: Client,
  args: { taskId: string; userId: string },
): Promise<AIProductionServiceResult<AIWorkflowWithTasks>> {
  return regenerateTask(client, args);
}

export async function cancelWorkflow(
  client: Client,
  args: { workflowId: string; userId: string },
): Promise<AIProductionServiceResult<AIWorkflowWithTasks>> {
  const bundle = await loadWorkflowBundle(client, args.workflowId);
  if (bundle.error || !bundle.data) {
    return { data: null, error: bundle.error ?? "Workflow not found." };
  }

  for (const t of bundle.data.tasks) {
    if (
      t.status === "queued" ||
      t.status === "running" ||
      t.status === "waiting_for_approval"
    ) {
      await client
        .from("ai_workflow_tasks")
        .update({
          status: "cancelled",
          updated_by: args.userId,
          finished_at: new Date().toISOString(),
        })
        .eq("id", t.id);
    }
  }

  await client
    .from("ai_workflows")
    .update({
      status: "cancelled",
      finished_at: new Date().toISOString(),
      updated_by: args.userId,
    })
    .eq("id", args.workflowId);

  return loadWorkflowResult(client, args.workflowId);
}

export function resolveProductionSettings(
  raw: AIProductionSettings | undefined | null,
): AIProductionSettings {
  const defaults = createDefaultAIProductionSettings();
  if (!raw) return defaults;
  const stages = { ...defaults.stages };
  for (const stage of AI_PRODUCTION_STAGES) {
    if (typeof raw.stages?.[stage] === "boolean") {
      stages[stage] = raw.stages[stage];
    }
  }
  return {
    stages,
    taskProviders: { ...defaults.taskProviders, ...(raw.taskProviders ?? {}) },
  };
}

async function getTask(
  client: Client,
  taskId: string,
): Promise<AIProductionServiceResult<AIWorkflowTask>> {
  const { data, error } = await client
    .from("ai_workflow_tasks")
    .select(AI_WORKFLOW_TASK_SELECT)
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Task not found." };
  return { data, error: null };
}

async function loadWorkflowBundle(
  client: Client,
  workflowId: string,
): Promise<
  AIProductionServiceResult<{
    workflow: Omit<AIWorkflowWithTasks, "tasks">;
    tasks: AIWorkflowTask[];
  }>
> {
  const { data: workflow, error } = await client
    .from("ai_workflows")
    .select(AI_WORKFLOW_SELECT)
    .eq("id", workflowId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!workflow) return { data: null, error: "Workflow not found." };

  const { data: tasks, error: tasksError } = await client
    .from("ai_workflow_tasks")
    .select(AI_WORKFLOW_TASK_SELECT)
    .eq("workflow_id", workflowId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (tasksError) return { data: null, error: tasksError.message };

  return { data: { workflow, tasks: tasks ?? [] }, error: null };
}

async function loadWorkflowResult(
  client: Client,
  workflowId: string,
): Promise<AIProductionServiceResult<AIWorkflowWithTasks>> {
  const bundle = await loadWorkflowBundle(client, workflowId);
  if (bundle.error || !bundle.data) {
    return { data: null, error: bundle.error ?? "Workflow not found." };
  }
  return {
    data: { ...bundle.data.workflow, tasks: bundle.data.tasks },
    error: null,
  };
}

export type { AIProviderId, AIProductionStage };
