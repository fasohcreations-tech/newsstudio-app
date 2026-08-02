"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Grid3x3,
  Magnet,
  Minus,
  Plus,
  Redo2,
  Ruler,
  Shield,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createCanvasService } from "@/features/scene-composer/services/canvas.service.impl";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

const canvasService = createCanvasService();

type ComposerToolbarProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggle: (
    key: "gridVisible" | "rulersVisible" | "guidesVisible" | "safeAreaVisible" | "snapEnabled",
  ) => void;
  selectedObjects: SceneObject[];
  onAlign: (mode: "left" | "center" | "right") => void;
};

export function ComposerToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onToggle,
  selectedObjects,
  onAlign,
}: ComposerToolbarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1">
      <Button type="button" size="icon-sm" variant="ghost" disabled={!canUndo} onClick={onUndo}>
        <Undo2 className="size-3.5" />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" disabled={!canRedo} onClick={onRedo}>
        <Redo2 className="size-3.5" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button type="button" size="icon-sm" variant="ghost" onClick={onZoomOut}>
        <Minus className="size-3.5" />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" onClick={onZoomIn}>
        <Plus className="size-3.5" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button type="button" size="icon-sm" variant="ghost" onClick={() => onToggle("gridVisible")}>
        <Grid3x3 className="size-3.5" />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" onClick={() => onToggle("rulersVisible")}>
        <Ruler className="size-3.5" />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" onClick={() => onToggle("safeAreaVisible")}>
        <Shield className="size-3.5" />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" onClick={() => onToggle("snapEnabled")}>
        <Magnet className="size-3.5" />
      </Button>
      {selectedObjects.length >= 2 ? (
        <>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => onAlign("left")}>
            <AlignLeft className="size-3.5" />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => onAlign("center")}>
            <AlignCenter className="size-3.5" />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => onAlign("right")}>
            <AlignRight className="size-3.5" />
          </Button>
        </>
      ) : null}
    </div>
  );
}

export { canvasService };
