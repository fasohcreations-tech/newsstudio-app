"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildStoryScenesAction,
  getStoryPackageAction,
  listStoryMasterTemplatesAction,
  relinkStorySceneInstanceTemplateAction,
  syncStoryScenesFromPanelsAction,
} from "@/features/story-scene-builder/actions/scene-builder.actions";
import {
  DEFAULT_MASTER_TEMPLATE_CODE,
  type StoryMasterTemplateOption,
} from "@/features/story-scene-builder/lib/find-master-template";
import { buildMotionSceneEditorHref } from "@/features/motion-scene-engine/lib/motion-scene-navigation";
import type {
  StoryPackageBundle,
  StoryPackageStatus,
} from "@/features/story-scene-builder/types/scene-builder.types";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import type { StoryVoiceStatus } from "@/shared/types/database.types";
import { cn } from "@/lib/utils";

type StorySceneLibraryTabProps = {
  story: StoryWithRelations;
  disabled?: boolean;
  onOpenVoice?: () => void;
  onOpenScript?: () => void;
};

const PACKAGE_STATUS_LABELS: Record<StoryPackageStatus, string> = {
  draft: "Draft",
  building: "Building",
  ready: "Ready",
  failed: "Failed",
  archived: "Archived",
};

function formatMs(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function templateLabel(template: StoryMasterTemplateOption): string {
  const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    template.name.trim(),
  );
  const displayName = isUuidLike
    ? `Template ${template.id.slice(0, 8)}`
    : template.name;
  const code = template.packageCode?.trim();
  return code ? `${displayName} · ${code}` : displayName;
}

function templateFallbackLabelById(id: string): string {
  return `Template ${id.slice(0, 8)}`;
}

function pickDefaultTemplateId(
  templates: StoryMasterTemplateOption[],
  preferredId?: string | null,
  preferredCode?: string | null,
): string {
  if (preferredId && templates.some((t) => t.id === preferredId)) {
    return preferredId;
  }
  const code = preferredCode ?? DEFAULT_MASTER_TEMPLATE_CODE;
  const byCode = templates.find((t) => t.packageCode === code);
  if (byCode) return byCode.id;
  return templates[0]?.id ?? "";
}

