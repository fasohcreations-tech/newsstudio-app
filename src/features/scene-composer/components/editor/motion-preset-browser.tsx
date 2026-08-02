"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Pencil,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import {
  MOTION_PRESET_CATEGORIES,
  getCategoryLabel,
  listPresetsByCategory,
  searchPresets,
} from "@/features/scene-composer/lib/motion-presets";
import type {
  MotionPreset,
  MotionPresetCategoryId,
} from "@/features/scene-composer/lib/motion-presets";

type MotionPresetBrowserProps = {
  catalog: MotionPreset[];
  favorites: string[];
  selectedPresetId?: string | null;
  canApply: boolean;
  onApply: (preset: MotionPreset) => void;
  onToggleFavorite: (presetId: string) => void;
  onDuplicate: (preset: MotionPreset) => void;
  onEditCustom: (preset: MotionPreset) => void;
  onDeleteCustom: (presetId: string) => void;
};

function PresetGlyph({ icon }: { icon: string }) {
  const letter = (icon || "P").slice(0, 1).toUpperCase();
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold uppercase text-muted-foreground">
      {letter}
    </span>
  );
}

/**
 * Searchable Motion Preset Browser — catalog cards, no Scene Composer redesign.
 */
export function MotionPresetBrowser({
  catalog,
  favorites,
  selectedPresetId,
  canApply,
  onApply,
  onToggleFavorite,
  onDuplicate,
  onEditCustom,
  onDeleteCustom,
}: MotionPresetBrowserProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MotionPresetCategoryId | "all" | "favorites">(
    "all",
  );

  const filtered = useMemo(() => {
    let list = catalog;
    if (category === "favorites") {
      list = catalog.filter((preset) => favorites.includes(preset.id));
    } else {
      list = listPresetsByCategory(
        catalog,
        category === "all" ? "all" : category,
      );
    }
    return searchPresets(list, query);
  }, [catalog, category, favorites, query]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search presets, tags…"
            className={`${EDITOR_UI.input} h-8 pl-7`}
          />
        </div>
        <Select
          value={category}
          onValueChange={(value) =>
            setCategory((value as typeof category) ?? "all")
          }
        >
          <SelectTrigger className={`${EDITOR_UI.input} h-8 w-[180px]`}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All folders</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            {MOTION_PRESET_CATEGORIES.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((preset) => {
            const favorite = favorites.includes(preset.id);
            const selected = selectedPresetId === preset.id;
            return (
              <div
                key={preset.id}
                className={`flex items-start gap-2 rounded-md border px-2 py-2 ${
                  selected
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/60 bg-background/60 hover:bg-muted/40"
                }`}
              >
                <PresetGlyph icon={preset.icon} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => canApply && onApply(preset)}
                      disabled={!canApply}
                      title={
                        canApply
                          ? `Apply ${preset.name}`
                          : "Select a layer to apply"
                      }
                    >
                      <p className={`${EDITOR_UI.timeline} truncate font-medium`}>
                        {preset.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {getCategoryLabel(preset.category)} · {preset.durationMs}ms
                        {!preset.builtin ? " · custom" : ""}
                      </p>
                    </button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-7 shrink-0"
                      onClick={() => onToggleFavorite(preset.id)}
                      title={favorite ? "Unfavorite" : "Favorite"}
                    >
                      <Star
                        className={`size-3.5 ${
                          favorite ? "fill-amber-400 text-amber-400" : ""
                        }`}
                      />
                    </Button>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                    {preset.tags.slice(0, 4).join(" · ")}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-6 px-2 text-[10px]"
                      disabled={!canApply}
                      onClick={() => onApply(preset)}
                    >
                      Apply
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-6"
                      title="Duplicate"
                      onClick={() => onDuplicate(preset)}
                    >
                      <Copy className="size-3" />
                    </Button>
                    {!preset.builtin ? (
                      <>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="size-6"
                          title="Edit"
                          onClick={() => onEditCustom(preset)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="size-6"
                          title="Delete custom"
                          onClick={() => onDeleteCustom(preset.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 ? (
          <p className={`${EDITOR_UI.helper} py-6 text-center`}>
            No presets match this search.
          </p>
        ) : null}
      </div>
    </div>
  );
}
