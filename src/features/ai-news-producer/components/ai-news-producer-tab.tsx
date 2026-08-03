"use client";

import dynamic from "next/dynamic";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NEWS_PRODUCER_ACTIONS,
  NEWS_PRODUCER_APPROVAL_LABELS,
  NEWS_PRODUCER_KIND_LABELS,
  NEWS_PRODUCER_SECTION_KINDS,
  NEWS_PRODUCER_SECTION_LABELS,
  NEWS_PRODUCER_SECTIONS,
  type NewsProducerActionId,
  type NewsProducerKind,
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
  type ApproveProducerActionData,
} from "@/features/ai-news-producer/actions/producer.actions";
import { ProducerMediaGeneratePanel } from "@/features/ai-news-producer/components/producer-media-generate-panel";
import type { NewsProducerOutput } from "@/features/ai-news-producer/types/producer.types";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import { SubHeadlineSlotsEditor } from "@/features/story-production/components/form/sub-headline-slots-editor";
import {
  joinSubHeadlineSlots,
  parseSubHeadlineMedia,
  parseSubHeadlineSlots,
  type SubHeadlineMediaRef,
} from "@/features/story-production/lib/sub-headlines";
import { cn } from "@/lib/utils";

const MediaOSEditor = dynamic(
  () =>
    import("@/features/smart-editor/components/mediaos-editor").then(
      (m) => m.MediaOSEditor,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />,
  },
);

const StoryMediaPanel = dynamic(
  () =>
    import("@/features/media/components/story-media-panel").then(
      (m) => m.StoryMediaPanel,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />,
  },
);

type AppliedScriptPatch = NonNullable<
  ApproveProducerActionData["applied"]
>["script"];

type AiNewsProducerTabProps = {
  story: StoryWithRelations;
  initialSection?: NewsProducerSection;
  onStoryUpdated?: (story: StoryWithRelations) => void;
  onScriptApplied?: (script: NonNullable<AppliedScriptPatch>) => void;
};

