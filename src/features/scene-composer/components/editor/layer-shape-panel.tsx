"use client";

import { useMemo, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Magnet,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import {
  SHAPE_BEHAVIOR_OPTIONS,
  SHAPE_KIND_OPTIONS,
  SHAPE_LIBRARY_CATEGORIES,
  SHAPE_PRESETS,
  SHAPE_REVEAL_EXIT_DIRECTION_OPTIONS,
  SHAPE_REVEAL_EXIT_STYLE_OPTIONS,
  SHAPE_TRAVEL_DIRECTION_OPTIONS,
  addPathPoint,
  applyShapeLibraryItem,
  applyShapePreset,
  convertShapeKind,
  cornerPathPoint,
  createDefaultReveal,
  createShapeBehavior,
  createShapeFromLibraryItem,
  defaultRevealEntranceBehavior,
  defaultRevealExitBehavior,
  deletePathPoint,
  disableShapeComposer,
  enableShapeComposer,
  getShapeConfig,
  hasExplicitShapeConfig,
  listShapeLibrary,
  mirrorPathHandles,
  movePathPoint,
  nearestAnchorPreset,
  anchorPresetToPoint,
  normalizeRevealExit,
  patchShapeConfig,
  resolveAnchorPoint,
  resolvePlacement,
  resolveRevealConfig,
  resolveRevealExit,
  smoothPathPoint,
  snapObjectToGrid,
  syncRevealExitBehavior,
  toggleShapeHide,
  toggleShapeLock,
  withExclusiveEntranceBehavior,
} from "@/features/scene-composer/lib/shape-composer";
import { SHAPE_BEHAVIOR_REPLAY_EVENT } from "@/features/scene-composer/components/editor/shape-renderer";
import type {
  ShapeAnchor,
  ShapeBehaviorType,
  ShapeKind,
  ShapeLibraryCategory,
  ShapeRevealExitDirection,
  ShapeRevealExitStyle,
  ShapeTravelDirection,
} from "@/features/scene-composer/lib/shape-composer";
import { isTravelBehaviorType } from "@/features/scene-composer/lib/shape-composer";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

type LayerShapePanelProps = {
  object: SceneObject;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
  /** Insert a new shape object from the library. */
  onAddObject?: (object: SceneObject) => void;
  onDeleteObject?: (id: string) => void;
  onDuplicateObject?: (object: SceneObject) => void;
  /** Toggle Shape Composer on/off for every layer in the scene. */
  onToggleAllLayers?: (enabled: boolean) => void;
  /** Whether every layer currently has Shape Composer enabled. */
  allLayersEnabled?: boolean;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={EDITOR_UI.label}>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={min}
        max={max}
        step={step ?? 1}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={EDITOR_UI.input}
      />
    </Field>
  );
}

type ShapeSection =
  | "basics"
  | "layout"
  | "colors"
  | "reveal"
  | "behaviors"
  | "geometry"
  | "fill"
  | "border"
  | "gradient"
  | "glass"
  | "corners"
  | "path"
  | "library"
  | "presets";

const SHAPE_PANEL_TABS: Array<{ id: ShapeSection; label: string }> = [
  { id: "basics", label: "Basics" },
  { id: "layout", label: "Layout" },
  { id: "colors", label: "Colors" },
  { id: "reveal", label: "Reveal" },
  { id: "behaviors", label: "Behaviors" },
  { id: "geometry", label: "Geometry" },
  { id: "fill", label: "Fill" },
  { id: "border", label: "Border" },
  { id: "gradient", label: "Gradient" },
  { id: "glass", label: "Glass" },
  { id: "corners", label: "Corners" },
  { id: "path", label: "Path" },
  { id: "library", label: "Library" },
  { id: "presets", label: "Presets" },
];

/**
 * Shape tab — procedural Shape Composer controls.
 * Does not replace Object / Animation / Effects / Behaviors / Story.
 */
