"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Bot,
  Check,
  History,
  Loader2,
  MessageSquare,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AIProductionPanel } from "@/features/ai-production/components/ai-production-panel";
import {
  AI_MESSAGE_ROLE_LABELS,
  AI_WORKSPACE_ACTIONS,
  AI_WORKSPACE_ACTION_LABELS,
  AI_WORKSPACE_OUTPUT_STATUS_LABELS,
  AI_WORKSPACE_TAB_LABELS,
  type AIWorkspaceSuggestedAction,
  type AIWorkspaceTabId,
} from "@/features/ai-workspace/constants/workspace.constants";
import {
  approveAIWorkspaceOutputAction,
  getStoryAIWorkspaceAction,
  regenerateAIWorkspaceOutputAction,
  rejectAIWorkspaceOutputAction,
  runAIWorkspaceSuggestedAction,
  sendAIWorkspaceMessageAction,
  updateAIWorkspaceOutputAction,
} from "@/features/ai-workspace/actions/workspace.actions";
import type {
  AIConversationWithMessages,
  AIMessage,
  AIWorkspaceBundle,
  AIWorkspaceOutput,
} from "@/features/ai-workspace/types/workspace.types";
import { cn } from "@/lib/utils";

type AIWorkspacePanelProps = {
  storyId: string;
  storyTitle: string;
};