function plainToEditorHtml(plain: string): string {
  const escaped = plain
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const blocks = escaped
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "<p></p>";
  return blocks
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function usesManglishEditor(kind: NewsProducerKind): boolean {
  return kind !== "summary";
}

export function AiNewsProducerTab({
  story,
  initialSection = "research",
  onStoryUpdated,
  onScriptApplied,
}: AiNewsProducerTabProps) {
  const [section, setSection] = useState<NewsProducerSection>(initialSection);
  const [outputs, setOutputs] = useState<NewsProducerOutput[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getNewsProducerBundleAction(story.id);
      if (!result.success) {
        setLoadError(result.error);
        return;
      }
      setLoadError(null);
      setOutputs(result.data.outputs);
    });
  }, [story.id]);

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

  function applyApprovedResult(result: ApproveProducerActionData) {
    upsertOutputs([result]);
    if (result.applied?.story) {
      onStoryUpdated?.(result.applied.story as StoryWithRelations);
    }
    if (result.applied?.script) {
      onScriptApplied?.(result.applied.script);
    }
  }

  function runAction(actionId: NewsProducerActionId) {
    startTransition(async () => {
      const result = await runNewsProducerAction(story.id, actionId);
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
          “{story.title}” — research, copy, script (Manglish), media, and
          publishing packages. Edit mode uses the updated Manglish typing
          engine.
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
              id === "media" ? (
                <div className="space-y-4">
                  <ProducerMediaGeneratePanel storyId={story.id} />
                  <StoryMediaPanel story={story} />
                </div>
              ) : (
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
                          storyId={story.id}
                          organizationId={story.organization_id}
                          pending={pending}
                          editing={editingId === output.id}
                          draft={draft}
                          onBeginEdit={() => {
                            setEditingId(output.id);
                            setDraft(output.producer.body);
                          }}
                          onCancelEdit={() => setEditingId(null)}
                          onDraftChange={setDraft}
                          onPatched={(next) => {
                            if ("applied" in next) {
                              applyApprovedResult(
                                next as ApproveProducerActionData,
                              );
                            } else {
                              upsertOutputs([next]);
                            }
                          }}
                          startTransition={startTransition}
                        />
                      ))}
                    </ul>
                  )}
                </>
              )
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
  organizationId,
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
  organizationId: string;
  pending: boolean;
  editing: boolean;
  draft: string;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onDraftChange: (value: string) => void;
  onPatched: (output: NewsProducerOutput | ApproveProducerActionData) => void;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const waiting = output.producer.approvalStatus === "waiting_for_approval";
  const ai = output.producer.ai;
  const isSubHeadlines = output.producer.kind === "summary";
  const manglishEdit = usesManglishEditor(output.producer.kind);

  const [slotTexts, setSlotTexts] = useState(() =>
    parseSubHeadlineSlots(output.producer.body),
  );
  const [slotMedia, setSlotMedia] = useState<SubHeadlineMediaRef[]>(() =>
    parseSubHeadlineMedia(output.producer.subHeadlineMedia),
  );
  const [slotsDirty, setSlotsDirty] = useState(false);

  useEffect(() => {
    if (slotsDirty) return;
    setSlotTexts(parseSubHeadlineSlots(output.producer.body));
    setSlotMedia(parseSubHeadlineMedia(output.producer.subHeadlineMedia));
  }, [
    output.id,
    output.version,
    output.producer.body,
    output.producer.subHeadlineMedia,
    slotsDirty,
  ]);

  async function persistSubHeadlineSlots() {
    const result = await updateNewsProducerOutputAction({
      outputId: output.id,
      storyId,
      body: joinSubHeadlineSlots(slotTexts),
      subHeadlineMedia: slotMedia,
    });
    if (!result.success) {
      toast.error(result.error);
      return null;
    }
    onPatched(result.data);
    setSlotsDirty(false);
    return result.data;
  }

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
                if (isSubHeadlines && slotsDirty) {
                  const saved = await persistSubHeadlineSlots();
                  if (!saved) return;
                }
                const result = await approveNewsProducerOutputAction(
                  output.id,
                  storyId,
                );
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                onPatched(result.data);
                if (result.data.producer.kind === "tv_script") {
                  toast.success("Story script approved");
                } else if (result.data.producer.kind === "summary") {
                  toast.success("Sub headlines & media applied to story");
                } else {
                  toast.success("Approved");
                }
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

      {isSubHeadlines ? (
        <div className="mt-3 space-y-2">
          <SubHeadlineSlotsEditor
            texts={slotTexts}
            media={slotMedia}
            organizationId={organizationId}
            storyId={storyId}
            disabled={pending}
            onTextsChange={(texts) => {
              setSlotTexts(texts);
              setSlotsDirty(true);
            }}
            onMediaChange={(media) => {
              setSlotMedia(media);
              setSlotsDirty(true);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || !slotsDirty}
              onClick={() =>
                startTransition(async () => {
                  const saved = await persistSubHeadlineSlots();
                  if (saved) toast.success("Sub headlines & media saved");
                })
              }
            >
              Save media & text
            </Button>
            {slotsDirty ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setSlotTexts(parseSubHeadlineSlots(output.producer.body));
                  setSlotMedia(
                    parseSubHeadlineMedia(output.producer.subHeadlineMedia),
                  );
                  setSlotsDirty(false);
                }}
              >
                Discard
              </Button>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Pick Image / Video / Caption on each slot, then Browse or
                Generate.
              </p>
            )}
          </div>
        </div>
      ) : editing ? (
        <div className="mt-3 space-y-2">
          {manglishEdit ? (
            <MediaOSEditor
              key={`edit-${output.id}-${output.version}`}
              variant="compact"
              storyId={storyId}
              initialHtml={plainToEditorHtml(draft)}
              initialLanguage="ml"
              placeholder="Edit with Manglish typing…"
              settings={{
                toolbarLayout: "compact",
                enableManglish: true,
                enableVoiceDictation: true,
                enableHandwriting: false,
                autoSave: false,
                autoTransliteration: true,
                newsroomFormat:
                  output.producer.kind === "tv_script"
                    ? "tv_script"
                    : "website_article",
              }}
              onChange={(payload) => onDraftChange(payload.contentPlain)}
            />
          ) : (
            <Input
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
            />
          )}
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
        {!editing && !isSubHeadlines ? (
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
              setSlotsDirty(false);
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
              await navigator.clipboard.writeText(
                isSubHeadlines
                  ? joinSubHeadlineSlots(slotTexts)
                  : output.producer.body,
              );
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
              if (isSubHeadlines && slotsDirty) {
                const saved = await persistSubHeadlineSlots();
                if (!saved) return;
              }
              const result = await saveNewsProducerContentObjectAction(
                output.id,
                storyId,
              );
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              onPatched(result.data);
              toast.success("Saved and applied");
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
