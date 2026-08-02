"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AI_PRODUCTION_STAGE_LABELS,
  AI_WORKFLOW_STATUS_LABELS,
  AI_WORKFLOW_TASK_LABELS,
  AI_WORKFLOW_TASK_STATUS_LABELS,
  type AIProductionStage,
} from "@/features/ai-production/constants/production.constants";
import {
  approveProductionTaskAction,
  cancelProductionWorkflowAction,
  getStoryProductionWorkflowAction,
  regenerateProductionTaskAction,
  rejectProductionTaskAction,
  retryProductionTaskAction,
  startStoryProductionWorkflowAction,
  updateProductionTaskOutputAction,
} from "@/features/ai-production/actions/production.actions";
import type {
  AIWorkflowTask,
  AIWorkflowWithTasks,
  TaskOutputDocument,
} from "@/features/ai-production/types/production.types";
import { cn } from "@/lib/utils";

type AIProductionPanelProps = {
  storyId: string;
};

function isWaiting(status: string) {
  return status === "waiting_for_approval";
}

function nextWaitingLabel(data: AIWorkflowWithTasks | undefined) {
  const next = data?.tasks.find((t) => isWaiting(t.status));
  if (!next) return null;
  return AI_WORKFLOW_TASK_LABELS[next.task_type] ?? next.task_type;
}