export function AIWorkspacePanel({ storyId, storyTitle }: AIWorkspacePanelProps) {
  const [tab, setTab] = useState<AIWorkspaceTabId>("chat");
  const [bundle, setBundle] = useState<AIWorkspaceBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editingOutputId, setEditingOutputId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const loadGeneration = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(() => {
    const generation = ++loadGeneration.current;
    startTransition(async () => {
      const result = await getStoryAIWorkspaceAction(storyId);
      if (generation !== loadGeneration.current) return;
      if (!result.success) {
        setLoadError(result.error);
        return;
      }
      setLoadError(null);
      setBundle(result.data);
    });
  }, [storyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    // Scroll only the chat pane — scrollIntoView would scroll the page and hide workspace tabs.
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [bundle?.conversation?.messages.length, tab]);

  const conversation = bundle?.conversation ?? null;
  const messages = conversation?.messages ?? [];
  const outputs = bundle?.outputs ?? [];
  const jobs = bundle?.jobs ?? [];
  const prompts = useMemo(
    () => messages.filter((m) => m.role === "user"),
    [messages],
  );
  const pendingOutputs = outputs.filter(
    (o) => o.status === "waiting_for_approval",
  );

  function applyBundle(next: Partial<AIWorkspaceBundle>) {
    loadGeneration.current += 1;
    setBundle((prev) =>
      prev
        ? { ...prev, ...next }
        : {
            conversation: next.conversation ?? null,
            outputs: next.outputs ?? [],
            jobs: next.jobs ?? [],
            workflow: next.workflow ?? null,
          },
    );
  }

  function sendMessage() {
    const content = draft.trim();
    if (!content) return;
    startTransition(async () => {
      const result = await sendAIWorkspaceMessageAction(storyId, content);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDraft("");
      applyBundle({ conversation: result.data });
      toast.success("Reply saved (mock assistant)");
    });
  }

  function runAction(action: AIWorkspaceSuggestedAction) {
    startTransition(async () => {
      const result = await runAIWorkspaceSuggestedAction(storyId, action);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      applyBundle({
        conversation: result.data.conversation,
        outputs: [
          result.data.output,
          ...(bundle?.outputs ?? []).filter((o) => o.id !== result.data.output.id),
        ],
      });
      setTab("outputs");
      toast.success(`${AI_WORKSPACE_ACTION_LABELS[action]} ready for review`);
      // Refresh jobs in background
      refresh();
    });
  }

  function patchOutput(updated: AIWorkspaceOutput) {
    applyBundle({
      outputs: (bundle?.outputs ?? []).map((o) =>
        o.id === updated.id ? updated : o,
      ),
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Bot className="size-3.5" />
          AI Workspace
        </h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          disabled={pending}
          onClick={refresh}
          aria-label="Refresh AI workspace"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
        </Button>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Story assistant for{" "}
        <span className="font-medium text-foreground">{storyTitle}</span>. Mock
        only — no providers connected.
      </p>

      {loadError ? (
        <p className="text-xs text-destructive">
          {loadError}. Apply migration{" "}
          <code className="text-[10px]">20260324000010_ai_workspace.sql</code> if
          needed.
        </p>
      ) : null}

      {pendingOutputs.length > 0 && tab !== "outputs" ? (
        <button
          type="button"
          className="w-full rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-left text-[11px] text-amber-900 dark:text-amber-100"
          onClick={() => setTab("outputs")}
        >
          {pendingOutputs.length} output
          {pendingOutputs.length === 1 ? "" : "s"} waiting for approval →
        </button>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) =>
          setTab((value as AIWorkspaceTabId) ?? "chat")
        }
        className="gap-2"
      >
        <TabsList
          variant="line"
          className="h-auto w-full flex-wrap justify-start gap-0.5"
          aria-label="AI Workspace sections"
        >
          {(Object.keys(AI_WORKSPACE_TAB_LABELS) as AIWorkspaceTabId[]).map(
            (id) => (
              <TabsTrigger
                key={id}
                value={id}
                className="px-1.5 text-[10px]"
              >
                {AI_WORKSPACE_TAB_LABELS[id]}
              </TabsTrigger>
            ),
          )}
        </TabsList>

        <TabsContent value="chat" className="mt-0 space-y-2">
          <ChatPane
            messages={messages}
            draft={draft}
            pending={pending}
            chatScrollRef={chatScrollRef}
            onDraftChange={setDraft}
            onSend={sendMessage}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-0 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Suggested tasks use story context and create reviewable outputs.
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {AI_WORKSPACE_ACTIONS.map((action) => (
              <Button
                key={action}
                type="button"
                size="sm"
                variant="outline"
                className="h-8 justify-start text-[11px]"
                disabled={pending}
                onClick={() => runAction(action)}
              >
                <Sparkles className="size-3.5" />
                {AI_WORKSPACE_ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="outputs" className="mt-0 space-y-2">
          {outputs.length === 0 ? (
            <EmptyHint text="No generated outputs yet. Run a suggested task." />
          ) : (
            <ul className="space-y-2">
              {outputs.map((output) => (
                <OutputCard
                  key={output.id}
                  output={output}
                  pending={pending}
                  editing={editingOutputId === output.id}
                  editDraft={editDraft}
                  onBeginEdit={() => {
                    setEditingOutputId(output.id);
                    setEditDraft(output.content);
                  }}
                  onCancelEdit={() => setEditingOutputId(null)}
                  onEditDraftChange={setEditDraft}
                  onSaveEdit={() => {
                    startTransition(async () => {
                      const result = await updateAIWorkspaceOutputAction({
                        outputId: output.id,
                        storyId,
                        content: editDraft,
                      });
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      patchOutput(result.data);
                      setEditingOutputId(null);
                      toast.success("Output saved (new version)");
                    });
                  }}
                  onApprove={() => {
                    startTransition(async () => {
                      const result = await approveAIWorkspaceOutputAction(
                        output.id,
                        storyId,
                      );
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      patchOutput(result.data);
                      toast.success("Output approved");
                    });
                  }}
                  onReject={() => {
                    startTransition(async () => {
                      const result = await rejectAIWorkspaceOutputAction(
                        output.id,
                        storyId,
                        "Rejected by editor",
                      );
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      patchOutput(result.data);
                      toast.success("Output rejected");
                    });
                  }}
                  onRegenerate={() => {
                    startTransition(async () => {
                      const result = await regenerateAIWorkspaceOutputAction(
                        output.id,
                        storyId,
                      );
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      patchOutput(result.data);
                      toast.success("Output regenerated");
                    });
                  }}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="workflow" className="mt-0">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Workflow className="size-3.5" />
            Full production pipeline
          </div>
          <AIProductionPanel storyId={storyId} />
        </TabsContent>

        <TabsContent value="prompts" className="mt-0 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <History className="size-3.5" />
            Prompt history ({prompts.length})
          </div>
          {prompts.length === 0 ? (
            <EmptyHint text="Your chat prompts will appear here." />
          ) : (
            <ul className="space-y-1.5">
              {[...prompts].reverse().map((msg) => (
                <li
                  key={msg.id}
                  className="rounded-md border border-border/60 bg-background/80 px-2.5 py-2"
                >
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(msg.created_at).toLocaleString()}
                    {msg.action_type ? ` · ${msg.action_type}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed">
                    {msg.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-0 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <History className="size-3.5" />
            Job history ({jobs.length})
          </div>
          {jobs.length === 0 ? (
            <EmptyHint text="AI jobs for this story will list here." />
          ) : (
            <ul className="space-y-1.5">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="rounded-md border border-border/60 bg-background/80 px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-medium">
                      {job.job_type}
                    </p>
                    <Badge variant="outline" className="text-[9px]">
                      {job.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {job.provider}
                    {job.model ? ` / ${job.model}` : ""} ·{" "}
                    {new Date(job.created_at).toLocaleString()}
                  </p>
                  {job.error ? (
                    <p className="mt-1 text-[10px] text-destructive">
                      {job.error}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-[11px] text-muted-foreground">
      {text}
    </p>
  );
}

function ChatPane({
  messages,
  draft,
  pending,
  chatScrollRef,
  onDraftChange,
  onSend,
}: {
  messages: AIMessage[];
  draft: string;
  pending: boolean;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="space-y-2">
      <div
        ref={chatScrollRef}
        className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-lg border border-border/60 bg-background/60 p-2"
      >
        {messages.length === 0 ? (
          <EmptyHint text="Start a conversation with the Story Assistant." />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>
      <div className="space-y-1.5">
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={3}
          placeholder="Ask about this story…"
          className="text-xs"
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={pending || !draft.trim()}
          onClick={onSend}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
          Send
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "rounded-md px-2.5 py-2 text-[11px] leading-relaxed",
        isUser && "ml-4 bg-primary/10 text-foreground",
        isSystem && "border border-dashed border-border/70 text-muted-foreground",
        !isUser &&
          !isSystem &&
          "mr-4 border border-border/50 bg-muted/40 text-foreground",
      )}
    >
      <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        {isUser ? (
          <MessageSquare className="size-3" />
        ) : isSystem ? (
          <Sparkles className="size-3" />
        ) : (
          <Bot className="size-3" />
        )}
        {AI_MESSAGE_ROLE_LABELS[message.role]}
      </div>
      <p className="whitespace-pre-wrap break-words">{message.content}</p>
    </div>
  );
}

function OutputCard({
  output,
  pending,
  editing,
  editDraft,
  onBeginEdit,
  onCancelEdit,
  onEditDraftChange,
  onSaveEdit,
  onApprove,
  onReject,
  onRegenerate,
}: {
  output: AIWorkspaceOutput;
  pending: boolean;
  editing: boolean;
  editDraft: string;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onEditDraftChange: (value: string) => void;
  onSaveEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
}) {
  const waiting = output.status === "waiting_for_approval";
  const label =
    output.action_type in AI_WORKSPACE_ACTION_LABELS
      ? AI_WORKSPACE_ACTION_LABELS[
          output.action_type as AIWorkspaceSuggestedAction
        ]
      : output.action_type;

  return (
    <li
      className={cn(
        "rounded-lg border bg-background/80 p-2.5",
        waiting
          ? "border-amber-500/50 ring-1 ring-amber-500/20"
          : "border-border/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium">{output.title}</p>
          <p className="text-[10px] text-muted-foreground">
            {label} · v{output.content_version}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[9px]",
            waiting && "border-amber-500/40",
            output.status === "approved" && "border-emerald-500/40",
          )}
        >
          {AI_WORKSPACE_OUTPUT_STATUS_LABELS[output.status] ?? output.status}
        </Badge>
      </div>

      {waiting ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={onApprove}
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
            onClick={onReject}
          >
            <X className="size-3.5" />
            Reject
          </Button>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea
            value={editDraft}
            onChange={(e) => onEditDraftChange(e.target.value)}
            rows={5}
            className="text-xs"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={onSaveEdit}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancelEdit}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
          {output.content}
        </pre>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {!editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={onBeginEdit}
          >
            <Pencil className="size-3" />
            Edit
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px]"
          disabled={pending}
          onClick={onRegenerate}
        >
          <RefreshCw className="size-3" />
          Regenerate
        </Button>
      </div>
    </li>
  );
}

// Keep panel exports clean — conversation type is used by callers via actions.
export type { AIConversationWithMessages };