export function StorySceneLibraryTab({
  story,
  disabled,
  onOpenVoice,
  onOpenScript,
}: StorySceneLibraryTabProps) {
  const [bundle, setBundle] = useState<StoryPackageBundle | null>(null);
  const [templates, setTemplates] = useState<StoryMasterTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [relinkingId, setRelinkingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const approved = Boolean(story.approved_script?.trim());
  const voiceStatus = (story.voice_status ?? "none") as StoryVoiceStatus;
  const voiceReady = voiceStatus === "ready";

  const templateById = useMemo(
    () => new Map(templates.map((t) => [t.id, t])),
    [templates],
  );

  const selectedTemplate = selectedTemplateId
    ? templateById.get(selectedTemplateId)
    : undefined;

  const refresh = useCallback(async () => {
    setLoading(true);
    const [packageResult, templatesResult] = await Promise.all([
      getStoryPackageAction(story.id),
      listStoryMasterTemplatesAction(story.id),
    ]);

    if (!packageResult.success) {
      toast.error(packageResult.error);
      setBundle(null);
    } else {
      setBundle(packageResult.data);
    }

    if (!templatesResult.success) {
      toast.error(templatesResult.error);
      setTemplates([]);
    } else {
      setTemplates(templatesResult.data);
      setSelectedTemplateId((current) => {
        if (current && templatesResult.data.some((t) => t.id === current)) {
          return current;
        }
        return pickDefaultTemplateId(
          templatesResult.data,
          packageResult.success ? packageResult.data?.package.master_template_id : null,
          packageResult.success
            ? packageResult.data?.package.master_template_code
            : null,
        );
      });
    }
    setLoading(false);
  }, [story.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const build = () => {
    if (!selectedTemplateId) {
      toast.error("Choose a Master Template from the library first.");
      return;
    }
    startTransition(async () => {
      const result = await buildStoryScenesAction({
        storyId: story.id,
        masterTemplateId: selectedTemplateId,
        masterTemplateCode: selectedTemplate?.packageCode ?? undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setBundle({
        package: result.data.package,
        voiceSegments: result.data.voiceSegments,
        scenes: result.data.scenes,
      });
      setExpanded(true);
      const label =
        selectedTemplate?.packageCode ??
        result.data.package.master_template_code ??
        "template";
      toast.success(
        `Built ${result.data.scenes.length} scene instance${result.data.scenes.length === 1 ? "" : "s"} from ${label}`,
      );
    });
  };

  const syncPanels = () => {
    startTransition(async () => {
      const result = await syncStoryScenesFromPanelsAction(story.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      await refresh();
      toast.success(
        `Synced ${result.data.updatedCount} scene${result.data.updatedCount === 1 ? "" : "s"} from Story Panels`,
      );
    });
  };

  const relinkScene = (sceneInstanceId: string, masterTemplateId: string) => {
    setRelinkingId(sceneInstanceId);
    startTransition(async () => {
      const result = await relinkStorySceneInstanceTemplateAction({
        sceneInstanceId,
        masterTemplateId,
      });
      setRelinkingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      await refresh();
      const label = templateById.get(masterTemplateId)?.name ?? "template";
      toast.success(`Scene linked to ${label}`);
    });
  };

  const pkg = bundle?.package ?? null;
  const scenes = bundle?.scenes ?? [];
  const pkgTemplate =
    (pkg?.master_template_id && templateById.get(pkg.master_template_id)) ||
    null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Scene Library</h2>
        <p className="text-sm text-muted-foreground">
          Link each Story Panel to an editable scene clone from a Master
          Template in the library. Panel Subheadline becomes the on-screen
          headline; panel media fills the Main Media Container.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Clapperboard className="size-4" />
            Prerequisites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={approved ? "default" : "outline"}>
              {approved ? "Script approved" : "Script pending"}
            </Badge>
            <Badge variant={voiceReady ? "default" : "secondary"}>
              Voice · {voiceStatus}
            </Badge>
            {!approved ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={onOpenScript}
              >
                Open script
              </Button>
            ) : null}
            {approved && !voiceReady ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={onOpenVoice}
              >
                Generate voice
              </Button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Master Template (library)
            </Label>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading templates…"
                  : "No templates in the library yet. Open Creative Studio → Scenes to seed masters."}
              </p>
            ) : (
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
                disabled={disabled || pending || loading}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {templateLabel(template)}
                    </SelectItem>
                  ))}
                  {selectedTemplateId &&
                  !templates.some((template) => template.id === selectedTemplateId) ? (
                    <SelectItem value={selectedTemplateId}>
                      {templateFallbackLabelById(selectedTemplateId)}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            )}
            {selectedTemplate ? (
              <p className="text-xs text-muted-foreground">
                {selectedTemplate.description?.trim() ||
                  `${selectedTemplate.aspectFormat} · ${formatMs(selectedTemplate.durationMs)} default`}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={build}
          disabled={
            disabled || !approved || pending || !selectedTemplateId || loading
          }
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {pkg ? "Rebuild Scene Collection" : "Build Scene Collection"}
        </Button>
        {pkg ? (
          <Button
            type="button"
            variant="secondary"
            onClick={syncPanels}
            disabled={disabled || !approved || pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sync from Story Panels
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading || pending}
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/creative-studio/scenes" />}
        >
          Master Template Library
        </Button>
      </div>
      {pkg ? (
        <p className="text-xs text-muted-foreground">
          After changing Sub Headline media, click{" "}
          <span className="font-medium text-foreground">Sync from Story Panels</span>{" "}
          (or Rebuild) so Scene 01…N pick up the new media and headlines.
        </p>
      ) : null}

      {pkg?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {pkg.error}
        </p>
      ) : null}

      {loading && !pkg ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading story package…
          </CardContent>
        </Card>
      ) : null}

      {!loading && !pkg ? (
        <Card className="border-dashed">
          <CardContent className="space-y-2 py-10 text-center">
            <p className="font-medium">No Story Package yet</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              After the script is approved, pick a Master Template and build a
              Scene Collection. Each scene is an editable clone — the library
              master is never modified.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {pkg ? (
        <Card>
          <button
            type="button"
            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{pkg.title}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {PACKAGE_STATUS_LABELS[pkg.status]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {pkgTemplate
                    ? templateLabel(pkgTemplate)
                    : pkg.master_template_code ?? DEFAULT_MASTER_TEMPLATE_CODE}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {pkg.scene_count} scene{pkg.scene_count === 1 ? "" : "s"} ·{" "}
                {formatMs(pkg.total_duration_ms)} total · voice{" "}
                {formatMs(pkg.voice_duration_ms)}
              </p>
            </div>
          </button>

          {expanded ? (
            <CardContent className="space-y-1 border-t pt-3">
              {scenes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Package has no scenes. Rebuild the collection.
                </p>
              ) : (
                scenes.map((scene, index) => {
                  const href = buildMotionSceneEditorHref(scene.scene_id);
                  const order = String(index + 1).padStart(2, "0");
                  const linkedTemplate =
                    templateById.get(scene.master_template_id) ?? null;
                  const isRelinking = relinkingId === scene.id;

                  return (
                    <div
                      key={scene.id}
                      className="flex flex-col gap-2 rounded-md border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/50 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                          Scene {order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {scene.headline || scene.name || `Scene ${order}`}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {typeof scene.metadata?.story_headline === "string"
                              ? `Story · ${scene.metadata.story_headline}`
                              : scene.subheadline || "—"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatMs(scene.duration_ms)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {templates.length > 0 ? (
                          <Select
                            value={scene.master_template_id}
                            onValueChange={(value) =>
                              relinkScene(scene.id, value)
                            }
                            disabled={
                              disabled || pending || isRelinking || loading
                            }
                          >
                            <SelectTrigger className="h-8 w-[min(100%,14rem)] text-xs">
                              {isRelinking ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <SelectValue
                                  placeholder={
                                    linkedTemplate
                                      ? templateLabel(linkedTemplate)
                                      : "Link template"
                                  }
                                />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((template) => (
                                <SelectItem
                                  key={template.id}
                                  value={template.id}
                                >
                                  {templateLabel(template)}
                                </SelectItem>
                              ))}
                              {!templates.some(
                                (template) =>
                                  template.id === scene.master_template_id,
                              ) ? (
                                <SelectItem value={scene.master_template_id}>
                                  {templateFallbackLabelById(
                                    scene.master_template_id,
                                  )}
                                </SelectItem>
                              ) : null}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {String(
                              scene.metadata?.master_template_code ??
                                pkg.master_template_code ??
                                "—",
                            )}
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          nativeButton={false}
                          render={<Link href={href} />}
                        >
                          Edit
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
              <p className="pt-2 text-[11px] text-muted-foreground">
                Change a scene&apos;s template to re-clone from another library
                master (panel data is preserved). Edit opens Scene Composer for
                that instance only.
              </p>
            </CardContent>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
