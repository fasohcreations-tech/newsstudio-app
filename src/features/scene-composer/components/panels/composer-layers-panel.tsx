"use client";

import {
  Eye,
  EyeOff,
  Layers,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import { createLayerService } from "@/features/scene-composer/services/layer.service.impl";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

const layerService = createLayerService();

type ComposerLayersPanelProps = {
  objects: SceneObject[];
  selectedIds: string[];
  onObjectsChange: (objects: SceneObject[], label?: string) => void;
  onSelect: (id: string | null, additive?: boolean) => void;
};

/**
 * Left-rail layer stack — select, show/hide, lock, delete, rename.
 */
export function ComposerLayersPanel({
  objects,
  selectedIds,
  onObjectsChange,
  onSelect,
}: ComposerLayersPanelProps) {
  const sorted = [...objects].sort((a, b) => b.sort_order - a.sort_order);
  const primaryId = selectedIds[0] ?? null;
  const primary = primaryId
    ? objects.find((object) => object.id === primaryId)
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <Layers className="size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className={EDITOR_UI.sectionHeader}>Layers</p>
          <p className={EDITOR_UI.helper}>{objects.length} in scene</p>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {sorted.map((object) => {
            const selected = selectedIds.includes(object.id);
            return (
              <div
                key={object.id}
                className={`flex items-center gap-0.5 rounded-md border px-1 py-1 ${
                  selected
                    ? "border-sky-400/60 bg-sky-400/10"
                    : "border-border/40 hover:bg-muted/40"
                } ${!object.visible ? "opacity-55" : ""}`}
              >
                <button
                  type="button"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: object.layer_color || "#64748B" }}
                  aria-label={`${object.name} color`}
                  onClick={() => onSelect(object.id)}
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate px-1.5 py-1.5 text-left text-[13px] font-medium"
                  onClick={(event) => onSelect(object.id, event.shiftKey)}
                  title={object.name}
                >
                  {object.name}
                </button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7"
                  title={object.visible ? "Hide layer" : "Show layer"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onObjectsChange(
                      layerService.toggleVisibility(objects, object.id),
                      "Toggle visibility",
                    );
                  }}
                >
                  {object.visible ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <EyeOff className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7"
                  title={object.locked ? "Unlock layer" : "Lock layer"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onObjectsChange(
                      layerService.toggleLock(objects, object.id),
                      "Toggle lock",
                    );
                  }}
                >
                  {object.locked ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <LockOpen className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7 text-destructive hover:text-destructive"
                  title="Delete layer"
                  disabled={object.locked}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (object.locked) return;
                    const confirmed = window.confirm(
                      `Delete layer "${object.name}"?`,
                    );
                    if (!confirmed) return;
                    onObjectsChange(
                      layerService.remove(objects, [object.id]),
                      "Delete layer",
                    );
                    if (selected) onSelect(null);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}

          {objects.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-muted-foreground">
              No layers in this scene yet.
            </p>
          ) : null}
        </div>
      </ScrollArea>

      {primary ? (
        <div className="shrink-0 space-y-1.5 border-t border-border/60 p-3">
          <p className={EDITOR_UI.label}>Layer name</p>
          <Input
            value={primary.name}
            disabled={primary.locked}
            onChange={(event) =>
              onObjectsChange(
                layerService.rename(objects, primary.id, event.target.value),
                "Rename layer",
              )
            }
            className={EDITOR_UI.input}
            placeholder="Layer name"
          />
        </div>
      ) : (
        <div className="shrink-0 border-t border-border/60 px-3 py-2">
          <p className={EDITOR_UI.helper}>Select a layer to rename it.</p>
        </div>
      )}
    </div>
  );
}
