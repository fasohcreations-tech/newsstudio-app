"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  Copy,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  NEWS_PRODUCER_ACTIONS,
  NEWS_PRODUCER_APPROVAL_LABELS,
  NEWS_PRODUCER_KIND_LABELS,
  NEWS_PRODUCER_SECTION_KINDS,
  NEWS_PRODUCER_SECTION_LABELS,
  NEWS_PRODUCER_SECTIONS,
  type NewsProducerActionId,
  type NewsProducerSection,
} from "@/features/ai-news-producer/constants/producer.constants";
import {
  approveNewsProducerOutputAction,
  getNewsProducerBundleAction,
  regenerateNewsProducerOutputAction,
  rejectNewsProducerOutputAction,
  runNewsProducerAction,
  saveNewsProducerContentObjectAction,
  updateNewsProducerOutputAction,
} from "@/features/ai-news-producer/actions/producer.actions";
import type { NewsProducerOutput } from "@/features/ai-news-producer/types/producer.types";
import { cn } from "@/lib/utils";

type AiNewsProducerTabProps = {
  storyId: string;
  storyTitle: string;
};

export function AiNewsProducerTab({
  storyId,
  storyTitle,
}: AiNewsProducerTabProps) {
  const [section, setSection] = useState<NewsProducerSection>("research");
  const [outputs, setOutputs] = useState<NewsProducerOutput[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getNewsProducerBundleAction(storyId);
      if (!result.success) {
        setLoadError(result.error);
        return;
      }
      setLoadError(null);
      setOutputs(result.data.outputs);
    });
  }, [storyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sectionOutputs = useMemo(() => {
    const kinds = new Set(NEWS_PRODUCER_SECTION_KINDS[section]);
    return outputs.filter((o) => kinds.has(o.producer.kind));
  }, [outputs, section]);

  const sectionActions = useMemo(
    () => NEWS_PRODUCER_ACTIONS.filter((a) => a.section === section),
    [section],
  );

  function upsertOutputs(next: NewsProducerOutput[]) {
    setOutputs((prev) => {
      const map = new Map(prev.map((o) => [o.id, o]));
      for (const item of next) map.set(item.id, item);
      // Also replace by kind when regenerate reuses same id or new id of same kind
      for (const item of next) {
        for (const [id, existing] of map) {
          if (
            id !== item.id &&
            existing.producer.kind === item.producer.kind
          ) {
            map.delete(id);
          }
        }
      }
      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    });
  }

  function runAction(actionId: NewsProducerActionId) {
    startTransition(async () => {
      const result = await runNewsProducerAction(storyId, actionId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      upsertOutputs(result.data);
      toast.success("Generated with Gemini via AI Orchestrator");
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sparkles className="size-5" />
          AI News Producer
        </h2>
        <p className="text-sm text-muted-foreground">
          “{storyTitle}” എന്ന വാർത്തയെ എഡിറ്റോറിയൽ ഔട്ട്പുട്ടുകളാക്കി മാറ്റുക.
          എല്ലാ AI മറുപടികളും <span className="font-medium text-foreground">മലയാളത്തിൽ</span>{" "}
          (Gemini → AI Orchestrator). അംഗീകരിക്കുന്നതിന് മുമ്പ് എഡിറ്റ് ചെയ്യാം.
        </p>
      </header>

      {loadError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {NEWS_PRODUCER_ACTIONS.map((action) => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setSection(action.section);
              runAction(action.id);
            }}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {action.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={refresh}
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      <Tabs
        value={section}
        onValueChange={(value) =>
          setSection((value as NewsProducerSection) ?? "research")
        }
        className="gap-3"
      >
        <TabsList
          variant="line"
          className="h-auto w-full flex-wrap justify-start"
          aria-label="AI Producer sections"
        >
          {NEWS_PRODUCER_SECTIONS.map((id) => (
            <TabsTrigger key={id} value={id} className="text-xs">
              {NEWS_PRODUCER_SECTION_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>

        {NEWS_PRODUCER_SECTIONS.map((id) => (
          <TabsContent key={id} value={id} className="mt-0 space-y-3">
            {id === section ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {sectionActions.map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => runAction(action.id)}
                    >
                      {pending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      {action.label}
                    </Button>
                  ))}
                </div>

                {sectionOutputs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
                    No {NEWS_PRODUCER_SECTION_LABELS[id].toLowerCase()} outputs
                    yet. Generate to create a reviewable content object.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {sectionOutputs.map((output) => (
                      <ProducerOutputCard
                        key={output.id}
                        output={output}
                        storyId={storyId}
                        pending={pending}
                        editing={editingId === output.id}
                        draft={draft}
                        onBeginEdit={() => {
                          setEditingId(output.id);
                          setDraft(output.producer.body);
                        }}
                        onCancelEdit={() => setEditingId(null)}
                        onDraftChange={setDraft}
                        onPatched={(next) => upsertOutputs([next])}
                        startTransition={startTransition}
                      />
                    ))}
                  </ul>
                )}
              </>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ProducerOutputCard({
  output,
  storyId,
  pending,
  editing,
  draft,
  onBeginEdit,
  onCancelEdit,
  onDraftChange,
  onPatched,
  startTransition,
}: {
  output: NewsProducerOutput;
  storyId: string;
  pending: boolean;
  editing: boolean;
  draft: string;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onDraftChange: (value: string) => void;
  onPatched: (output: NewsProducerOutput) => void;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const waiting = output.producer.approvalStatus === "waiting_for_approval";
  const ai = output.producer.ai;

  return (
    <li
      className={cn(
        "rounded-xl border bg-background p-4",
        waiting
          ? "border-amber-500/40 ring-1 ring-amber-500/15"
          : "border-border/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {NEWS_PRODUCER_KIND_LABELS[output.producer.kind]}
          </p>
          <p className="text-xs text-muted-foreground">
            {ai.provider}/{ai.model} · prompt {ai.promptId} v{ai.promptVersion}
            {ai.tokensUsed != null ? ` · ${ai.tokensUsed} tokens` : ""}
            {ai.executionTimeMs != null ? ` · ${ai.executionTimeMs}ms` : ""}
            {" · "}v{output.version}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            waiting && "border-amber-500/40",
            output.producer.approvalStatus === "approved" &&
              "border-emerald-500/40",
          )}
        >
          {NEWS_PRODUCER_APPROVAL_LABELS[output.producer.approvalStatus]}
        </Badge>
      </div>

      {waiting ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await approveNewsProducerOutputAction(
                  output.id,
                  storyId,
                );
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                onPatched(result.data);
                toast.success("Approved");
              })
            }
          >
            <Check className="size-3.5" />
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await rejectNewsProducerOutputAction(
                  output.id,
                  storyId,
                );
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                onPatched(result.data);
                toast.success("Rejected");
              })
            }
          >
            <X className="size-3.5" />
            Reject
          </Button>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={10}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await updateNewsProducerOutputAction({
                    outputId: output.id,
                    storyId,
                    body: draft,
                  });
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  onPatched(result.data);
                  onCancelEdit();
                  toast.success("Saved edits");
                })
              }
            >
              Save edits
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
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
          {output.producer.body}
        </pre>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {!editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={onBeginEdit}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await regenerateNewsProducerOutputAction(
                output.id,
                storyId,
              );
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              onPatched(result.data);
              toast.success("Regenerated");
            })
          }
        >
          <RefreshCw className="size-3.5" />
          Regenerate
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(output.producer.body);
              toast.success("Copied");
            } catch {
              toast.error("Clipboard unavailable");
            }
          }}
        >
          <Copy className="size-3.5" />
          Copy
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveNewsProducerContentObjectAction(
                output.id,
                storyId,
              );
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              onPatched(result.data);
              toast.success("Saved as content object (ready)");
            })
          }
        >
          <Save className="size-3.5" />
          Save as Content Object
        </Button>
      </div>
    </li>
  );
}
