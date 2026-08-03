"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Grid3X3,
  Magnet,
  Maximize2,
  Ruler,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EDITOR_UI,
  EDITOR_ZOOM_LEVELS,
  SAFE_ACTION_INSET,
  SAFE_TITLE_INSET,
} from "@/features/scene-composer/components/editor/editor.constants";
import { SelectionChrome } from "@/features/scene-composer/components/editor/selection-chrome";
import { createCanvasService } from "@/features/scene-composer/services/canvas.service.impl";
import type {
  ComposerScene,
  ComposerViewportState,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import { StoryLivePreview } from "@/features/story-production/components/story-live-preview";
import type { StoryPreviewAspect } from "@/features/story-production/types/story-data.types";

const canvasService = createCanvasService();

type EditorCanvasProps = {
  scene: ComposerScene;
  resolvedBindings: Record<string, string>;
  playheadMs: number;
  motionMode?: "playback" | "edit";
  isPlaying?: boolean;
  aspect: StoryPreviewAspect;
  viewport: ComposerViewportState;
  selectedObject: SceneObject | null;
  isPanning: boolean;
  spaceHeld: boolean;
  onSelectObject: (id: string | null, additive?: boolean) => void;
  onPan: (dx: number, dy: number) => void;
  onSetZoom: (zoom: number) => void;
  onFitZoom: (zoom: number) => void;
  onToggle: (
    key:
      | "gridVisible"
      | "rulersVisible"
      | "guidesVisible"
      | "safeAreaVisible"
      | "snapEnabled",
  ) => void;
  onSetPanning: (value: boolean) => void;
  onBrowseMedia?: (object: SceneObject) => void;
  onTransformLive?: (objectId: string, transform: SceneObject["transform"]) => void;
  onTransformCommit?: (
    objectId: string,
    transform: SceneObject["transform"],
    origin: SceneObject["transform"],
  ) => void;
};

/**
 * Module 3.6 editable broadcast canvas — zoom, pan, guides, selection.
 */
export function EditorCanvas({
  scene,
  resolvedBindings,
  playheadMs,
  motionMode = "edit",
  isPlaying = false,
  aspect,
  viewport,
  selectedObject,
  isPanning,
  spaceHeld,
  onSelectObject,
  onPan,
  onSetZoom,
  onFitZoom,
  onToggle,
  onSetPanning,
  onBrowseMedia,
  onTransformLive,
  onTransformCommit,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitReady, setFitReady] = useState(false);
  const artboard = useMemo(
    () => canvasService.getArtboardDimensions(scene.composer_settings),
    [scene.composer_settings],
  );

  const computeFit = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 1;
    const rect = container.getBoundingClientRect();
    const pad = viewport.rulersVisible ? 48 : 32;
    return canvasService.computeFitZoom(artboard, {
      width: Math.max(120, rect.width - pad),
      height: Math.max(120, rect.height - pad),
    });
  }, [artboard, viewport.rulersVisible]);

  const hasUserZoomed = useRef(false);
  const zoomRef = useRef(viewport.zoom);
  zoomRef.current = viewport.zoom;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let frame = 0;
    const fit = () => {
      if (hasUserZoomed.current) return;
      // Defer out of the ResizeObserver delivery — sync setState there can
      // recurse into "Maximum update depth exceeded".
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = computeFit();
        if (Math.abs(zoomRef.current - next) < 0.001) {
          setFitReady((ready) => ready || true);
          return;
        }
        onFitZoom(next);
        setFitReady((ready) => ready || true);
      });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [computeFit, onFitZoom, aspect]);

  const applyZoom = useCallback(
    (zoom: number) => {
      hasUserZoomed.current = true;
      onSetZoom(zoom);
    },
    [onSetZoom],
  );

  const applyFit = useCallback(() => {
    hasUserZoomed.current = false;
    onFitZoom(computeFit());
  }, [computeFit, onFitZoom]);

  const zoomLabel =
    !hasUserZoomed.current || Math.abs(viewport.zoom - computeFit()) < 0.02
      ? "Fit"
      : `${Math.round(viewport.zoom * 100)}%`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0B1220]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-background/90 px-3 py-2">
        <p className={`${EDITOR_UI.sectionHeader} mr-2`}>Canvas</p>
        <Select
          value={
            EDITOR_ZOOM_LEVELS.includes(
              viewport.zoom as (typeof EDITOR_ZOOM_LEVELS)[number],
            )
              ? String(viewport.zoom)
              : "fit"
          }
          onValueChange={(value) => {
            // Ignore null/empty from controlled Select sync — treating those as
            // "fit" re-triggered applyFit every render.
            if (value == null || value === "") return;
            if (value === "fit") {
              // Already in fit mode — Base UI may re-emit the controlled value
              // and that used to recurse into max update depth.
              if (!hasUserZoomed.current) return;
              applyFit();
              return;
            }
            applyZoom(Number(value));
          }}
        >
          <SelectTrigger className={`${EDITOR_UI.input} w-[110px]`}>
            <SelectValue placeholder={zoomLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fit">Fit to Window</SelectItem>
            {EDITOR_ZOOM_LEVELS.map((level) => (
              <SelectItem key={level} value={String(level)}>
                {Math.round(level * 100)}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={EDITOR_UI.button}
          onClick={applyFit}
        >
          <Maximize2 className="mr-1.5 size-4" />
          Fit
        </Button>
        <span className={`${EDITOR_UI.label} tabular-nums`}>{zoomLabel}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <ToggleChip
            active={viewport.gridVisible}
            label="Grid"
            icon={<Grid3X3 className="size-4" />}
            onClick={() => onToggle("gridVisible")}
          />
          <ToggleChip
            active={viewport.safeAreaVisible}
            label="Safe"
            icon={<Crosshair className="size-4" />}
            onClick={() => onToggle("safeAreaVisible")}
          />
          <ToggleChip
            active={viewport.rulersVisible}
            label="Rulers"
            icon={<Ruler className="size-4" />}
            onClick={() => onToggle("rulersVisible")}
          />
          <ToggleChip
            active={viewport.snapEnabled}
            label="Snap"
            icon={<Magnet className="size-4" />}
            onClick={() => onToggle("snapEnabled")}
          />
          <ToggleChip
            active={viewport.guidesVisible}
            label="Guides"
            onClick={() => onToggle("guidesVisible")}
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          cursor: isPanning || spaceHeld ? "grab" : "default",
        }}
        onPointerDown={(event) => {
          if (event.button === 1 || spaceHeld || event.altKey) {
            onSetPanning(true);
            return;
          }
          if (event.target === event.currentTarget) onSelectObject(null);
        }}
        onPointerMove={(event) => {
          if (isPanning || spaceHeld) {
            onPan(event.movementX, event.movementY);
          }
        }}
        onPointerUp={() => onSetPanning(false)}
        onPointerLeave={() => onSetPanning(false)}
        onDoubleClick={() => applyFit()}
        onWheel={(event) => {
          event.preventDefault();
          const factor = event.ctrlKey || event.metaKey ? 0.08 : 0.05;
          const next = Math.max(
            0.25,
            Math.min(2, viewport.zoom + (event.deltaY > 0 ? -factor : factor)),
          );
          applyZoom(next);
        }}
      >
        {viewport.rulersVisible ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-6 border-b border-white/10 bg-zinc-950/90" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-30 w-6 border-r border-white/10 bg-zinc-950/90" />
          </>
        ) : null}

        {viewport.gridVisible ? (
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: `${scene.composer_settings.grid_size * viewport.zoom}px ${scene.composer_settings.grid_size * viewport.zoom}px`,
              backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
            }}
          />
        ) : null}

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative shrink-0"
            style={{
              transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
              transformOrigin: "center center",
              opacity: fitReady ? 1 : 0,
            }}
          >
            <div
              className="relative overflow-hidden shadow-2xl ring-1 ring-white/10"
              style={{
                width: artboard.width,
                height: artboard.height,
                background: "#071225",
              }}
            >
              {viewport.safeAreaVisible ? (
                <>
                  <div
                    className="pointer-events-none absolute z-30 border border-dashed border-amber-300/50"
                    style={{
                      inset: `${SAFE_ACTION_INSET * 100}%`,
                    }}
                    title="Safe Action"
                  />
                  <div
                    className="pointer-events-none absolute z-30 border border-dashed border-emerald-300/45"
                    style={{
                      inset: `${SAFE_TITLE_INSET * 100}%`,
                    }}
                    title="Safe Title"
                  />
                </>
              ) : null}

              <StoryLivePreview
                scene={scene}
                resolvedBindings={resolvedBindings}
                playheadMs={playheadMs}
                motionMode={motionMode}
                isPlaying={isPlaying}
                aspect={aspect}
                selectedObjectId={selectedObject?.id ?? null}
                onSelectObject={(id) => onSelectObject(id)}
                interactive
                fillParent
                className="!bg-transparent"
                onBrowseMedia={onBrowseMedia}
              />

              {selectedObject ? (
                <SelectionChrome
                  object={selectedObject}
                  showGuides={viewport.guidesVisible}
                  artboardWidth={artboard.width}
                  artboardHeight={artboard.height}
                  zoom={viewport.zoom}
                  snapEnabled={viewport.snapEnabled}
                  gridSize={scene.composer_settings.grid_size}
                  spaceHeld={spaceHeld || isPanning}
                  onTransformLive={
                    onTransformLive
                      ? (transform) => onTransformLive(selectedObject.id, transform)
                      : undefined
                  }
                  onTransformCommit={
                    onTransformCommit
                      ? (transform, origin) =>
                          onTransformCommit(
                            selectedObject.id,
                            transform,
                            origin,
                          )
                      : undefined
                  }
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/70 px-3 py-1.5 text-[14px] text-white/90">
          {artboard.width}×{artboard.height} · {zoomLabel}
          {viewport.snapEnabled ? " · Snap" : ""}
        </div>
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-9 gap-1.5 px-2.5 text-[14px]"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}
