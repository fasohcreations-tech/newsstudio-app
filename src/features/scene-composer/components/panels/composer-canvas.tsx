"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { buildDefaultBindings } from "@/features/motion-scene-engine/lib/variable-binding";
import {
  createCanvasService,
  snapValue,
} from "@/features/scene-composer/services/canvas.service.impl";
import type {
  ComposerScene,
  ComposerViewportState,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import type { useComposerCanvas } from "@/features/scene-composer/hooks/use-composer-canvas";

type ComposerCanvasProps = {
  scene: ComposerScene;
  viewport: ComposerViewportState;
  selection: ReturnType<typeof useComposerCanvas>["selection"];
  playheadMs: number;
  onSelectObject: (id: string | null, additive?: boolean) => void;
  onObjectsChange: (objects: SceneObject[], label?: string) => void;
  onPan: (dx: number, dy: number) => void;
  onFitZoom: (zoom: number) => void;
  isPanning: boolean;
  setIsPanning: (value: boolean) => void;
};

const canvasService = createCanvasService();

function resolveObjectText(
  object: SceneObject,
  bindings: Record<string, string>,
) {
  const text = object.content.text;
  if (typeof text !== "string") return object.name;
  return text.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, key: string) => {
    return bindings[key] ?? object.bindings[key] ?? `{{${key}}}`;
  });
}

export function ComposerCanvas({
  scene,
  viewport,
  selection,
  playheadMs,
  onSelectObject,
  onObjectsChange,
  onPan,
  onFitZoom,
  isPanning,
  setIsPanning,
}: ComposerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    objectId: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const artboard = canvasService.getArtboardDimensions(scene.composer_settings);
  const bindings = {
    ...buildDefaultBindings(),
    ...scene.resolved_bindings,
  };

  const visibleObjects = scene.composer_document.objects.filter(
    (obj) =>
      obj.visible &&
      playheadMs >= obj.start_ms &&
      playheadMs <= obj.end_ms,
  );

  // Fit artboard centered in the viewport on mount and when resolution changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        onFitZoom(
          canvasService.computeFitZoom(artboard, {
            width: rect.width,
            height: rect.height,
          }),
        );
      });
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [artboard.width, artboard.height, onFitZoom]);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    object: SceneObject,
  ) => {
    if (object.locked) return;
    event.stopPropagation();
    onSelectObject(object.id, event.shiftKey);
    setDragState({
      objectId: object.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: object.transform.x,
      originY: object.transform.y,
    });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isPanning) {
        onPan(event.movementX, event.movementY);
        return;
      }
      if (!dragState) return;
      const dx = (event.clientX - dragState.startX) / viewport.zoom;
      const dy = (event.clientY - dragState.startY) / viewport.zoom;
      const grid = scene.composer_settings.grid_size;
      const next = scene.composer_document.objects.map((obj) =>
        obj.id === dragState.objectId
          ? {
              ...obj,
              transform: {
                ...obj.transform,
                x: snapValue(
                  dragState.originX + dx,
                  grid,
                  viewport.snapEnabled,
                ),
                y: snapValue(
                  dragState.originY + dy,
                  grid,
                  viewport.snapEnabled,
                ),
              },
            }
          : obj,
      );
      onObjectsChange(next, "Move object");
    },
    [
      dragState,
      isPanning,
      onObjectsChange,
      onPan,
      scene.composer_document.objects,
      scene.composer_settings.grid_size,
      viewport.snapEnabled,
      viewport.zoom,
    ],
  );

  const endDrag = () => {
    setDragState(null);
    setIsPanning(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 items-center justify-center overflow-hidden bg-[#111827]"
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerDown={(e) => {
        if (e.button === 1 || e.altKey) {
          setIsPanning(true);
          return;
        }
        if (e.target === e.currentTarget) {
          onSelectObject(null);
        }
      }}
      onWheel={(e) => {
        if (e.ctrlKey) e.preventDefault();
      }}
    >
      {viewport.rulersVisible ? (
        <>
          <div className="pointer-events-none absolute left-0 top-0 z-20 h-5 w-full bg-zinc-900/90" />
          <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-5 bg-zinc-900/90" />
        </>
      ) : null}

      {viewport.gridVisible ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: `${scene.composer_settings.grid_size * viewport.zoom}px ${scene.composer_settings.grid_size * viewport.zoom}px`,
            backgroundPosition: "center center",
          }}
        />
      ) : null}

      <div
        className="relative shrink-0"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          transformOrigin: "center center",
        }}
      >
        <div
          className="relative shadow-2xl ring-1 ring-white/10"
          style={{
            width: artboard.width,
            height: artboard.height,
            background: scene.composer_settings.background,
          }}
        >
          {viewport.safeAreaVisible ? (
            <div
              className="pointer-events-none absolute border border-dashed border-amber-400/40"
              style={{
                top: scene.canvas.safe_area.top,
                right: scene.canvas.safe_area.right,
                bottom: scene.canvas.safe_area.bottom,
                left: scene.canvas.safe_area.left,
              }}
            />
          ) : null}

          {visibleObjects.map((object) => {
            const selected = selection.selectedObjectIds.includes(object.id);
            const isText = ["text", "rich_text", "ticker"].includes(
              object.object_type,
            );
            const label = resolveObjectText(object, bindings);

            return (
              <div
                key={object.id}
                role="button"
                tabIndex={0}
                onPointerDown={(e) => handlePointerDown(e, object)}
                className="absolute select-none"
                style={{
                  left: object.transform.x,
                  top: object.transform.y,
                  width: object.transform.width,
                  height: object.transform.height,
                  transform: `scale(${object.transform.scale}) rotate(${object.transform.rotation}deg)`,
                  transformOrigin: "top left",
                  opacity: object.transform.opacity,
                  outline: selected ? "2px solid #818cf8" : undefined,
                  outlineOffset: 2,
                  cursor: object.locked ? "not-allowed" : "move",
                }}
              >
                <div
                  className="size-full overflow-hidden"
                  style={{
                    background:
                      (object.style.fill as string | undefined) ??
                      (isText ? "transparent" : "rgba(99,102,241,0.85)"),
                    borderRadius: Number(object.style.corner_radius ?? 0),
                    fontFamily: String(object.style.font_family ?? "Inter"),
                    fontSize: Number(object.style.font_size ?? 24),
                    fontWeight: Number(object.style.font_weight ?? 600),
                    color: String(object.style.color ?? "#fff"),
                    display: "flex",
                    alignItems:
                      object.style.vertical_alignment === "top"
                        ? "flex-start"
                        : object.style.vertical_alignment === "bottom"
                          ? "flex-end"
                          : "center",
                    justifyContent:
                      object.style.alignment === "center"
                        ? "center"
                        : object.style.alignment === "right"
                          ? "flex-end"
                          : "flex-start",
                    padding: isText ? "8px 12px" : undefined,
                    lineHeight: Number(object.style.line_height ?? 1.35),
                    letterSpacing: Number(object.style.letter_spacing ?? 0),
                    textAlign:
                      (object.style.alignment as CanvasTextAlign) ?? "left",
                    whiteSpace: object.style.wrap ? "pre-wrap" : "nowrap",
                  }}
                >
                  {isText ? label : null}
                </div>
                {selected ? (
                  <span
                    className="absolute -left-1 -top-5 rounded px-1 text-[9px] font-medium text-white"
                    style={{ background: object.layer_color }}
                  >
                    {object.name}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-[10px] text-white/80">
        {artboard.width}×{artboard.height} · {(viewport.zoom * 100).toFixed(0)}%
      </div>
    </div>
  );
}
