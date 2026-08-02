"use client";

import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLayerService } from "@/features/scene-composer/services/layer.service.impl";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

const layerService = createLayerService();

type ComposerLayersPanelProps = {
  objects: SceneObject[];
  selectedIds: string[];
  onObjectsChange: (objects: SceneObject[], label?: string) => void;
  onSelect: (id: string | null, additive?: boolean) => void;
};

export function ComposerLayersPanel({
  objects,
  selectedIds,
  onObjectsChange,
  onSelect,
}: ComposerLayersPanelProps) {
  const sorted = [...objects].sort((a, b) => b.sort_order - a.sort_order);

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-border/60 bg-card">
      <div className="border-b border-border/60 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
          Layers · {objects.length}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {sorted.map((object) => {
          const selected = selectedIds.includes(object.id);
          return (
            <div
              key={object.id}
              className={`mb-1 flex items-center gap-1 rounded-md border px-1 py-1 ${selected ? "border-primary/50 bg-primary/5" : "border-border/40"}`}
            >
              <GripVertical className="size-3 shrink-0 text-muted-foreground" />
              <button
                type="button"
                className="size-2 shrink-0 rounded-full"
                style={{ background: object.layer_color }}
                aria-label="Layer color"
              />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-xs"
                onClick={() => onSelect(object.id)}
              >
                {object.name}
              </button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-6"
                onClick={() =>
                  onObjectsChange(
                    layerService.toggleVisibility(objects, object.id),
                    "Toggle visibility",
                  )
                }
              >
                {object.visible ? (
                  <Eye className="size-3" />
                ) : (
                  <EyeOff className="size-3" />
                )}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-6"
                onClick={() =>
                  onObjectsChange(
                    layerService.toggleLock(objects, object.id),
                    "Toggle lock",
                  )
                }
              >
                {object.locked ? (
                  <Lock className="size-3" />
                ) : (
                  <LockOpen className="size-3" />
                )}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-6"
                onClick={() =>
                  onObjectsChange(
                    layerService.duplicate(object, objects),
                    "Duplicate layer",
                  )
                }
              >
                <Copy className="size-3" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-6"
                onClick={() =>
                  onObjectsChange(
                    layerService.remove(objects, [object.id]),
                    "Delete layer",
                  )
                }
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          );
        })}
        {objects.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Add objects from the Shapes or Media panel.
          </p>
        ) : null}
      </div>
      {selectedIds.length === 1 ? (
        <div className="border-t border-border/60 p-2">
          <Input
            value={objects.find((o) => o.id === selectedIds[0])?.name ?? ""}
            onChange={(e) =>
              onObjectsChange(
                layerService.rename(objects, selectedIds[0], e.target.value),
                "Rename layer",
              )
            }
            className="h-7 text-xs"
            placeholder="Layer name"
          />
        </div>
      ) : null}
    </div>
  );
}