export function AIProductionPanel({ storyId }: AIProductionPanelProps) {
  const [workflow, setWorkflow] = useState<AIWorkflowWithTasks | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [pending, startTransition] = useTransition();
  /** Ignores stale refresh responses that would rewind approve/reject UI. */
  const loadGeneration = useRef(0);

  const applyWorkflow = useCallback((data: AIWorkflowWithTasks | null) => {
    loadGeneration.current += 1;
    setWorkflow(data);
  }, []);

  const refresh = useCallback(() => {
    const generation = ++loadGeneration.current;
    startTransition(async () => {
      const result = await getStoryProductionWorkflowAction(storyId);
      if (generation !== loadGeneration.current) return;
      if (!result.success) {
        setLoadError(result.error);
        return;
      }
      setLoadError(null);
      setWorkflow(result.data);
    });
  }, [storyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tasks = workflow?.tasks ?? [];
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;
  const pendingApprovals = tasks.filter((t) => isWaiting(t.status));
  const failedTasks = tasks.filter((t) => t.status === "failed");
  const activeTask = pendingApprovals[0] ?? failedTasks[0] ?? null;

  const visibleTasks = useMemo(() => {
    const waiting = tasks.filter((t) => isWaiting(t.status));
    const failed = tasks.filter((t) => t.status === "failed");
    const running = tasks.filter(
      (t) => t.status === "running" || t.status === "queued",
    );
    const done = tasks.filter(
      (t) =>
        t.status === "completed" ||
        t.status === "cancelled" ||
        t.status === "rejected",
    );
    return [
      ...waiting,
      ...failed,
      ...running,
      ...(showCompleted ? done : []),
    ];
  }, [tasks, showCompleted]);

  const etaLabel = useMemo(() => {
    if (!workflow) return null;
    const remaining = tasks
      .filter(
        (t) =>
          t.status === "queued" ||
          t.status === "running" ||
          isWaiting(t.status),
      )
      .reduce((sum, t) => sum + (t.estimated_seconds ?? 0), 0);
    if (workflow.status === "completed") return "Complete";
    if (workflow.status === "cancelled") return "Cancelled";
    return `~${Math.max(remaining, 0)}s remaining (est.)`;
  }, [workflow, tasks]);

  function run(
    action: () => Promise<{
      success: boolean;
      error?: string;
      data?: AIWorkflowWithTasks;
    }>,
    okMessage: string | ((data?: AIWorkflowWithTasks) => string),
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Action failed");
        return;
      }
      // Invalidate any in-flight refresh so it cannot overwrite this state.
      if (result.data !== undefined) {
        applyWorkflow(result.data);
      } else {
        loadGeneration.current += 1;
      }
      toast.success(
        typeof okMessage === "function" ? okMessage(result.data) : okMessage,
      );
    });
  }

  function beginEdit(task: AIWorkflowTask) {
    const output = task.output as TaskOutputDocument;
    setEditingTaskId(task.id);
    setDraftContent(output?.content ?? "");
  }

  function saveEdit(taskId: string) {
    startTransition(async () => {
      const result = await updateProductionTaskOutputAction({
        taskId,
        storyId,
        content: draftContent,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Output saved (new version)");
      setEditingTaskId(null);
      refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3.5" />
          AI Production
        </h3>
        {workflow ? (
          <Badge variant="outline">
            {AI_WORKFLOW_STATUS_LABELS[workflow.status]}
          </Badge>
        ) : null}
      </div>

      {loadError ? (
        <p className="text-xs text-destructive">
          {loadError}. Apply migration{" "}
          <code className="text-[10px]">
            20260324000009_ai_production_engine.sql
          </code>{" "}
          if needed.
        </p>
      ) : null}

      {!workflow ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border/70 p-3">
          <p className="text-xs text-muted-foreground">
            Run the Story → Research → … → Publishing pipeline with mock AI
            outputs. Nothing publishes automatically.
          </p>
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={() =>
              run(
                () => startStoryProductionWorkflowAction(storyId),
                "Production workflow started",
              )
            }
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Start AI Production
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Progress {completedCount}/{tasks.length}
              </span>
              <span>{etaLabel}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            {workflow.current_stage ? (
              <p className="text-[11px] text-muted-foreground">
                Stage:{" "}
                {
                  AI_PRODUCTION_STAGE_LABELS[
                    workflow.current_stage as AIProductionStage
                  ]
                }
              </p>
            ) : null}
          </div>

          {/* Always-visible approval bar — pinned at top of panel */}
          {activeTask && isWaiting(activeTask.status) ? (
            <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Needs your approval
              </p>
              <p className="text-[11px] text-amber-900/80 dark:text-amber-100/80">
                {AI_WORKFLOW_TASK_LABELS[activeTask.task_type]}
                <span className="block mt-0.5 opacity-80">
                  Each step pauses here before the next one runs.
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={pending}
                  onClick={() => {
                    const approvedLabel =
                      AI_WORKFLOW_TASK_LABELS[activeTask.task_type];
                    run(
                      () =>
                        approveProductionTaskAction(activeTask.id, storyId),
                      (data) => {
                        const next = nextWaitingLabel(data);
                        if (next) {
                          return `${approvedLabel} approved. Next: ${next}`;
                        }
                        return `${approvedLabel} approved. Pipeline complete.`;
                      },
                    );
                  }}
                >
                  <Check className="size-3.5" />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        rejectProductionTaskAction(
                          activeTask.id,
                          storyId,
                          "Rejected by editor",
                        ),
                      "Task rejected — workflow stopped",
                    )
                  }
                >
                  <X className="size-3.5" />
                  Reject
                </Button>
              </div>
            </div>
          ) : null}

          {failedTasks.length > 0 ? (
            <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
              {failedTasks.length} failed task
              {failedTasks.length === 1 ? "" : "s"}
            </p>
          ) : null}

          <ul className="space-y-2">
            {visibleTasks.map((task) => {
              const output = task.output as TaskOutputDocument;
              const isEditing = editingTaskId === task.id;
              const waiting = isWaiting(task.status);

              return (
                <li
                  key={task.id}
                  className={cn(
                    "rounded-lg border bg-background/80 p-2.5",
                    waiting
                      ? "border-amber-500/50 ring-1 ring-amber-500/20"
                      : "border-border/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {AI_WORKFLOW_TASK_LABELS[task.task_type]}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {
                          AI_PRODUCTION_STAGE_LABELS[
                            task.stage as AIProductionStage
                          ]
                        }{" "}
                        · v{task.output_version}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 text-[10px]",
                        waiting && "border-amber-500/40",
                        task.status === "failed" && "border-destructive/40",
                        task.status === "completed" && "border-emerald-500/40",
                      )}
                    >
                      {AI_WORKFLOW_TASK_STATUS_LABELS[task.status] ??
                        task.status}
                    </Badge>
                  </div>

                  {waiting ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={pending}
                        onClick={() => {
                          const approvedLabel =
                            AI_WORKFLOW_TASK_LABELS[task.task_type];
                          run(
                            () =>
                              approveProductionTaskAction(task.id, storyId),
                            (data) => {
                              const next = nextWaitingLabel(data);
                              if (next) {
                                return `${approvedLabel} approved. Next: ${next}`;
                              }
                              return `${approvedLabel} approved. Pipeline complete.`;
                            },
                          );
                        }}
                      >
                        <Check className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              rejectProductionTaskAction(
                                task.id,
                                storyId,
                                "Rejected by editor",
                              ),
                            "Task rejected — workflow stopped",
                          )
                        }
                      >
                        <X className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  ) : null}

                  {output?.content ? (
                    isEditing ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={draftContent}
                          onChange={(e) => setDraftContent(e.target.value)}
                          rows={5}
                          className="text-xs"
                          aria-label="Edit generated output"
                        />
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            disabled={pending}
                            onClick={() => saveEdit(task.id)}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingTaskId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <pre className="mt-2 max-h-20 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
                        {output.title ? `${output.title}\n\n` : ""}
                        {output.content}
                      </pre>
                    )
                  ) : task.error ? (
                    <p className="mt-2 text-[10px] text-destructive">
                      {task.error}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {output?.content && !isEditing ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => beginEdit(task)}
                      >
                        <Pencil className="size-3" />
                        Edit
                      </Button>
                    ) : null}

                    {task.status === "failed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => retryProductionTaskAction(task.id, storyId),
                            "Retry started",
                          )
                        }
                      >
                        <RotateCcw className="size-3" />
                        Retry
                      </Button>
                    ) : null}

                    {[
                      "waiting_for_approval",
                      "completed",
                      "failed",
                      "rejected",
                    ].includes(task.status) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[10px]"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              regenerateProductionTaskAction(task.id, storyId),
                            "Regenerating (mock)",
                          )
                        }
                      >
                        <RefreshCw className="size-3" />
                        Regenerate
                      </Button>
                    ) : null}
                  </div>

                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Version history placeholder · v{task.output_version}
                  </p>
                </li>
              );
            })}
          </ul>

          {completedCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-full justify-start text-[11px]"
              onClick={() => setShowCompleted((v) => !v)}
            >
              {showCompleted ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              {showCompleted ? "Hide" : "Show"} completed ({completedCount})
            </Button>
          ) : null}

          <Separator />

          <div className="flex flex-wrap gap-1">
            {workflow.status !== "completed" &&
            workflow.status !== "cancelled" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px]"
                disabled={pending}
                onClick={() =>
                  run(
                    () => cancelProductionWorkflowAction(workflow.id, storyId),
                    "Workflow cancelled",
                  )
                }
              >
                Cancel workflow
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-7 text-[10px]"
                disabled={pending}
                onClick={() =>
                  run(
                    () => startStoryProductionWorkflowAction(storyId),
                    "New production run started",
                  )
                }
              >
                Run again
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[10px]"
              disabled={pending}
              onClick={refresh}
            >
              Refresh
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