export function LayerShapePanel({
  object,
  onObjectPatch,
  onAddObject,
  onDeleteObject,
  onDuplicateObject,
  onToggleAllLayers,
  allLayersEnabled = false,
}: LayerShapePanelProps) {
  const config = getShapeConfig(object);
  const reveal = resolveRevealConfig(config);
  const revealExit = resolveRevealExit(config, reveal);
  const anchorPoint = resolveAnchorPoint(config);
  const placement = resolvePlacement(config);
  const [section, setSection] = useState<ShapeSection | null>(null);
  const [libraryCategory, setLibraryCategory] = useState<
    ShapeLibraryCategory | "all"
  >("all");
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const libraryItems = useMemo(
    () => listShapeLibrary(libraryCategory),
    [libraryCategory],
  );

  const commit = (next: SceneObject) => {
    // Helpers like convertShapeKind / enableShapeComposer return the same
    // reference when nothing changed. Always-spreading here used to re-patch
    // → re-render → Select sync → convert again → max update depth.
    if (next === object) return;
    onObjectPatch(next.id, {
      style: { ...next.style },
      transform: { ...next.transform },
      metadata: { ...next.metadata, shape: next.metadata.shape },
      content: { ...next.content },
      name: next.name,
      object_type: next.object_type,
      visible: next.visible,
      locked: next.locked,
    });
  };

  const patch = (partial: Parameters<typeof patchShapeConfig>[1]) => {
    // Any Shape tab edit writes config and keeps live preview active.
    const base = config.enabled ? object : enableShapeComposer(object);
    commit(patchShapeConfig(base, { ...partial, enabled: true }));
  };

  const requestShapePreview = () => {
    window.dispatchEvent(
      new CustomEvent(SHAPE_BEHAVIOR_REPLAY_EVENT, {
        detail: { objectId: object.id },
      }),
    );
  };

  const patchTransform = (partial: Partial<SceneObject["transform"]>) => {
    onObjectPatch(object.id, {
      transform: { ...object.transform, ...partial },
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={EDITOR_UI.sectionHeader}>Shape Composer</p>
          <p className={EDITOR_UI.helper}>
            Procedural broadcast shapes · live preview updates instantly
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
            <Label className={EDITOR_UI.label}>This layer</Label>
            <Switch
              checked={Boolean(config.enabled)}
              onCheckedChange={(enabled) => {
                if (enabled) {
                  commit(enableShapeComposer(object));
                  return;
                }
                if (hasExplicitShapeConfig(object)) {
                  commit(disableShapeComposer(object));
                }
              }}
            />
          </div>
          {onToggleAllLayers ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
              <div>
                <Label className={EDITOR_UI.label}>All layers</Label>
                <p className={EDITOR_UI.helper}>Shape on / off for every layer</p>
              </div>
              <Switch
                checked={allLayersEnabled}
                onCheckedChange={(enabled) => onToggleAllLayers(enabled)}
              />
            </div>
          ) : null}
        </div>
      </div>
      {config.enabled ? (
        <p className={EDITOR_UI.helper}>
          {object.metadata?.layer === "main_video_container" ||
          object.name === "Main Video Container"
            ? "Frame overlay on Main Video — shape enters, then exits to show video."
            : reveal.enabled
              ? "Shape appears first, then exits to reveal the original layer."
              : "Shape stays on this layer in the live preview."}
        </p>
      ) : null}

      <div
        role="tablist"
        aria-label="Shape Composer panels"
        className="flex flex-wrap gap-1 rounded-md border border-border/60 bg-muted/30 p-1"
      >
        {SHAPE_PANEL_TABS.map(({ id, label }) => {
          const selected = section === id;
          return (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              size="sm"
              variant={selected ? "default" : "ghost"}
              className="h-7 px-2.5 text-[11px]"
              onClick={() =>
                setSection((current) => (current === id ? null : id))
              }
            >
              {label}
            </Button>
          );
        })}
      </div>

      {!section ? (
        <p className={EDITOR_UI.helper}>
          Click a tab to open its settings. Click the same tab again to close.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={EDITOR_UI.button}
          onClick={() => onDuplicateObject?.(object)}
          disabled={!onDuplicateObject}
        >
          <Copy className="mr-1 size-3.5" />
          Duplicate
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={EDITOR_UI.button}
          onClick={() => commit(snapObjectToGrid(object))}
        >
          <Magnet className="mr-1 size-3.5" />
          Snap
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={EDITOR_UI.button}
          onClick={() => commit(toggleShapeLock(object))}
        >
          {object.locked ? (
            <Unlock className="mr-1 size-3.5" />
          ) : (
            <Lock className="mr-1 size-3.5" />
          )}
          {object.locked ? "Unlock" : "Lock"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={EDITOR_UI.button}
          onClick={() => commit(toggleShapeHide(object))}
        >
          {object.visible ? (
            <EyeOff className="mr-1 size-3.5" />
          ) : (
            <Eye className="mr-1 size-3.5" />
          )}
          {object.visible ? "Hide" : "Show"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={EDITOR_UI.button}
          onClick={() => onDeleteObject?.(object.id)}
          disabled={!onDeleteObject}
        >
          <Trash2 className="mr-1 size-3.5" />
          Delete
        </Button>
      </div>

      <Separator />

      {section === "basics" ? (
        <section className="space-y-3">
          <Field label="Shape">
            <Select
              value={config.kind}
              onValueChange={(value) => {
                if (!value || value === config.kind) return;
                commit(convertShapeKind(object, value as ShapeKind));
              }}
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(object.metadata?.layer === "main_video_container" ||
                object.metadata?.component_slug ===
                  "gnn-001-main-video-container" ||
                object.name === "Main Video Container"
                  ? SHAPE_KIND_OPTIONS.filter((opt) =>
                      [
                        "video_frame",
                        "border_frame",
                        "rounded_rectangle",
                        "rectangle",
                        "ellipse",
                        "circle",
                        "video_mask",
                        "image_mask",
                      ].includes(opt.value),
                    )
                  : SHAPE_KIND_OPTIONS
                ).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Width"
              value={object.transform.width}
              min={1}
              onChange={(width) => patchTransform({ width })}
            />
            <NumberField
              label="Height"
              value={object.transform.height}
              min={1}
              onChange={(height) => patchTransform({ height })}
            />
            <NumberField
              label="Opacity"
              value={config.opacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(opacity) => patch({ opacity })}
            />
            <NumberField
              label="Rotation"
              value={config.rotation}
              step={1}
              onChange={(rotation) => patch({ rotation })}
            />
          </div>
          <Field label="Material">
            <Select
              value={config.material}
              onValueChange={(material) =>
                patch({
                  material: (material ?? "standard") as typeof config.material,
                })
              }
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="glass">Glass</SelectItem>
                <SelectItem value="metallic">Metallic</SelectItem>
                <SelectItem value="broadcast_frame">Broadcast Frame</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </section>
      ) : null}

      {section === "layout" ? (
        <section className="space-y-3">
          <Field label="Anchor preset">
            <Select
              value={config.anchor}
              onValueChange={(anchor) => {
                const next = (anchor ?? "center") as ShapeAnchor;
                const point = anchorPresetToPoint(next);
                patch({
                  anchor: next,
                  anchorPoint: point,
                });
              }}
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="top_left">Top Left</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="top_right">Top Right</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="bottom_left">Bottom Left</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="bottom_right">Bottom Right</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Anchor X %"
              value={Math.round(anchorPoint.x * 100)}
              min={0}
              max={100}
              onChange={(pct) => {
                const point = {
                  x: Math.min(1, Math.max(0, pct / 100)),
                  y: anchorPoint.y,
                };
                patch({
                  anchorPoint: point,
                  anchor: nearestAnchorPreset(point),
                });
              }}
            />
            <NumberField
              label="Anchor Y %"
              value={Math.round(anchorPoint.y * 100)}
              min={0}
              max={100}
              onChange={(pct) => {
                const point = {
                  x: anchorPoint.x,
                  y: Math.min(1, Math.max(0, pct / 100)),
                };
                patch({
                  anchorPoint: point,
                  anchor: nearestAnchorPreset(point),
                });
              }}
            />
          </div>
          <p className={EDITOR_UI.helper}>
            Grow / scale origin inside the shape (any point on the layer).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Pos X %"
              value={Math.round(placement.x * 100)}
              min={0}
              max={100}
              onChange={(pct) =>
                patch({
                  placement: {
                    ...placement,
                    x: Math.min(1, Math.max(0, pct / 100)),
                  },
                })
              }
            />
            <NumberField
              label="Pos Y %"
              value={Math.round(placement.y * 100)}
              min={0}
              max={100}
              onChange={(pct) =>
                patch({
                  placement: {
                    ...placement,
                    y: Math.min(1, Math.max(0, pct / 100)),
                  },
                })
              }
            />
            <NumberField
              label="Size W %"
              value={Math.round(placement.width * 100)}
              min={2}
              max={100}
              onChange={(pct) =>
                patch({
                  placement: {
                    ...placement,
                    width: Math.min(1, Math.max(0.02, pct / 100)),
                  },
                })
              }
            />
            <NumberField
              label="Size H %"
              value={Math.round(placement.height * 100)}
              min={2}
              max={100}
              onChange={(pct) =>
                patch({
                  placement: {
                    ...placement,
                    height: Math.min(1, Math.max(0.02, pct / 100)),
                  },
                })
              }
            />
          </div>
          <p className={EDITOR_UI.helper}>
            Place the shape anywhere inside the layer box.
          </p>
        </section>
      ) : null}

      {section === "colors" ? (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Shape Color">
              <Input
                type="color"
                value={toColorInput(config.fill)}
                onChange={(e) =>
                  patch({ fill: e.target.value, fillMode: "solid" })
                }
                className="h-9 p-1"
              />
            </Field>
            <Field label="Border Color">
              <Input
                type="color"
                value={toColorInput(config.strokeColor)}
                onChange={(e) =>
                  patch({
                    strokeColor: e.target.value,
                    strokeStyle:
                      config.strokeStyle === "none" ? "solid" : config.strokeStyle,
                  })
                }
                className="h-9 p-1"
              />
            </Field>
          </div>
          <Field label="Layer Color">
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={toColorInput(
                  typeof object.style.fill === "string"
                    ? object.style.fill
                    : "#FFFFFF",
                )}
                onChange={(e) =>
                  onObjectPatch(object.id, {
                    style: { ...object.style, fill: e.target.value },
                  })
                }
                className="h-9 flex-1 p-1"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 shrink-0 text-[11px]"
                onClick={() =>
                  patch({
                    fill:
                      typeof object.style.fill === "string"
                        ? object.style.fill
                        : config.fill,
                    fillMode: "solid",
                  })
                }
              >
                From layer
              </Button>
            </div>
            <p className={EDITOR_UI.helper}>
              Original layer color shown after the shape exits.
            </p>
          </Field>
        </section>
      ) : null}

      {section === "reveal" ? (
        <section className="space-y-3">
          <div className="space-y-2 rounded-md border border-border/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className={EDITOR_UI.label}>Reveal original layer</p>
                <p className={EDITOR_UI.helper}>
                  Preview runs shape in → exit; editing keeps your layer content visible
                </p>
              </div>
              <Switch
                checked={reveal.enabled}
                onCheckedChange={(enabled) => {
                  const nextReveal = createDefaultReveal({
                    ...reveal,
                    enabled,
                  });
                  const withExit = syncRevealExitBehavior(
                    config.behaviors,
                    nextReveal,
                  );
                  const needsCoverFill =
                    enabled &&
                    (config.fillMode === "none" ||
                      config.fill === "transparent" ||
                      !config.fill);
                  patch({
                    reveal: nextReveal,
                    ...(needsCoverFill
                      ? {
                          fillMode: "solid" as const,
                          fill: "#1D4ED8",
                          borderPadding: 0,
                        }
                      : enabled
                        ? { borderPadding: 0 }
                        : null),
                    behaviors:
                      enabled &&
                      !withExit.some(
                        (b) => b.type !== "reveal_exit" && b.enabled,
                      )
                        ? [
                            defaultRevealEntranceBehavior(),
                            ...withExit.filter((b) => b.type === "reveal_exit"),
                          ]
                        : withExit,
                  });
                }}
              />
            </div>
            {reveal.enabled ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <NumberField
                    label="In ms"
                    value={reveal.entranceDurationMs}
                    min={200}
                    onChange={(entranceDurationMs) =>
                      patch({
                        reveal: { ...reveal, entranceDurationMs },
                      })
                    }
                  />
                  <NumberField
                    label="Hold ms"
                    value={reveal.holdMs}
                    min={0}
                    onChange={(holdMs) =>
                      patch({ reveal: { ...reveal, holdMs } })
                    }
                  />
                  <NumberField
                    label="Out ms"
                    value={reveal.exitDurationMs}
                    min={200}
                    onChange={(exitDurationMs) => {
                      const nextReveal = { ...reveal, exitDurationMs };
                      patch({
                        reveal: nextReveal,
                        behaviors: syncRevealExitBehavior(
                          config.behaviors,
                          nextReveal,
                        ),
                      });
                      queueMicrotask(requestShapePreview);
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Exit style">
                    <Select
                      value={revealExit.style}
                      onValueChange={(exitStyle) => {
                        const style = (exitStyle ??
                          "fade") as ShapeRevealExitStyle;
                        const nextReveal = createDefaultReveal({
                          ...reveal,
                          exitStyle: style,
                          exitDirection:
                            style === "wipe" || style === "slide"
                              ? revealExit.direction === "center"
                                ? style === "wipe"
                                  ? "up"
                                  : "left"
                                : revealExit.direction
                              : revealExit.direction,
                        });
                        patch({
                          reveal: nextReveal,
                          behaviors: syncRevealExitBehavior(
                            config.behaviors,
                            nextReveal,
                          ),
                        });
                        queueMicrotask(requestShapePreview);
                      }}
                    >
                      <SelectTrigger className={EDITOR_UI.input}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHAPE_REVEAL_EXIT_STYLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Exit direction">
                    <Select
                      value={revealExit.direction}
                      onValueChange={(exitDirection) => {
                        const nextReveal = createDefaultReveal({
                          ...reveal,
                          exitStyle: revealExit.style,
                          exitDirection: (exitDirection ??
                            "center") as ShapeRevealExitDirection,
                        });
                        patch({
                          reveal: nextReveal,
                          behaviors: syncRevealExitBehavior(
                            config.behaviors,
                            nextReveal,
                          ),
                        });
                        queueMicrotask(requestShapePreview);
                      }}
                    >
                      <SelectTrigger className={EDITOR_UI.input}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHAPE_REVEAL_EXIT_DIRECTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <p className={EDITOR_UI.helper}>
                  Exit is also listed under Behaviors as Reveal Exit —
                  wipe/slide use the direction above.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent(SHAPE_BEHAVIOR_REPLAY_EVENT, {
                        detail: { objectId: object.id },
                      }),
                    )
                  }
                >
                  Preview reveal
                </Button>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {section === "behaviors" ? (
        <section className="space-y-3">
          <div className="space-y-2">
            <p className={EDITOR_UI.label}>Shape behaviors</p>
            <p className={EDITOR_UI.helper}>
              Entrance behaviors are exclusive. Travel Across / Cascade spawn
              multiple clones that cross the layer.
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2">
              {SHAPE_BEHAVIOR_OPTIONS.map((opt) => {
                const type = opt.value as ShapeBehaviorType;
                const existing = config.behaviors.find((b) => b.type === type);
                const checked = Boolean(existing?.enabled);
                const isRevealExit = type === "reveal_exit";
                const isTravel = isTravelBehaviorType(type);
                const requestPreview = () => {
                  window.dispatchEvent(
                    new CustomEvent(SHAPE_BEHAVIOR_REPLAY_EVENT, {
                      detail: { objectId: object.id },
                    }),
                  );
                };
                return (
                  <div
                    key={type}
                    className="space-y-1.5 rounded-md px-2 py-1.5 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {opt.label}
                        </p>
                        {existing ? (
                          <p className={EDITOR_UI.helper}>
                            {existing.durationMs}ms
                            {existing.loop ? " · loop" : ""}
                            {isRevealExit && existing.exitDirection
                              ? ` · ${existing.exitDirection}`
                              : ""}
                            {isTravel && existing.travelDirection
                              ? ` · ${existing.travelCount ?? 5} · ${existing.travelDirection}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                      <Switch
                        checked={checked}
                        onCheckedChange={(enabled) => {
                          const strokeTypes = [
                            "draw_on",
                            "border_build",
                            "outline_sweep",
                            "trace",
                            "edge_sweep",
                          ];
                          if (enabled) {
                            const next = isRevealExit
                              ? defaultRevealExitBehavior({
                                  durationMs: reveal.exitDurationMs,
                                  exitStyle: normalizeRevealExit(
                                    reveal.exitStyle,
                                    reveal.exitDirection,
                                  ).style,
                                  exitDirection: normalizeRevealExit(
                                    reveal.exitStyle,
                                    reveal.exitDirection,
                                  ).direction,
                                })
                              : createShapeBehavior(type);
                            const behaviors = withExclusiveEntranceBehavior(
                              config.behaviors,
                              next,
                            );
                            patch({
                              behaviors,
                              ...(isRevealExit
                                ? {
                                    reveal: createDefaultReveal({
                                      ...reveal,
                                      enabled: true,
                                      exitDurationMs: next.durationMs,
                                      exitStyle: next.exitStyle,
                                      exitDirection: next.exitDirection,
                                    }),
                                  }
                                : {}),
                              ...(strokeTypes.includes(type)
                                ? {
                                    strokeStyle:
                                      config.strokeStyle === "none"
                                        ? ("solid" as const)
                                        : config.strokeStyle,
                                    strokeWidth: Math.max(
                                      3,
                                      config.strokeWidth || 0,
                                    ),
                                    strokeColor:
                                      config.strokeColor || "#5B8DEF",
                                  }
                                : {}),
                            });
                            queueMicrotask(requestPreview);
                          } else if (existing) {
                            patch({
                              behaviors: config.behaviors.map((b) =>
                                b.type === type ? { ...b, enabled: false } : b,
                              ),
                            });
                          }
                        }}
                      />
                    </div>
                    {isRevealExit && checked && existing ? (
                      <div className="grid grid-cols-2 gap-2 pb-1 pl-0.5">
                        <Select
                          value={
                            normalizeRevealExit(
                              existing.exitStyle ?? reveal.exitStyle,
                              existing.exitDirection ?? reveal.exitDirection,
                            ).style
                          }
                          onValueChange={(exitStyle) => {
                            const style = (exitStyle ??
                              "fade") as ShapeRevealExitStyle;
                            const direction =
                              style === "wipe" || style === "slide"
                                ? (existing.exitDirection ??
                                    reveal.exitDirection) === "center"
                                  ? style === "wipe"
                                    ? "up"
                                    : "left"
                                  : (existing.exitDirection ??
                                    reveal.exitDirection)
                                : (existing.exitDirection ??
                                  reveal.exitDirection);
                            const nextReveal = createDefaultReveal({
                              ...reveal,
                              enabled: true,
                              exitStyle: style,
                              exitDirection: direction,
                              exitDurationMs: existing.durationMs,
                            });
                            patch({
                              reveal: nextReveal,
                              behaviors: syncRevealExitBehavior(
                                config.behaviors,
                                nextReveal,
                              ),
                            });
                            queueMicrotask(requestShapePreview);
                          }}
                        >
                          <SelectTrigger className={EDITOR_UI.input}>
                            <SelectValue placeholder="Style" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHAPE_REVEAL_EXIT_STYLE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={
                            normalizeRevealExit(
                              existing.exitStyle ?? reveal.exitStyle,
                              existing.exitDirection ?? reveal.exitDirection,
                            ).direction
                          }
                          onValueChange={(exitDirection) => {
                            const nextReveal = createDefaultReveal({
                              ...reveal,
                              enabled: true,
                              exitDirection: (exitDirection ??
                                "center") as ShapeRevealExitDirection,
                              exitStyle: existing.exitStyle ?? reveal.exitStyle,
                              exitDurationMs: existing.durationMs,
                            });
                            patch({
                              reveal: nextReveal,
                              behaviors: syncRevealExitBehavior(
                                config.behaviors,
                                nextReveal,
                              ),
                            });
                            queueMicrotask(requestShapePreview);
                          }}
                        >
                          <SelectTrigger className={EDITOR_UI.input}>
                            <SelectValue placeholder="Direction" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHAPE_REVEAL_EXIT_DIRECTION_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    {isTravel && checked && existing ? (
                      <div className="space-y-1.5 pb-1 pl-0.5">
                        <Select
                          value={existing.travelDirection ?? "right"}
                          onValueChange={(travelDirection) => {
                            patch({
                              behaviors: config.behaviors.map((b) =>
                                b.type === type
                                  ? {
                                      ...b,
                                      travelDirection: (travelDirection ??
                                        "right") as ShapeTravelDirection,
                                    }
                                  : b,
                              ),
                            });
                            queueMicrotask(requestPreview);
                          }}
                        >
                          <SelectTrigger className={EDITOR_UI.input}>
                            <SelectValue placeholder="Direction" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHAPE_TRAVEL_DIRECTION_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-3 gap-2">
                          <NumberField
                            label="Count"
                            value={existing.travelCount ?? 5}
                            min={2}
                            max={16}
                            onChange={(travelCount) => {
                              patch({
                                behaviors: config.behaviors.map((b) =>
                                  b.type === type
                                    ? { ...b, travelCount }
                                    : b,
                                ),
                              });
                              queueMicrotask(requestPreview);
                            }}
                          />
                          <NumberField
                            label="Size %"
                            value={Math.round(
                              (existing.travelSize ?? 0.28) * 100,
                            )}
                            min={12}
                            max={70}
                            onChange={(pct) => {
                              patch({
                                behaviors: config.behaviors.map((b) =>
                                  b.type === type
                                    ? { ...b, travelSize: pct / 100 }
                                    : b,
                                ),
                              });
                              queueMicrotask(requestPreview);
                            }}
                          />
                          <NumberField
                            label="Spread %"
                            value={Math.round(
                              (existing.travelSpread ?? 0.45) * 100,
                            )}
                            min={0}
                            max={100}
                            onChange={(pct) => {
                              patch({
                                behaviors: config.behaviors.map((b) =>
                                  b.type === type
                                    ? { ...b, travelSpread: pct / 100 }
                                    : b,
                                ),
                              });
                              queueMicrotask(requestPreview);
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {config.behaviors.some((b) => b.enabled) ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent(SHAPE_BEHAVIOR_REPLAY_EVENT, {
                        detail: { objectId: object.id },
                      }),
                    )
                  }
                >
                  Preview behaviors
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => patch({ behaviors: [] })}
                >
                  Clear
                </Button>
              </div>
            ) : (
              <p className={EDITOR_UI.helper}>
                Turn on one or more behaviors, then Preview.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {section === "geometry" ? (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Radius"
              value={config.radius}
              min={0}
              onChange={(radius) => patch({ radius })}
            />
            <NumberField
              label="Sides"
              value={config.sides}
              min={3}
              max={24}
              onChange={(sides) => patch({ sides })}
            />
            <NumberField
              label="Star Points"
              value={config.starPoints}
              min={3}
              max={16}
              onChange={(starPoints) => patch({ starPoints })}
            />
            <NumberField
              label="Star Inner"
              value={config.starInnerRadius}
              min={0.1}
              max={0.95}
              step={0.05}
              onChange={(starInnerRadius) => patch({ starInnerRadius })}
            />
            <NumberField
              label="Arrow Head"
              value={config.arrowHeadSize}
              min={0.08}
              max={0.5}
              step={0.02}
              onChange={(arrowHeadSize) => patch({ arrowHeadSize })}
            />
            <NumberField
              label="Padding"
              value={config.padding}
              min={0}
              onChange={(padding) => patch({ padding })}
            />
            <NumberField
              label="Margins"
              value={config.margin}
              min={0}
              onChange={(margin) => patch({ margin })}
            />
            <NumberField
              label="Border Pad"
              value={config.borderPadding}
              min={0}
              onChange={(borderPadding) => patch({ borderPadding })}
            />
          </div>
        </section>
      ) : null}

      {section === "fill" ? (
        <section className="space-y-3">
          <Field label="Fill Mode">
            <Select
              value={config.fillMode}
              onValueChange={(fillMode) =>
                patch({
                  fillMode: (fillMode ?? "solid") as typeof config.fillMode,
                })
              }
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="image">Image Mask</SelectItem>
                <SelectItem value="video">Video Mask</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fill">
            <Input
              type="color"
              value={toColorInput(config.fill)}
              onChange={(e) => patch({ fill: e.target.value, fillMode: "solid" })}
              className="h-9 p-1"
            />
          </Field>
          <Field label="Mask Source">
            <Input
              value={config.maskSrc}
              onChange={(e) => patch({ maskSrc: e.target.value })}
              className={EDITOR_UI.input}
              placeholder="Image / video URL"
            />
          </Field>
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <Label className={EDITOR_UI.label}>Shadow</Label>
            <Switch
              checked={config.shadow.enabled}
              onCheckedChange={(enabled) =>
                patch({ shadow: { ...config.shadow, enabled } })
              }
            />
          </div>
          {config.shadow.enabled ? (
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Blur"
                value={config.shadow.blur}
                min={0}
                onChange={(blur) =>
                  patch({ shadow: { ...config.shadow, blur } })
                }
              />
              <NumberField
                label="Opacity"
                value={config.shadow.opacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(opacity) =>
                  patch({ shadow: { ...config.shadow, opacity } })
                }
              />
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <Label className={EDITOR_UI.label}>Glow</Label>
            <Switch
              checked={config.glow.enabled}
              onCheckedChange={(enabled) =>
                patch({ glow: { ...config.glow, enabled } })
              }
            />
          </div>
          <NumberField
            label="Reflection"
            value={config.reflection}
            min={0}
            max={1}
            step={0.05}
            onChange={(reflection) => patch({ reflection })}
          />
        </section>
      ) : null}

      {section === "border" ? (
        <section className="space-y-3">
          <NumberField
            label="Stroke Width"
            value={config.strokeWidth}
            min={0}
            max={48}
            step={0.5}
            onChange={(strokeWidth) => patch({ strokeWidth })}
          />
          <Field label="Stroke Style">
            <Select
              value={config.strokeStyle}
              onValueChange={(strokeStyle) =>
                patch({
                  strokeStyle: (strokeStyle ??
                    "solid") as typeof config.strokeStyle,
                })
              }
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
                <SelectItem value="double">Double</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Stroke Color">
            <Input
              type="color"
              value={toColorInput(config.strokeColor)}
              onChange={(e) => patch({ strokeColor: e.target.value })}
              className="h-9 p-1"
            />
          </Field>
        </section>
      ) : null}

      {section === "gradient" ? (
        <section className="space-y-3">
          <Field label="Type">
            <Select
              value={config.gradient.type}
              onValueChange={(type) =>
                patch({
                  gradient: {
                    ...config.gradient,
                    type: (type ?? "linear") as "linear" | "radial",
                  },
                  fillMode: "gradient",
                })
              }
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="radial">Radial</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <NumberField
            label="Angle"
            value={config.gradient.angle}
            min={0}
            max={360}
            onChange={(angle) =>
              patch({
                gradient: { ...config.gradient, angle },
                fillMode: "gradient",
              })
            }
          />
          {config.gradient.stops.map((stop, index) => (
            <div key={`stop-${index}`} className="grid grid-cols-2 gap-2">
              <Field label={`Stop ${index + 1}`}>
                <Input
                  type="color"
                  value={toColorInput(stop.color)}
                  onChange={(e) => {
                    const stops = config.gradient.stops.map((s, i) =>
                      i === index ? { ...s, color: e.target.value } : s,
                    );
                    patch({
                      gradient: { ...config.gradient, stops },
                      fillMode: "gradient",
                    });
                  }}
                  className="h-9 p-1"
                />
              </Field>
              <NumberField
                label="Offset"
                value={stop.offset}
                min={0}
                max={1}
                step={0.05}
                onChange={(offset) => {
                  const stops = config.gradient.stops.map((s, i) =>
                    i === index ? { ...s, offset } : s,
                  );
                  patch({
                    gradient: { ...config.gradient, stops },
                    fillMode: "gradient",
                  });
                }}
              />
            </div>
          ))}
        </section>
      ) : null}

      {section === "glass" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <Label className={EDITOR_UI.label}>Glass Material</Label>
            <Switch
              checked={config.glass.enabled}
              onCheckedChange={(enabled) =>
                patch({
                  glass: { ...config.glass, enabled },
                  material: enabled ? "glass" : config.material,
                })
              }
            />
          </div>
          <NumberField
            label="Blur"
            value={config.glass.blur}
            min={0}
            max={40}
            onChange={(blur) => patch({ glass: { ...config.glass, blur } })}
          />
          <NumberField
            label="Opacity"
            value={config.glass.opacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(opacity) =>
              patch({ glass: { ...config.glass, opacity } })
            }
          />
          <NumberField
            label="Noise"
            value={config.glass.noise}
            min={0}
            max={1}
            step={0.05}
            onChange={(noise) => patch({ glass: { ...config.glass, noise } })}
          />
          <NumberField
            label="Reflection"
            value={config.glass.reflection}
            min={0}
            max={1}
            step={0.05}
            onChange={(reflection) =>
              patch({ glass: { ...config.glass, reflection } })
            }
          />
        </section>
      ) : null}

      {section === "corners" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <Label className={EDITOR_UI.label}>Uniform Corners</Label>
            <Switch
              checked={config.uniformCorners}
              onCheckedChange={(uniformCorners) => patch({ uniformCorners })}
            />
          </div>
          {config.uniformCorners ? (
            <NumberField
              label="Corner Radius"
              value={config.cornerRadii.topLeft}
              min={0}
              onChange={(r) =>
                patch({
                  cornerRadii: {
                    topLeft: r,
                    topRight: r,
                    bottomRight: r,
                    bottomLeft: r,
                  },
                })
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Top Left"
                value={config.cornerRadii.topLeft}
                min={0}
                onChange={(topLeft) =>
                  patch({
                    cornerRadii: { ...config.cornerRadii, topLeft },
                  })
                }
              />
              <NumberField
                label="Top Right"
                value={config.cornerRadii.topRight}
                min={0}
                onChange={(topRight) =>
                  patch({
                    cornerRadii: { ...config.cornerRadii, topRight },
                  })
                }
              />
              <NumberField
                label="Bottom Right"
                value={config.cornerRadii.bottomRight}
                min={0}
                onChange={(bottomRight) =>
                  patch({
                    cornerRadii: { ...config.cornerRadii, bottomRight },
                  })
                }
              />
              <NumberField
                label="Bottom Left"
                value={config.cornerRadii.bottomLeft}
                min={0}
                onChange={(bottomLeft) =>
                  patch({
                    cornerRadii: { ...config.cornerRadii, bottomLeft },
                  })
                }
              />
            </div>
          )}
        </section>
      ) : null}

      {section === "path" ? (
        <section className="space-y-3">
          <p className={EDITOR_UI.helper}>
            Path editor for SVG / Custom Path shapes. Drag points in preview
            when Path section is active.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                patch({
                  kind:
                    config.kind === "svg_path" ? "svg_path" : "custom_path",
                  path: addPathPoint(config.path, 0.5, 0.5, selectedPointId ?? undefined),
                })
              }
            >
              <Plus className="mr-1 size-3.5" />
              Add Point
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!selectedPointId}
              onClick={() => {
                if (!selectedPointId) return;
                patch({ path: deletePathPoint(config.path, selectedPointId) });
                setSelectedPointId(null);
              }}
            >
              Delete Point
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!selectedPointId}
              onClick={() => {
                if (!selectedPointId) return;
                patch({ path: smoothPathPoint(config.path, selectedPointId) });
              }}
            >
              Smooth
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!selectedPointId}
              onClick={() => {
                if (!selectedPointId) return;
                patch({ path: cornerPathPoint(config.path, selectedPointId) });
              }}
            >
              Corner
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!selectedPointId}
              onClick={() => {
                if (!selectedPointId) return;
                patch({ path: mirrorPathHandles(config.path, selectedPointId) });
              }}
            >
              Mirror Handles
            </Button>
          </div>
          <div className="space-y-1">
            {config.path.points.map((pt, index) => (
              <button
                key={pt.id}
                type="button"
                className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-[13px] ${
                  selectedPointId === pt.id
                    ? "border-primary bg-primary/10"
                    : "border-border/60"
                }`}
                onClick={() => setSelectedPointId(pt.id)}
              >
                <span>
                  Point {index + 1} · {pt.x.toFixed(2)}, {pt.y.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  {pt.smooth ? "smooth" : "corner"}
                </span>
              </button>
            ))}
          </div>
          {selectedPointId ? (
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="X"
                value={
                  config.path.points.find((p) => p.id === selectedPointId)?.x ??
                  0
                }
                min={0}
                max={1}
                step={0.01}
                onChange={(x) =>
                  patch({
                    path: movePathPoint(config.path, selectedPointId, x, 
                      config.path.points.find((p) => p.id === selectedPointId)?.y ?? 0,
                    ),
                  })
                }
              />
              <NumberField
                label="Y"
                value={
                  config.path.points.find((p) => p.id === selectedPointId)?.y ??
                  0
                }
                min={0}
                max={1}
                step={0.01}
                onChange={(y) =>
                  patch({
                    path: movePathPoint(
                      config.path,
                      selectedPointId,
                      config.path.points.find((p) => p.id === selectedPointId)?.x ?? 0,
                      y,
                    ),
                  })
                }
              />
            </div>
          ) : null}
          <div className="flex gap-2">
            <AlignLeft className="size-4 text-muted-foreground" />
            <AlignCenter className="size-4 text-muted-foreground" />
            <AlignRight className="size-4 text-muted-foreground" />
            <span className={EDITOR_UI.helper}>
              Bezier handles · curve editing via Smooth / Mirror
            </span>
          </div>
        </section>
      ) : null}

      {section === "library" ? (
        <section className="space-y-3">
          <Field label="Category">
            <Select
              value={libraryCategory}
              onValueChange={(value) =>
                setLibraryCategory((value ?? "all") as typeof libraryCategory)
              }
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {SHAPE_LIBRARY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="space-y-2">
            {libraryItems.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border/60 p-2"
              >
                <p className="text-[14px] font-medium">{item.name}</p>
                <p className={EDITOR_UI.helper}>{item.description}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => commit(applyShapeLibraryItem(object, item))}
                  >
                    Apply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!onAddObject}
                    onClick={() =>
                      onAddObject?.(
                        createShapeFromLibraryItem(item, {
                          x: object.transform.x + 32,
                          y: object.transform.y + 32,
                          sortOrder: object.sort_order + 1,
                          durationMs: object.end_ms - object.start_ms,
                        }),
                      )
                    }
                  >
                    Insert
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {section === "presets" ? (
        <section className="space-y-3">
          {SHAPE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-border/60 px-3 py-2 text-left hover:bg-muted/40"
              onClick={() => commit(applyShapePreset(object, preset))}
            >
              <span className="text-[14px] font-medium">{preset.name}</span>
              <span className={EDITOR_UI.helper}>{preset.group}</span>
            </button>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function toColorInput(value: string) {
  if (value.startsWith("#") && (value.length === 7 || value.length === 4)) {
    return value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value;
  }
  return "#6366F1";
}
