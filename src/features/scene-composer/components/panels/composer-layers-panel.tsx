"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  Layers,
  Lock,
  LockOpen,
  Trash2,
  Ungroup,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddLayerMenu } from "@/features/scene-composer/components/editor/add-layer-menu";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import type { LayerKind } from "@/features/scene-composer/lib/layer-factory";
import { createLayerService } from "@/features/scene-composer/services/layer.service.impl";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

const layerService = createLayerService();

type ComposerLayersPanelProps = {
  objects: SceneObject[];
  selectedIds: string[];
  onObjectsChange: (objects: SceneObject[], label?: string) => void;
  onSelect: (id: string | null, additive?: boolean) => void;
  /** Feature 042 — create via LayerFactory kind (never hardcode Rectangle). */
  onAddLayer?: (kind: LayerKind) => void;
  disabled?: boolean;
};

type TreeRow = { object: SceneObject; depth: number; hasChildren: boolean };

/**
 * Builds the visible layer rows depth-first. Topmost layer first (highest
 * sort_order), which matches the stacking order shown on the canvas.
 */
function buildRows(
  objects: SceneObject[],
  collapsed: Set<string>,
): TreeRow[] {
  const childrenOf = new Map<string | null, SceneObject[]>();
  for (const object of objects) {
    const key = object.parent_object_id ?? null;
    const list = childrenOf.get(key) ?? [];
    list.push(object);
    childrenOf.set(key, list);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => b.sort_order - a.sort_order);
  }

  const ids = new Set(objects.map((o) => o.id));
  const roots = [
    ...(childrenOf.get(null) ?? []),
    ...objects.filter(
      (o) => o.parent_object_id && !ids.has(o.parent_object_id),
    ),
  ].sort((a, b) => b.sort_order - a.sort_order);

  const rows: TreeRow[] = [];
  const walk = (object: SceneObject, depth: number) => {
    const children = childrenOf.get(object.id) ?? [];
    rows.push({ object, depth, hasChildren: children.length > 0 });
    if (collapsed.has(object.id)) return;
    for (const child of children) walk(child, depth + 1);
  };
  for (const root of roots) walk(root, 0);
  return rows;
}

