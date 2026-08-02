"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Library } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import { MotionPresetBrowser } from "@/features/scene-composer/components/editor/motion-preset-browser";
import {
  applyMotionPresetToObject,
  useMotionPresetLibrary,
} from "@/features/scene-composer/lib/motion-presets";
import type { MotionPreset } from "@/features/scene-composer/lib/motion-presets";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import { usePersistedState } from "@/features/platform/hooks/use-persisted-state";

type MotionPresetDrawerProps = {
  selectedObject: SceneObject | null;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
  onApplied?: (preset: MotionPreset) => void;
};

/**
 * Collapsible Motion Preset Library drawer above the timeline.
 */
export function MotionPresetDrawer({
  selectedObject,
  onObjectPatch,
  onApplied,
}: MotionPresetDrawerProps) {
  const [open, setOpen] = usePersistedState(
    "mediaos.composer.motion-preset-drawer-open",
    true,
  );
  const library = useMotionPresetLibrary();
  const [editPreset, setEditPreset] = useState<MotionPreset | null>(null);
  const [editName, setEditName] = useState("");

  const apply = (preset: MotionPreset) => {
    if (!selectedObject || selectedObject.locked) return;
    const next = applyMotionPresetToObject(selectedObject, preset);
    onObjectPatch(selectedObject.id, {
      metadata: next.metadata,
    });
    onApplied?.(preset);
  };

  return (
    <div className="shrink-0 border-b border-border/60 bg-card">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Library className="size-3.5 text-muted-foreground" />
        <p className={EDITOR_UI.sectionHeader}>Motion Presets</p>
        <span className="text-[11px] text-muted-foreground">
          {library.catalog.length} presets
          {selectedObject ? ` · ${selectedObject.name}` : " · select a layer"}
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="ml-auto size-7"
          onClick={() => setOpen(!open)}
          title={open ? "Collapse preset library" : "Expand preset library"}
        >
          {open ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronUp className="size-3.5" />
          )}
        </Button>
      </div>

      {open ? (
        <div className="h-[148px] border-t border-border/40 px-3 py-2">
          <MotionPresetBrowser
            catalog={library.catalog}
            favorites={library.favorites}
            selectedPresetId={
              typeof selectedObject?.metadata?.motion_preset_id === "string"
                ? selectedObject.metadata.motion_preset_id
                : null
            }
            canApply={Boolean(selectedObject && !selectedObject.locked)}
            onApply={apply}
            onToggleFavorite={library.toggleFavorite}
            onDuplicate={(preset) => library.duplicate(preset)}
            onEditCustom={(preset) => {
              setEditPreset(preset);
              setEditName(preset.name);
            }}
            onDeleteCustom={library.deleteCustom}
          />
        </div>
      ) : null}

      <Dialog
        open={Boolean(editPreset)}
        onOpenChange={(next) => {
          if (!next) setEditPreset(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit custom preset</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={EDITOR_UI.input}
            placeholder="Preset name"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditPreset(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editPreset) return;
                library.updateCustom(editPreset.id, {
                  name: editName.trim() || editPreset.name,
                });
                setEditPreset(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
