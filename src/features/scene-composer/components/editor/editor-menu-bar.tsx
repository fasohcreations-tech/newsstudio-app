"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  ClipboardPaste,
  Group,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Ungroup,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { AddLayerMenu } from "@/features/scene-composer/components/editor/add-layer-menu";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import type { LayerKind } from "@/features/scene-composer/lib/layer-factory";

type EditorMenuBarProps = {
  canUndo: boolean;
  canRedo: boolean;
  canEditSelection: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canAlign: boolean;
  canAddLayer?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onAlign: (mode: "left" | "center" | "right") => void;
  onAddLayer?: (kind: LayerKind) => void;
  onZoomFit: () => void;
  onZoom100: () => void;
  onZoom200: () => void;
};

/**
 * Feature 041/042 menu bar — Edit / View + Add Layer creation menu.
 */
export function EditorMenuBar({
  canUndo,
  canRedo,
  canEditSelection,
  canGroup,
  canUngroup,
  canAlign,
  canAddLayer = true,
  onUndo,
  onRedo,
  onSave,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onSelectAll,
  onGroup,
  onUngroup,
  onAlign,
  onAddLayer,
  onZoomFit,
  onZoom100,
  onZoom200,
}: EditorMenuBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border/60 bg-background/95 px-2 py-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`${EDITOR_UI.button} px-2`}
            />
          }
        >
          Edit
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem disabled={!canUndo} onClick={onUndo}>
            <Undo2 className="size-3.5" />
            Undo
            <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canRedo} onClick={onRedo}>
            <Redo2 className="size-3.5" />
            Redo
            <DropdownMenuShortcut>Ctrl+Shift+Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!canEditSelection} onClick={onCopy}>
            <Copy className="size-3.5" />
            Copy
            <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPaste}>
            <ClipboardPaste className="size-3.5" />
            Paste
            <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canEditSelection} onClick={onDuplicate}>
            Duplicate
            <DropdownMenuShortcut>Ctrl+D</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canEditSelection} onClick={onDelete}>
            <Trash2 className="size-3.5" />
            Delete
            <DropdownMenuShortcut>Del</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSelectAll}>
            Select All
            <DropdownMenuShortcut>Ctrl+A</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canGroup} onClick={onGroup}>
            <Group className="size-3.5" />
            Group
            <DropdownMenuShortcut>Ctrl+G</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canUngroup} onClick={onUngroup}>
            <Ungroup className="size-3.5" />
            Ungroup
            <DropdownMenuShortcut>Ctrl+Shift+G</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`${EDITOR_UI.button} px-2`}
            />
          }
        >
          View
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={onZoomFit}>Fit to Window</DropdownMenuItem>
          <DropdownMenuItem onClick={onZoom100}>Zoom 100%</DropdownMenuItem>
          <DropdownMenuItem onClick={onZoom200}>Zoom 200%</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {onAddLayer ? (
        <AddLayerMenu
          disabled={!canAddLayer}
          onAddLayer={onAddLayer}
          variant="toolbar"
          align="start"
        />
      ) : null}

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        title="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Undo2 className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        title="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <Redo2 className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        title="Save"
        onClick={onSave}
      >
        <Save className="size-3.5" />
      </Button>

      {canAlign ? (
        <>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Align left"
            onClick={() => onAlign("left")}
          >
            <AlignLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Align center"
            onClick={() => onAlign("center")}
          >
            <AlignCenter className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Align right"
            onClick={() => onAlign("right")}
          >
            <AlignRight className="size-3.5" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