export function ComposerLayersPanel({
  objects,
  selectedIds,
  onObjectsChange,
  onSelect,
  onAddLayer,
  disabled = false,
}: ComposerLayersPanelProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    place: "above" | "below";
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    objectId: string;
  } | null>(null);

  const rows = useMemo(() => buildRows(objects, collapsed), [objects, collapsed]);

  const primaryId = selectedIds[0] ?? null;
  const primary = primaryId
    ? objects.find((object) => object.id === primaryId)
    : null;
  const selectedGroup =
    primary?.object_type === "group" ? primary : null;

  const toggleCollapse = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const commitDrop = () => {
    if (dragId && dropTarget && dragId !== dropTarget.id) {
      onObjectsChange(
        layerService.moveRelativeTo(
          objects,
          dragId,
          dropTarget.id,
          dropTarget.place,
        ),
        "Reorder layers",
      );
    }
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex shrink-0 items-center gap-1 border-b border-border/60 px-2 py-2">
        <Layers className="ml-1 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 px-1">
          <p className={EDITOR_UI.sectionHeader}>Layers</p>
          <p className={EDITOR_UI.helper}>
            {objects.length} in scene
            {selectedIds.length > 1 ? ` · ${selectedIds.length} selected` : ""}
          </p>
        </div>

        {onAddLayer ? (
          <AddLayerMenu
            disabled={disabled}
            onAddLayer={onAddLayer}
            variant="panel"
            align="end"
          />
        ) : null}

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7"
          title={
            selectedIds.length > 1
              ? "Group selected layers"
              : "Select 2+ layers to group"
          }
          disabled={disabled || selectedIds.length < 2}
          onClick={() =>
            onObjectsChange(layerService.group(objects, selectedIds), "Group layers")
          }
        >
          <FolderPlus className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7"
          title={selectedGroup ? "Ungroup" : "Select a group to ungroup"}
          disabled={disabled || !selectedGroup}
          onClick={() => {
            if (!selectedGroup) return;
            onObjectsChange(
              layerService.ungroup(objects, selectedGroup.id),
              "Ungroup layers",
            );
            onSelect(null);
          }}
        >
          <Ungroup className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {rows.map(({ object, depth, hasChildren }) => {
            const selected = selectedIds.includes(object.id);
            const isDropTarget = dropTarget?.id === object.id;
            return (
              <div
                key={object.id}
                draggable
                onDragStart={(event) => {
                  setDragId(object.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  if (!dragId || dragId === object.id) return;
                  event.preventDefault();
                  const box = event.currentTarget.getBoundingClientRect();
                  const place =
                    event.clientY < box.top + box.height / 2 ? "above" : "below";
                  setDropTarget((current) =>
                    current?.id === object.id && current.place === place
                      ? current
                      : { id: object.id, place },
                  );
                }}
                onDragLeave={() => {
                  setDropTarget((current) =>
                    current?.id === object.id ? null : current,
                  );
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  commitDrop();
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropTarget(null);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (!selectedIds.includes(object.id)) {
                    onSelect(object.id);
                  }
                  setContextMenu({
                    x: event.clientX,
                    y: event.clientY,
                    objectId: object.id,
                  });
                }}
                style={{ marginLeft: depth * 12 }}
                className={`flex items-center gap-0.5 rounded-md border px-1 py-1 ${
                  selected
                    ? "border-sky-400/60 bg-sky-400/10"
                    : "border-border/40 hover:bg-muted/40"
                } ${!object.visible ? "opacity-55" : ""} ${
                  dragId === object.id ? "opacity-40" : ""
                } ${
                  isDropTarget
                    ? dropTarget?.place === "above"
                      ? "border-t-2 border-t-sky-400"
                      : "border-b-2 border-b-sky-400"
                    : ""
                }`}
              >
                <GripVertical className="size-3 shrink-0 cursor-grab text-muted-foreground/60" />
                {hasChildren ? (
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground"
                    aria-label={
                      collapsed.has(object.id) ? "Expand group" : "Collapse group"
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCollapse(object.id);
                    }}
                  >
                    {collapsed.has(object.id) ? (
                      <ChevronRight className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
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
                  onClick={(event) =>
                    onSelect(object.id, event.shiftKey || event.metaKey || event.ctrlKey)
                  }
                  title={object.name}
                >
                  {object.name}
                </button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="size-7"
                  title="Duplicate layer"
                  onClick={(event) => {
                    event.stopPropagation();
                    onObjectsChange(
                      layerService.duplicate(object, objects),
                      "Duplicate layer",
                    );
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
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
                      hasChildren
                        ? `Delete "${object.name}" and its child layers?`
                        : `Delete layer "${object.name}"?`,
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
            <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No layers yet. Choose a type from Add Layer.
              </p>
              {onAddLayer ? (
                <AddLayerMenu
                  disabled={disabled}
                  onAddLayer={onAddLayer}
                  variant="panel"
                />
              ) : null}
            </div>
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
          <p className={EDITOR_UI.helper}>
            Select a layer to rename · Shift-click for multi-select
          </p>
        </div>
      )}

      {contextMenu ? (
        <LayerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          object={
            objects.find((item) => item.id === contextMenu.objectId) ?? null
          }
          selectedCount={selectedIds.length}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => {
            const object = objects.find(
              (item) => item.id === contextMenu.objectId,
            );
            if (!object) return;
            onObjectsChange(
              layerService.duplicate(object, objects),
              "Duplicate layer",
            );
            setContextMenu(null);
          }}
          onToggleVisibility={() => {
            onObjectsChange(
              layerService.toggleVisibility(objects, contextMenu.objectId),
              "Toggle visibility",
            );
            setContextMenu(null);
          }}
          onToggleLock={() => {
            onObjectsChange(
              layerService.toggleLock(objects, contextMenu.objectId),
              "Toggle lock",
            );
            setContextMenu(null);
          }}
          onDelete={() => {
            const object = objects.find(
              (item) => item.id === contextMenu.objectId,
            );
            if (!object || object.locked) return;
            onObjectsChange(
              layerService.remove(objects, [object.id]),
              "Delete layer",
            );
            onSelect(null);
            setContextMenu(null);
          }}
          onGroup={() => {
            if (selectedIds.length < 2) return;
            onObjectsChange(
              layerService.group(objects, selectedIds),
              "Group layers",
            );
            setContextMenu(null);
          }}
          onUngroup={() => {
            const object = objects.find(
              (item) => item.id === contextMenu.objectId,
            );
            if (!object || object.object_type !== "group") return;
            onObjectsChange(
              layerService.ungroup(objects, object.id),
              "Ungroup layers",
            );
            onSelect(null);
            setContextMenu(null);
          }}
        />
      ) : null}
    </div>
  );
}

function LayerContextMenu({
  x,
  y,
  object,
  selectedCount,
  onClose,
  onDuplicate,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onGroup,
  onUngroup,
}: {
  x: number;
  y: number;
  object: SceneObject | null;
  selectedCount: number;
  onClose: () => void;
  onDuplicate: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[80] cursor-default"
        aria-label="Dismiss context menu"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-[90] min-w-[180px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        style={{ left: x, top: y }}
        role="menu"
      >
        <ContextItem label="Duplicate" onClick={onDuplicate} />
        <ContextItem
          label={object?.visible === false ? "Show" : "Hide"}
          onClick={onToggleVisibility}
        />
        <ContextItem
          label={object?.locked ? "Unlock" : "Lock"}
          onClick={onToggleLock}
        />
        <div className="my-1 h-px bg-border" />
        <ContextItem
          label="Group"
          disabled={selectedCount < 2}
          onClick={onGroup}
        />
        <ContextItem
          label="Ungroup"
          disabled={object?.object_type !== "group"}
          onClick={onUngroup}
        />
        <div className="my-1 h-px bg-border" />
        <ContextItem
          label="Delete"
          destructive
          disabled={Boolean(object?.locked)}
          onClick={onDelete}
        />
      </div>
    </>
  );
}

function ContextItem({
  label,
  onClick,
  disabled,
  destructive,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[13px] ${
        destructive ? "text-destructive" : ""
      } ${disabled ? "opacity-40" : "hover:bg-muted"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
