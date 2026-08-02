"use client";

import { useMemo } from "react";

import {
  applyBindingsToDocument,
  buildDefaultBindings,
} from "@/features/motion-scene-engine/lib/variable-binding";
import type { MotionSceneWithRelations } from "@/features/motion-scene-engine/types/motion-scene.types";
import type { SceneEditorState } from "@/features/motion-scene-engine/types/motion-scene.types";

type SceneCanvasPanelProps = {
  scene: MotionSceneWithRelations;
  preview: SceneEditorState;
  onSelectLayer: (layerId: string | null) => void;
};

export function SceneCanvasPanel({
  scene,
  preview,
  onSelectLayer,
}: SceneCanvasPanelProps) {
  const bindings = useMemo(
    () => ({ ...buildDefaultBindings(), ...scene.resolved_bindings }),
    [scene.resolved_bindings],
  );

  const document = useMemo(
    () => applyBindingsToDocument(scene.scene_document, bindings),
    [scene.scene_document, bindings],
  );

  const aspect = scene.canvas.width / scene.canvas.height;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Canvas
        </p>
        <p className="text-[10px] text-muted-foreground">
          {scene.canvas.width}×{scene.canvas.height} · {scene.aspect_format} ·
          Architecture preview (no render pipeline)
        </p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0a0a0a] p-4">
        <div
          className="relative max-h-full max-w-full overflow-hidden rounded-md border border-border/40 bg-black shadow-2xl"
          style={{
            aspectRatio: String(aspect),
            width: `${Math.min(100, preview.zoom * 100)}%`,
            background: scene.canvas.background,
          }}
        >
          {preview.gridVisible ? (
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(#ffffff22 1px, transparent 1px), linear-gradient(90deg, #ffffff22 1px, transparent 1px)",
                backgroundSize: `${scene.canvas.grid.size}px ${scene.canvas.grid.size}px`,
              }}
            />
          ) : null}

          {preview.safeAreaVisible ? (
            <div
              className="pointer-events-none absolute border border-dashed border-amber-400/50"
              style={{
                top: scene.canvas.safe_area.top,
                right: scene.canvas.safe_area.right,
                bottom: scene.canvas.safe_area.bottom,
                left: scene.canvas.safe_area.left,
              }}
            />
          ) : null}

          {document.layers.map((layer) => {
            if (!layer.visible) return null;
            const active =
              preview.playheadMs >= layer.start_ms &&
              preview.playheadMs <= layer.end_ms;
            if (!active) return null;

            const selected = preview.selectedLayerId === layer.id;
            const text =
              typeof layer.content.text === "string"
                ? layer.content.text
                : layer.name;

            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => onSelectLayer(layer.id)}
                className="absolute max-w-[80%] rounded px-3 py-2 text-left transition-shadow"
                style={{
                  left: layer.transform.x,
                  top: layer.transform.y,
                  transform: `scale(${layer.transform.scale}) rotate(${layer.transform.rotation}deg)`,
                  opacity: layer.transform.opacity,
                  background:
                    (layer.style.fill as string | undefined) ??
                    "rgba(0,0,0,0.75)",
                  borderRadius: (layer.style.corner_radius as number) ?? 4,
                  fontFamily:
                    (layer.style.font_family as string) ?? "Inter",
                  fontSize: (layer.style.font_size as number) ?? 24,
                  fontWeight: (layer.style.font_weight as number) ?? 600,
                  color: (layer.style.color as string) ?? "#fff",
                  boxShadow: selected
                    ? "0 0 0 2px var(--primary)"
                    : undefined,
                }}
              >
                {text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
