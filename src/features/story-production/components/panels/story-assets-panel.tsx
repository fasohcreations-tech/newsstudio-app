"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Film,
  FolderOpen,
  Image,
  Mic,
  Music,
  Stamp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComposerMediaPicker } from "@/features/story-production/components/panels/composer-media-picker";
import {
  DEMO_STORY_ASSETS,
  STORY_ASSET_CATEGORIES,
} from "@/features/story-production/constants/demo-assets.constants";
import { importUrlToMediaLibrary } from "@/features/story-production/lib/import-media-to-library";
import {
  MEDIA_TARGET_OPTIONS,
  defaultTargetForAssetCategory,
  resolveApplyFieldForTarget,
  type StoryMediaTarget,
} from "@/features/story-production/lib/resolve-media-target";
import type {
  StoryAssetCategory,
  StoryAssetItem,
  StoryDataRecord,
} from "@/features/story-production/types/story-data.types";

const CATEGORY_ICONS: Record<StoryAssetCategory, React.ReactNode> = {
  videos: <Film className="size-4" />,
  images: <Image className="size-4" />,
  voice_over: <Mic className="size-4" />,
  music: <Music className="size-4" />,
  logos: <Stamp className="size-4" />,
  documents: <FileText className="size-4" />,
};

type StoryAssetsPanelProps = {
  onApplyMedia: (field: keyof StoryDataRecord, url: string) => void;
  data: StoryDataRecord;
  activeTarget: StoryMediaTarget | null;
  onActiveTargetChange: (target: StoryMediaTarget) => void;
  organizationId?: string | null;
  browseRequestKey?: number;
  browseRequestTarget?: StoryMediaTarget | null;
};

/**
 * Left-rail media browser for Scene Composer.
 * Applies media to the active placeholder / Story field.
 */
export function StoryAssetsPanel({
  onApplyMedia,
  data,
  activeTarget,
  onActiveTargetChange,
  organizationId,
  browseRequestKey = 0,
  browseRequestTarget = null,
}: StoryAssetsPanelProps) {
  const [category, setCategory] = useState<StoryAssetCategory>("videos");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const target = activeTarget ?? defaultTargetForAssetCategory(category);
  const appendOnPick = target.field === "optional_info_image";
  const currentValue =
    typeof data[target.field] === "string" ? String(data[target.field]) : "";

  function mergeForTarget(nextValue: string): string {
    if (!appendOnPick) return nextValue;
    const parts = currentValue
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.includes(nextValue)) return currentValue;
    return [...parts, nextValue].join(",");
  }

  const assets = useMemo(
    () => DEMO_STORY_ASSETS.filter((item) => item.category === category),
    [category],
  );

  useEffect(() => {
    if (!browseRequestKey || !browseRequestTarget) return;
    onActiveTargetChange(browseRequestTarget);
    setPickerOpen(true);
  }, [browseRequestKey, browseRequestTarget, onActiveTargetChange]);

  async function applyAsset(asset: StoryAssetItem) {
    if (asset.url === "#") {
      toast.error("This demo item has no file");
      return;
    }

    if (!organizationId) {
      toast.error("Sign in to an organization to assign media from the library.");
      return;
    }

    setImportingId(asset.id);
    try {
      const { ref, error } = await importUrlToMediaLibrary({
        organizationId,
        url: asset.url,
        name: asset.label,
      });

      if (error || !ref) {
        toast.error(error ?? "Unable to add to library");
        return;
      }

      const field = resolveApplyFieldForTarget(target, asset.mimeType, asset.url);
      onApplyMedia(field, mergeForTarget(ref));
      toast.success(`Assigned to ${target.label}`);
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-border/60 p-4">
        <p className="text-[18px] font-semibold tracking-tight">Media Browser</p>
        <p className="text-[14px] text-muted-foreground">
          Select a placeholder, then pick media — or click Browse on empty slots.
        </p>

        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-muted-foreground">
            Assign to
          </p>
          <Select
            value={target.bindingKey}
            onValueChange={(value) => {
              const next = MEDIA_TARGET_OPTIONS.find(
                (item) => item.bindingKey === value,
              );
              if (next) onActiveTargetChange(next);
            }}
          >
            <SelectTrigger className="h-9 text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDIA_TARGET_OPTIONS.map((item) => (
                <SelectItem key={item.bindingKey} value={item.bindingKey}>
                  {item.label} · {`{{${item.bindingKey}}}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          className="h-9 w-full text-[15px]"
          onClick={() => setPickerOpen(true)}
        >
          <FolderOpen className="mr-1.5 size-4" />
          Browse Media
        </Button>

        <div className="flex flex-wrap gap-1.5">
          {STORY_ASSET_CATEGORIES.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={category === item.id ? "secondary" : "ghost"}
              className="h-9 gap-1.5 px-3 text-[14px]"
              onClick={() => setCategory(item.id)}
            >
              {CATEGORY_ICONS[item.id]}
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className="flex w-full gap-3 rounded-xl border border-border/60 p-3 text-left hover:bg-muted/40"
              onClick={() => void applyAsset(asset)}
              disabled={importingId === asset.id}
            >
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {asset.mimeType?.startsWith("video/") ? (
                  <Film className="size-6 text-muted-foreground" />
                ) : asset.mimeType?.startsWith("image/") &&
                  asset.url !== "#" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  CATEGORY_ICONS[asset.category]
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{asset.label}</p>
                <p className="text-[13px] text-muted-foreground">
                  Click to assign → {target.label}
                </p>
                <Badge variant="outline" className="mt-1.5 text-[11px]">
                  Demo
                </Badge>
              </div>
            </button>
          ))}
          {assets.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-muted-foreground">
              No demo assets in this category.
            </p>
          ) : null}
        </div>
      </ScrollArea>

      <ComposerMediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        target={target}
        organizationId={organizationId}
        onPick={(url) => {
          const field = resolveApplyFieldForTarget(target, undefined, url);
          onApplyMedia(field, mergeForTarget(url));
        }}
        appendOnPick={appendOnPick}
      />
    </div>
  );
}
