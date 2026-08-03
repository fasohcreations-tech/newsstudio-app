"use client";

import { useMemo, useState, useTransition } from "react";
import { FolderOpen, ImageIcon, Loader2, Sparkles, Trash2, Type, Video } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateProducerMediaAction } from "@/features/ai-news-producer/actions/producer-media.actions";
import { ManglishLineInput } from "@/features/smart-editor/components/manglish-line-input";
import { SubHeadlineMediaThumb } from "@/features/story-production/components/form/sub-headline-media-thumb";
import { ComposerMediaPicker } from "@/features/story-production/components/panels/composer-media-picker";
import { toLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import type { StoryMediaTarget } from "@/features/story-production/lib/resolve-media-target";
import {
  emptySubHeadlineMediaRef,
  SUB_HEADLINE_MAX_CHARS,
  SUB_HEADLINE_SLOT_COUNT,
  type SubHeadlineMediaKind,
  type SubHeadlineMediaRef,
} from "@/features/story-production/lib/sub-headlines";
import { cn } from "@/lib/utils";

type SubHeadlineSlotsEditorProps = {
  texts: string[];
  media: SubHeadlineMediaRef[];
  organizationId?: string | null;
  storyId?: string | null;
  disabled?: boolean;
  onTextsChange: (texts: string[]) => void;
  onMediaChange: (media: SubHeadlineMediaRef[]) => void;
};

function mediaTargetForSlot(
  index: number,
  kind: SubHeadlineMediaKind | "",
): StoryMediaTarget {
  const field = `sub_headline_${index + 1}_media` as StoryMediaTarget["field"];
  if (kind === "video") {
    return {
      field,
      bindingKey: field,
      label: `Sub Headline ${index + 1} Video`,
      kind: "video",
      accept: "video/*",
    };
  }
  return {
    field,
    bindingKey: field,
    label: `Sub Headline ${index + 1} Image`,
    kind: "image",
    accept: "image/*",
  };
}

function shortRefLabel(ref: string): string {
  if (!ref) return "No media linked";
  if (ref.startsWith("library://")) {
    return `Library · ${ref.slice("library://".length, "library://".length + 8)}…`;
  }
  try {
    const url = new URL(ref);
    return url.pathname.split("/").filter(Boolean).pop() || url.host;
  } catch {
    return ref.slice(0, 36);
  }
}

/**
 * Four Sub Headline slots with Manglish text + image/video/caption media refs
 * for later scene building.
 */
export function SubHeadlineSlotsEditor({
  texts,
  media,
  organizationId,
  storyId,
  disabled,
  onTextsChange,
  onMediaChange,
}: SubHeadlineSlotsEditorProps) {
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const paddedTexts = useMemo(() => {
    const next = [...texts];
    while (next.length < SUB_HEADLINE_SLOT_COUNT) next.push("");
    return next.slice(0, SUB_HEADLINE_SLOT_COUNT);
  }, [texts]);

  const paddedMedia = useMemo(() => {
    const next = [...media];
    while (next.length < SUB_HEADLINE_SLOT_COUNT) {
      next.push(emptySubHeadlineMediaRef());
    }
    return next.slice(0, SUB_HEADLINE_SLOT_COUNT);
  }, [media]);

  function patchText(index: number, value: string) {
    const next = [...paddedTexts];
    next[index] = value.slice(0, SUB_HEADLINE_MAX_CHARS);
    onTextsChange(next);
  }

  function patchMedia(index: number, patch: Partial<SubHeadlineMediaRef>) {
    const next = paddedMedia.map((slot, i) =>
      i === index ? { ...slot, ...patch } : slot,
    );
    onMediaChange(next);
  }

  function clearMedia(index: number) {
    patchMedia(index, emptySubHeadlineMediaRef());
  }

  function generateForSlot(index: number) {
    if (!storyId) {
      toast.error("Save the story before generating media.");
      return;
    }
    const line = paddedTexts[index]?.trim();

    setPendingSlot(index);
    startTransition(async () => {
      const result = await generateProducerMediaAction({
        storyId,
        promptId: "media.sub_headline_image",
        promptVariables: {
          slot: String(index + 1),
          line:
            line ||
            `Broadcast lower-third still for a Malayalam news package, slot ${index + 1}`,
        },
        kind: "image",
      });
      setPendingSlot(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      patchMedia(index, {
        kind: "image",
        ref: toLibraryMediaRef(result.data.assetId),
      });
      toast.success(
        `Image linked · ${result.data.tokensUsed} tokens ($${result.data.estimatedCost.toFixed(4)})`,
      );
    });
  }

  const activeTarget =
    pickerSlot == null
      ? null
      : mediaTargetForSlot(pickerSlot, paddedMedia[pickerSlot]?.kind ?? "image");

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Each Sub Headline can link an image, video, or caption for scene
        building. Browse the library or generate an AI image (uses tokens).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: SUB_HEADLINE_SLOT_COUNT }, (_, index) => {
          const slotMedia = paddedMedia[index] ?? emptySubHeadlineMediaRef();
          const generating = pending && pendingSlot === index;
          return (
            <div
              key={index}
              className={cn(
                "space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`sub-headline-slot-${index}`}>
                  Sub Headline {index + 1}
                </Label>
                {slotMedia.kind ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {slotMedia.kind}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    No media
                  </Badge>
                )}
              </div>

              <ManglishLineInput
                id={`sub-headline-slot-${index}`}
                value={paddedTexts[index] ?? ""}
                maxLength={SUB_HEADLINE_MAX_CHARS}
                placeholder="Type Manglish for Malayalam…"
                disabled={disabled}
                onChange={(value) => patchText(index, value)}
              />

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  Media reference
                </Label>
                <Select
                  value={slotMedia.kind || "none"}
                  disabled={disabled || generating}
                  onValueChange={(value: string | null) => {
                    if (!value || value === "none") {
                      clearMedia(index);
                      return;
                    }
                    patchMedia(index, {
                      kind: value as SubHeadlineMediaKind,
                      ref:
                        value === "caption" ? "" : slotMedia.ref,
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Media type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="caption">Caption</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {slotMedia.kind === "caption" ? (
                <div className="space-y-2">
                  <SubHeadlineMediaThumb
                    kind="caption"
                    mediaRef=""
                    caption={slotMedia.caption}
                  />
                  <ManglishLineInput
                    value={slotMedia.caption}
                    maxLength={120}
                    placeholder="Caption text (Manglish)…"
                    disabled={disabled}
                    onChange={(value) => patchMedia(index, { caption: value })}
                  />
                </div>
              ) : null}

              {slotMedia.kind === "image" || slotMedia.kind === "video" ? (
                <div className="space-y-2">
                  <SubHeadlineMediaThumb
                    kind={slotMedia.kind}
                    mediaRef={slotMedia.ref}
                    caption={slotMedia.caption}
                  />
                  <p className="truncate text-[11px] text-muted-foreground">
                    {shortRefLabel(slotMedia.ref)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={disabled || generating}
                      onClick={() => setPickerSlot(index)}
                    >
                      <FolderOpen className="size-3.5" />
                      Browse
                    </Button>
                    {slotMedia.kind === "image" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={disabled || generating || !storyId}
                        onClick={() => generateForSlot(index)}
                      >
                        {generating ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        Generate
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled
                        title="AI video pipeline ships next — browse/upload for now"
                      >
                        <Video className="size-3.5" />
                        Generate
                      </Button>
                    )}
                    {slotMedia.ref ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={disabled || generating}
                        onClick={() => clearMedia(index)}
                      >
                        <Trash2 className="size-3.5" />
                        Clear
                      </Button>
                    ) : null}
                  </div>
                  <ManglishLineInput
                    value={slotMedia.caption}
                    maxLength={120}
                    placeholder="Optional overlay caption…"
                    disabled={disabled}
                    onChange={(value) => patchMedia(index, { caption: value })}
                  />
                </div>
              ) : null}

              {!slotMedia.kind ? (
                <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="size-3" /> Image
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Video className="size-3" /> Video
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Type className="size-3" /> Caption
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {activeTarget && pickerSlot != null ? (
        <ComposerMediaPicker
          open={pickerSlot != null}
          onOpenChange={(open) => {
            if (!open) setPickerSlot(null);
          }}
          target={activeTarget}
          organizationId={organizationId}
          onPick={(url) => {
            const kind =
              paddedMedia[pickerSlot]?.kind === "video" ? "video" : "image";
            patchMedia(pickerSlot, { kind, ref: url });
            setPickerSlot(null);
            toast.success(`Media linked to Sub Headline ${pickerSlot + 1}`);
          }}
        />
      ) : null}
    </div>
  );
}
