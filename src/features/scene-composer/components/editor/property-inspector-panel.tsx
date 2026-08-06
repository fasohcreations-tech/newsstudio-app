"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  FolderOpen,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import { LayerBehaviorsPanel } from "@/features/scene-composer/components/editor/layer-behaviors-panel";
import { LayerEffectsPanel } from "@/features/scene-composer/components/editor/layer-effects-panel";
import { LayerMappingPanel } from "@/features/scene-composer/components/editor/layer-mapping-panel";
import { LayerMotionFields } from "@/features/scene-composer/components/editor/layer-motion-fields";
import { LayerShapePanel } from "@/features/scene-composer/components/editor/layer-shape-panel";
import { MainVideoPropertiesPanel } from "@/features/scene-composer/components/panels/main-video-properties-panel";
import { GNN_001_MAIN_VIDEO_CONTAINER_SLUG } from "@/features/scene-composer/lib/gnn-001-main-video.constants";
import {
  getMediaContainerConfig,
  isBackgroundContainerObject,
  isSmartContainerObject,
  mediaContainerToBackgroundStoryPatch,
  patchMediaContainerConfig,
} from "@/features/scene-composer/lib/media-container";
import { getSmartMappingConfig, resolveSmartContainerMapping, storyDataFromBindings } from "@/features/scene-composer/lib/story-mapping";
import {
  getShapeConfig,
  isPureShapeObjectType,
  isShapeComposerActive,
  patchShapeConfig,
  SHAPE_METADATA_KEY,
} from "@/features/scene-composer/lib/shape-composer";
import {
  resolveTextLayerStyle,
  TEXT_LAYER_BINDING_KEYS,
  parseTextBindingToken,
} from "@/features/scene-composer/lib/text-layer";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import { StoryDataFormPanel } from "@/features/story-production/components/panels/story-data-form-panel";
import { MalayalamFontSelect } from "@/features/story-production/components/form/malayalam-font-select";
import { STORY_MALAYALAM_FONT_OPTIONS } from "@/features/story-production/constants/story-font-options";
import { isLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import { resolveMediaTargetForObject } from "@/features/story-production/lib/resolve-media-target";
import { isTextLikeObject } from "@/features/story-production/services/story-preview.service";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

/** Color inputs need #rrggbb; fall back when style holds rgba(). */
function toColorInputValue(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const rgba = value
    .trim()
    .match(
      /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+)?\s*\)$/i,
    );
  if (rgba) {
    const toHex = (channel: string) => {
      const n = Math.min(255, Math.max(0, Math.round(Number(channel))));
      return n.toString(16).padStart(2, "0");
    };
    return `#${toHex(rgba[1])}${toHex(rgba[2])}${toHex(rgba[3])}`;
  }
  return fallback;
}

/** Property Inspector tabs (Feature 040 single-workspace inspector). */
export type InspectorTab =
  | "object"
  | "text"
  | "transform"
  | "animation"
  | "effects"
  | "behaviors"
  | "shape"
  | "bindings"
  | "mapping"
  | "story";

const INSPECTOR_TABS: InspectorTab[] = [
  "object",
  "text",
  "transform",
  "animation",
  "effects",
  "behaviors",
  "shape",
  "bindings",
  "mapping",
  "story",
];

function isInspectorTab(value: string): value is InspectorTab {
  return (INSPECTOR_TABS as string[]).includes(value);
}

type PropertyInspectorPanelProps = {
  selectedObject: SceneObject | null;
  data: StoryDataRecord;
  organizationId?: string | null;
  storyId?: string | null;
  instanceMode?: boolean;
  /** Deep-link support — legacy per-feature routes open the matching tab. */
  initialTab?: InspectorTab;
  onFieldChange: <K extends keyof StoryDataRecord>(
    key: K,
    value: StoryDataRecord[K],
  ) => void;
  onFieldsPatch?: (patch: Partial<StoryDataRecord>) => void;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
  onClearSelection: () => void;
  onBrowseMedia?: () => void;
  onPreviewMotion?: () => void;
  onAddShapeObject?: (object: SceneObject) => void;
  onDeleteObject?: (id: string) => void;
  onDuplicateObject?: (object: SceneObject) => void;
  onToggleShapeAllLayers?: (enabled: boolean) => void;
  allLayersShapeEnabled?: boolean;
};

function classifyObject(object: SceneObject | null) {
  if (!object) return "none" as const;
  if (
    object.metadata?.component_slug === GNN_001_MAIN_VIDEO_CONTAINER_SLUG ||
    object.metadata?.layer === "main_video_container" ||
    object.name === "Main Video Container"
  ) {
    return "video" as const;
  }
  if (isBackgroundContainerObject(object)) {
    return "background" as const;
  }
  if (isSmartContainerObject(object)) {
    return "smart_container" as const;
  }
  if (
    object.metadata?.region_key === "optional-info" ||
    object.metadata?.component_slug === "gnn-001-optional-info" ||
    object.name === "Optional Information Area"
  ) {
    return "optional" as const;
  }
  if (object.object_type === "logo" || object.name.toLowerCase().includes("logo")) {
    return "logo" as const;
  }
  if (object.object_type === "video" || object.object_type === "image") {
    return "media" as const;
  }
  if (object.object_type === "clock" || object.name.toLowerCase().includes("clock")) {
    return "clock" as const;
  }
  if (
    object.metadata?.region_key === "meta-info-bar" ||
    object.metadata?.component_slug === "gnn-001-meta-info-bar"
  ) {
    return "clock" as const;
  }
  if (object.object_type === "date" || object.name.toLowerCase().includes("date")) {
    return "date" as const;
  }
  if (
    object.object_type === "ticker" ||
    object.name.toLowerCase().includes("ticker")
  ) {
    return "ticker" as const;
  }
  if (
    ["text", "rich_text"].includes(object.object_type) ||
    isTextLikeObject(object) ||
    /headline|subheadline|reporter|quote|paragraph|verse/i.test(object.name)
  ) {
    return "text" as const;
  }
  return "generic" as const;
}

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

/** Click-to-expand group for multi-property attributes (Stroke, Shadow, …). */
function AttributeGroup({
  title,
  summary,
  active = false,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  active?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`rounded-md border ${
        active ? "border-sky-500/40 bg-sky-500/5" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-200">
          {title}
        </span>
        {summary ? (
          <span className="truncate text-[10px] text-zinc-500">{summary}</span>
        ) : null}
        <ChevronDown
          className={`size-3.5 shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? <div className="space-y-3 border-t border-white/10 p-3">{children}</div> : null}
    </div>
  );
}

/** Number field that commits on every valid change + blur (reliable font size). */
function StyleNumberField({
  label,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(String(valueRef.current));
      return;
    }
    let next = parsed;
    if (typeof min === "number") next = Math.max(min, next);
    if (typeof max === "number") next = Math.min(max, next);
    setDraft(String(next));
    if (next !== valueRef.current) onCommit(next);
  };

  return (
    <Field label={label}>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          if (typeof min === "number" && parsed < min) return;
          if (typeof max === "number" && parsed > max) return;
          if (parsed !== valueRef.current) onCommit(parsed);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className={EDITOR_UI.input}
      />
    </Field>
  );
}

function ObjectFlagToggle({
  label,
  pressed,
  onPressedChange,
}: {
  label: string;
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-300">
      <button
        type="button"
        role="switch"
        aria-checked={pressed}
        aria-label={label}
        onClick={() => onPressedChange(!pressed)}
        className={`relative inline-flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${
          pressed ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`block size-4 rounded-full bg-background shadow-sm transition-transform ${
            pressed ? "translate-x-[14px]" : "translate-x-0.5"
          }`}
        />
      </button>
      {label}
    </div>
  );
}

function ObjectFields({
  object,
  onObjectPatch,
}: {
  object: SceneObject;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
}) {
  const layerKind =
    typeof object.metadata?.layer_kind === "string"
      ? object.metadata.layer_kind
      : object.object_type;
  const isLayerShape = isPureShapeObjectType(object.object_type);
  const shapeActive = isLayerShape && isShapeComposerActive(object);
  const shape = shapeActive ? getShapeConfig(object) : null;
  const fillValue =
    shape?.fill && shape.fill !== "transparent"
      ? shape.fill
      : typeof object.style.fill === "string"
        ? object.style.fill
        : "#6366F1";
  const strokeValue =
    shape?.strokeColor ||
    (typeof object.style.stroke_color === "string"
      ? object.style.stroke_color
      : "#94A3B8");

  const commitShapePatch = (
    partial: Parameters<typeof patchShapeConfig>[1],
  ) => {
    const next = patchShapeConfig(object, { ...partial, enabled: true });
    const shapeMeta = next.metadata?.[SHAPE_METADATA_KEY];
    onObjectPatch(next.id, {
      style: { ...next.style },
      transform: { ...next.transform },
      metadata: {
        ...next.metadata,
        ...(shapeMeta && typeof shapeMeta === "object"
          ? {
              [SHAPE_METADATA_KEY]: {
                ...(shapeMeta as Record<string, unknown>),
              },
            }
          : null),
      },
    });
  };

  return (
    <section className="space-y-3">
      <p className={EDITOR_UI.sectionHeader}>Object</p>
      <Field label="Name">
        <Input
          value={object.name}
          onChange={(e) =>
            onObjectPatch(object.id, { name: e.target.value })
          }
          className={EDITOR_UI.input}
        />
      </Field>
      <Field label="Type">
        <Input value={String(layerKind)} readOnly className={EDITOR_UI.input} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <ObjectFlagToggle
          label="Visible"
          pressed={object.visible !== false}
          onPressedChange={(visible) =>
            onObjectPatch(object.id, { visible })
          }
        />
        <ObjectFlagToggle
          label="Locked"
          pressed={Boolean(object.locked)}
          onPressedChange={(locked) =>
            onObjectPatch(object.id, { locked })
          }
        />
      </div>
      {isLayerShape ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Fill">
              <input
                type="color"
                value={toColorInputValue(fillValue, "#6366F1")}
                onChange={(e) => {
                  const fill = e.target.value;
                  if (shapeActive || hasShapeMetadata(object)) {
                    commitShapePatch({ fill, fillMode: "solid" });
                    return;
                  }
                  onObjectPatch(object.id, {
                    style: { ...object.style, fill },
                  });
                }}
                className="h-9 w-full cursor-pointer rounded-md border border-border/60 bg-transparent p-1"
              />
            </Field>
            <Field label="Stroke Color">
              <input
                type="color"
                value={toColorInputValue(strokeValue, "#94A3B8")}
                onChange={(e) => {
                  const strokeColor = e.target.value;
                  if (shapeActive || hasShapeMetadata(object)) {
                    commitShapePatch({
                      strokeColor,
                      strokeStyle:
                        shape?.strokeStyle === "none"
                          ? "solid"
                          : (shape?.strokeStyle ?? "solid"),
                      strokeWidth: Math.max(1, shape?.strokeWidth ?? 2),
                    });
                    return;
                  }
                  onObjectPatch(object.id, {
                    style: {
                      ...object.style,
                      stroke_color: strokeColor,
                      stroke_style: "solid",
                      stroke_width: Math.max(
                        1,
                        Number(object.style.stroke_width ?? 2),
                      ),
                    },
                  });
                }}
                className="h-9 w-full cursor-pointer rounded-md border border-border/60 bg-transparent p-1"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StyleNumberField
              label="Stroke Width"
              value={
                shape?.strokeWidth ??
                Number(object.style.stroke_width ?? 0)
              }
              min={0}
              max={48}
              step={0.5}
              onCommit={(strokeWidth) => {
                if (shapeActive || hasShapeMetadata(object)) {
                  commitShapePatch({
                    strokeWidth,
                    strokeStyle:
                      strokeWidth <= 0
                        ? "none"
                        : shape?.strokeStyle === "none"
                          ? "solid"
                          : (shape?.strokeStyle ?? "solid"),
                  });
                  return;
                }
                onObjectPatch(object.id, {
                  style: {
                    ...object.style,
                    stroke_width: strokeWidth,
                    stroke_style:
                      strokeWidth <= 0
                        ? "none"
                        : String(object.style.stroke_style ?? "solid"),
                  },
                });
              }}
            />
            <Field label="Stroke Style">
              <Select
                value={
                  shape?.strokeStyle ??
                  String(object.style.stroke_style ?? "solid")
                }
                onValueChange={(strokeStyle) => {
                  const next = String(strokeStyle ?? "solid") as
                    | "solid"
                    | "dashed"
                    | "dotted"
                    | "double"
                    | "none";
                  if (shapeActive || hasShapeMetadata(object)) {
                    commitShapePatch({
                      strokeStyle: next,
                      strokeWidth:
                        next === "none"
                          ? shape?.strokeWidth ?? 0
                          : Math.max(1, shape?.strokeWidth ?? 2),
                    });
                    return;
                  }
                  onObjectPatch(object.id, {
                    style: {
                      ...object.style,
                      stroke_style: next,
                      stroke_width:
                        next === "none"
                          ? Number(object.style.stroke_width ?? 0)
                          : Math.max(
                              1,
                              Number(object.style.stroke_width ?? 2),
                            ),
                    },
                  });
                }}
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function hasShapeMetadata(object: SceneObject) {
  const raw = object.metadata?.[SHAPE_METADATA_KEY];
  return Boolean(raw) && typeof raw === "object";
}

/**
 * Dynamic right inspector — changes with the selected object.
 * Story Form remains available as a secondary tab.
 */
export function PropertyInspectorPanel({
  selectedObject,
  data,
  organizationId,
  storyId,
  instanceMode = false,
  initialTab,
  onFieldChange,
  onFieldsPatch,
  onObjectPatch,
  onClearSelection,
  onBrowseMedia,
  onPreviewMotion,
  onAddShapeObject,
  onDeleteObject,
  onDuplicateObject,
  onToggleShapeAllLayers,
  allLayersShapeEnabled = false,
}: PropertyInspectorPanelProps) {
  const kind = classifyObject(selectedObject);
  const [tab, setTab] = useState<InspectorTab>(
    initialTab ?? (selectedObject ? "object" : "story"),
  );
  // A deep-linked tab should survive the first selection change, otherwise
  // opening /design?inspector=behaviours would snap straight back to Object.
  const honouredInitialTab = useRef(false);

  useEffect(() => {
    if (initialTab && !honouredInitialTab.current) {
      honouredInitialTab.current = true;
      return;
    }
    setTab((current) => {
      const next = !selectedObject
        ? "story"
        : isTextLikeObject(selectedObject)
          ? "text"
          : "object";
      return current === next ? current : next;
    });
  }, [selectedObject?.id, initialTab]);

  if (kind === "video" && selectedObject) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <Tabs
          value={tab === "story" ? "object" : tab}
          onValueChange={(value) => {
            if (
              value === "object" ||
              value === "animation" ||
              value === "effects" ||
              value === "behaviors" ||
              value === "shape"
            ) {
              setTab((current) => (current === value ? current : value));
            }
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-3 mt-3 grid h-auto grid-cols-5 gap-1">
            <TabsTrigger value="object" className="text-[11px]">
              Object
            </TabsTrigger>
            <TabsTrigger value="animation" className="text-[11px]">
              Animation
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-[11px]">
              Effects
            </TabsTrigger>
            <TabsTrigger value="behaviors" className="text-[11px]">
              Behaviors
            </TabsTrigger>
            <TabsTrigger value="shape" className="text-[11px]">
              Shape
            </TabsTrigger>
          </TabsList>
          <TabsContent value="object" className="min-h-0 flex-1">
            <MainVideoPropertiesPanel
              data={data}
              onFieldChange={onFieldChange}
              onClearSelection={onClearSelection}
              onBrowseMedia={onBrowseMedia}
              selectedObject={selectedObject}
              onObjectPatch={onObjectPatch}
              onPreviewMotion={onPreviewMotion}
            />
          </TabsContent>
          <TabsContent value="animation" className="min-h-0 flex-1">
            {tab === "animation" ? (
              <ScrollArea className="h-full">
                <div className="p-4">
                  <LayerMotionFields
                    object={selectedObject}
                    onObjectPatch={onObjectPatch}
                    onPreview={onPreviewMotion}
                  />
                </div>
              </ScrollArea>
            ) : null}
          </TabsContent>
          <TabsContent value="effects" className="min-h-0 flex-1">
            {tab === "effects" ? (
              <ScrollArea className="h-full">
                <LayerEffectsPanel
                  object={selectedObject}
                  onObjectPatch={onObjectPatch}
                />
              </ScrollArea>
            ) : null}
          </TabsContent>
          <TabsContent value="behaviors" className="min-h-0 flex-1">
            {tab === "behaviors" ? (
              <ScrollArea className="h-full">
                <LayerBehaviorsPanel
                  object={selectedObject}
                  onObjectPatch={onObjectPatch}
                  onPreview={onPreviewMotion}
                />
              </ScrollArea>
            ) : null}
          </TabsContent>
          <TabsContent value="shape" className="min-h-0 flex-1">
            {tab === "shape" ? (
              <ScrollArea className="h-full">
                <LayerShapePanel
                  object={selectedObject}
                  onObjectPatch={onObjectPatch}
                  onAddObject={onAddShapeObject}
                  onDeleteObject={onDeleteObject}
                  onDuplicateObject={onDuplicateObject}
                  onToggleAllLayers={onToggleShapeAllLayers}
                  allLayersEnabled={allLayersShapeEnabled}
                />
              </ScrollArea>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/60 p-4">
        <p className={EDITOR_UI.panelTitle}>
          {selectedObject ? selectedObject.name : "Inspector"}
        </p>
        <p className={EDITOR_UI.helper}>
          {selectedObject
            ? `${selectedObject.object_type} · live bindings update preview instantly`
            : "Select an object on the canvas, or edit Story Data"}
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isInspectorTab(value)) setTab(value);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-3 mt-3 grid h-auto grid-cols-5 gap-1">
          <TabsTrigger value="object" className="text-[10px]">
            Object
          </TabsTrigger>
          <TabsTrigger
            value="text"
            className="text-[10px]"
            disabled={!selectedObject}
          >
            Text
          </TabsTrigger>
          <TabsTrigger
            value="transform"
            className="text-[10px]"
            disabled={!selectedObject}
          >
            Transform
          </TabsTrigger>
          <TabsTrigger
            value="animation"
            className="text-[10px]"
            disabled={!selectedObject}
          >
            Animation
          </TabsTrigger>
          <TabsTrigger
            value="effects"
            className="text-[10px]"
            disabled={!selectedObject}
          >
            Effects
          </TabsTrigger>
          <TabsTrigger
            value="behaviors"
            className="text-[10px]"
            disabled={!selectedObject}
          >
            Behaviors
          </TabsTrigger>
          <TabsTrigger value="shape" className="text-[10px]">
            Shape
          </TabsTrigger>
          <TabsTrigger
            value="bindings"
            className="text-[10px]"
            disabled={!selectedObject}
          >
            Bindings
          </TabsTrigger>
          <TabsTrigger
            value="mapping"
            className="text-[10px]"
            disabled={!selectedObject}
          >
            Mapping
          </TabsTrigger>
          <TabsTrigger value="story" className="text-[10px]">
            Story
          </TabsTrigger>
        </TabsList>

        <TabsContent value="object" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {!selectedObject ? (
                <p className={EDITOR_UI.helper}>
                  Click Video, Headline, Reporter, Logo, Ticker, Clock, Date, or
                  Background on the canvas.
                </p>
              ) : (
                <>
                  <ObjectFields
                    object={selectedObject}
                    onObjectPatch={onObjectPatch}
                  />
                  <Separator />
                  <TransformFields
                    object={selectedObject}
                    onObjectPatch={onObjectPatch}
                  />
                  {kind === "text" || kind === "ticker" ? (
                    <p className={EDITOR_UI.helper}>
                      Typography lives on the Text tab.
                    </p>
                  ) : null}
                  {kind === "logo" || kind === "media" ? (
                    <>
                      <Separator />
                      <MediaFields
                        data={data}
                        onFieldChange={onFieldChange}
                        kind={kind}
                        selectedObject={selectedObject}
                        onBrowseMedia={onBrowseMedia}
                      />
                    </>
                  ) : null}
                  {kind === "optional" ? (
                    <>
                      <Separator />
                      <OptionalInfoFields
                        data={data}
                        onFieldChange={onFieldChange}
                        onBrowseMedia={onBrowseMedia}
                        selectedObject={selectedObject}
                      />
                    </>
                  ) : null}
                  {kind === "clock" || kind === "date" ? (
                    <>
                      <Separator />
                      <ClockFields
                        data={data}
                        onFieldChange={onFieldChange}
                        selectedObject={selectedObject}
                        onObjectPatch={onObjectPatch}
                      />
                    </>
                  ) : null}
                  {kind === "background" || kind === "smart_container" ? (
                    <>
                      <Separator />
                      <MediaContainerFields
                        selectedObject={selectedObject}
                        data={data}
                        onFieldChange={onFieldChange}
                        onFieldsPatch={onFieldsPatch}
                        onObjectPatch={onObjectPatch}
                        onBrowseMedia={onBrowseMedia}
                      />
                    </>
                  ) : null}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="text" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {selectedObject && isTextLikeObject(selectedObject) ? (
                <TextFields
                  kind={kind === "ticker" ? "ticker" : "text"}
                  selectedObject={selectedObject}
                  onObjectPatch={onObjectPatch}
                />
              ) : (
                <p className={EDITOR_UI.helper}>
                  Select a text layer (Headline, Paragraph, Ticker, …) to edit
                  typography. Story copy is on the Story tab.
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="transform" className="min-h-0 flex-1">
          {tab === "transform" ? (
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {selectedObject ? (
                  <TransformFields
                    object={selectedObject}
                    onObjectPatch={onObjectPatch}
                  />
                ) : (
                  <p className={EDITOR_UI.helper}>
                    Select a layer to edit its transform.
                  </p>
                )}
              </div>
            </ScrollArea>
          ) : null}
        </TabsContent>

        <TabsContent value="bindings" className="min-h-0 flex-1">
          {tab === "bindings" ? (
            <ScrollArea className="h-full">
              {selectedObject ? (
                <div className="space-y-3 p-4">
                  <p className={EDITOR_UI.panelTitle}>Data Bindings</p>
                  <p className={EDITOR_UI.helper}>
                    Layers never bind directly to Story fields. Use the Mapping
                    tab — the Story Mapping Engine connects Story data to this
                    layer.
                  </p>
                </div>
              ) : (
                <p className={`${EDITOR_UI.helper} p-4`}>
                  Select a layer to bind it to story data.
                </p>
              )}
            </ScrollArea>
          ) : null}
        </TabsContent>

        <TabsContent value="mapping" className="min-h-0 flex-1">
          {tab === "mapping" ? (
            <ScrollArea className="h-full">
              {selectedObject ? (
                <LayerMappingPanel
                  object={selectedObject}
                  story={data}
                  storyBindings={data as unknown as Record<string, string>}
                  onObjectPatch={onObjectPatch}
                />
              ) : (
                <p className={`${EDITOR_UI.helper} p-4`}>
                  Select a layer to edit its Story Mapping.
                </p>
              )}
            </ScrollArea>
          ) : null}
        </TabsContent>

        <TabsContent value="animation" className="min-h-0 flex-1">
          {tab === "animation" ? (
            <ScrollArea className="h-full">
              {selectedObject ? (
                <div className="p-4">
                  <LayerMotionFields
                    object={selectedObject}
                    onObjectPatch={onObjectPatch}
                    onPreview={onPreviewMotion}
                  />
                </div>
              ) : (
                <p className={`${EDITOR_UI.helper} p-4`}>
                  Select a layer to edit animation.
                </p>
              )}
            </ScrollArea>
          ) : null}
        </TabsContent>

        <TabsContent value="effects" className="min-h-0 flex-1">
          {tab === "effects" ? (
            <ScrollArea className="h-full">
              {selectedObject ? (
                <LayerEffectsPanel
                  object={selectedObject}
                  onObjectPatch={onObjectPatch}
                />
              ) : (
                <p className={`${EDITOR_UI.helper} p-4`}>
                  Select a layer to edit broadcast effects.
                </p>
              )}
            </ScrollArea>
          ) : null}
        </TabsContent>

        <TabsContent value="behaviors" className="min-h-0 flex-1">
          {tab === "behaviors" ? (
            <ScrollArea className="h-full">
              {selectedObject ? (
                <LayerBehaviorsPanel
                  object={selectedObject}
                  onObjectPatch={onObjectPatch}
                  onPreview={onPreviewMotion}
                />
              ) : (
                <p className={`${EDITOR_UI.helper} p-4`}>
                  Select a layer to edit behaviors.
                </p>
              )}
            </ScrollArea>
          ) : null}
        </TabsContent>

        <TabsContent value="shape" className="min-h-0 flex-1">
          {tab === "shape" ? (
            <ScrollArea className="h-full">
              {selectedObject ? (
                <LayerShapePanel
                  object={selectedObject}
                  onObjectPatch={onObjectPatch}
                  onAddObject={onAddShapeObject}
                  onDeleteObject={onDeleteObject}
                  onDuplicateObject={onDuplicateObject}
                  onToggleAllLayers={onToggleShapeAllLayers}
                  allLayersEnabled={allLayersShapeEnabled}
                />
              ) : (
                <p className={`${EDITOR_UI.helper} p-4`}>
                  Select a layer to edit shapes.
                </p>
              )}
            </ScrollArea>
          ) : null}
        </TabsContent>

        <TabsContent value="story" className="min-h-0 flex-1">
          {tab === "story" ? (
            <StoryDataFormPanel
              data={data}
              organizationId={organizationId}
              storyId={storyId}
              instanceMode={instanceMode}
              onFieldChange={onFieldChange}
              onFieldsPatch={onFieldsPatch}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TransformFields({
  object,
  onObjectPatch,
}: {
  object: SceneObject;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
}) {
  const t = object.transform;
  const patchTransform = (key: keyof typeof t, value: number) => {
    onObjectPatch(object.id, {
      transform: { ...t, [key]: value },
    });
  };

  return (
    <section className="space-y-3">
      <p className={EDITOR_UI.sectionHeader}>Transform</p>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["x", t.x],
            ["y", t.y],
            ["width", t.width],
            ["height", t.height],
            ["scale", t.scale],
            ["rotation", t.rotation],
            ["opacity", t.opacity],
          ] as const
        ).map(([key, value]) => (
          <Field key={key} label={key.toUpperCase()}>
            <Input
              type="number"
              value={value}
              onChange={(e) =>
                patchTransform(key, Number(e.target.value) || 0)
              }
              className={EDITOR_UI.input}
            />
          </Field>
        ))}
      </div>
    </section>
  );
}

function TextFields({
  selectedObject,
  onObjectPatch,
}: {
  kind?: "text" | "ticker";
  selectedObject: SceneObject | null;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
}) {
  const selectedIsText =
    Boolean(selectedObject) && isTextLikeObject(selectedObject!);
  const textStyle = selectedObject
    ? resolveTextLayerStyle(selectedObject)
    : null;
  const bindingKey = selectedObject
    ? parseTextBindingToken(selectedObject.bindings.text)
    : null;
  const contentText =
    typeof selectedObject?.content.text === "string"
      ? selectedObject.content.text
      : "";

  const patchTextStyle = (patch: Record<string, unknown>) => {
    if (!selectedObject || !selectedIsText) return;
    onObjectPatch(selectedObject.id, {
      style: {
        ...selectedObject.style,
        ...patch,
      },
    });
  };

  return (
    <section className="space-y-3">
      <p className={EDITOR_UI.sectionHeader}>Text Layer</p>
      {selectedIsText && selectedObject ? (
        <>
          <Field label="Content">
            <Input
              value={contentText}
              onChange={(e) =>
                onObjectPatch(selectedObject.id, {
                  content: { ...selectedObject.content, text: e.target.value },
                })
              }
              className={EDITOR_UI.input}
              lang="ml"
            />
          </Field>
          <Field label="Data Binding">
            <Select
              value={bindingKey ?? "__none__"}
              onValueChange={(value) => {
                if (value === "__none__") {
                  const next = { ...selectedObject.bindings };
                  delete next.text;
                  onObjectPatch(selectedObject.id, { bindings: next });
                  return;
                }
                onObjectPatch(selectedObject.id, {
                  bindings: {
                    ...selectedObject.bindings,
                    text: `{{${value}}}`,
                  },
                  content: {
                    ...selectedObject.content,
                    text: `{{${value}}}`,
                  },
                });
              }}
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue placeholder="Not bound" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not bound</SelectItem>
                {TEXT_LAYER_BINDING_KEYS.filter(
                  (item, index, list) =>
                    list.findIndex((other) => other.label === item.label) ===
                    index,
                ).map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Separator />
          <p className={EDITOR_UI.sectionHeader}>Typography</p>
          <Field label="Font Family">
            <MalayalamFontSelect
              value={
                typeof selectedObject.style.font_family === "string"
                  ? String(selectedObject.style.font_family)
                  : "noto-sans-malayalam-bold"
              }
              onChange={(value) => {
                const option = STORY_MALAYALAM_FONT_OPTIONS.find(
                  (item) => item.value === value,
                );
                patchTextStyle({
                  font_family: value,
                  ...(option ? { font_weight: option.weight } : null),
                });
              }}
              className={EDITOR_UI.input}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <StyleNumberField
              label="Font Size"
              value={textStyle?.font_size ?? 24}
              min={8}
              max={200}
              step={1}
              onCommit={(font_size) => patchTextStyle({ font_size })}
            />
            <Field label="Weight">
              <Select
                value={String(textStyle?.font_weight ?? 700)}
                onValueChange={(value) =>
                  patchTextStyle({ font_weight: Number(value) || 700 })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">Regular</SelectItem>
                  <SelectItem value="500">Medium</SelectItem>
                  <SelectItem value="600">Semi Bold</SelectItem>
                  <SelectItem value="700">Bold</SelectItem>
                  <SelectItem value="800">Extra Bold</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Switch
                checked={Boolean(textStyle?.italic)}
                onCheckedChange={(checked) =>
                  patchTextStyle({
                    italic: checked,
                    font_style: checked ? "italic" : "normal",
                  })
                }
                aria-label="Italic"
              />
              Italic
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Switch
                checked={Boolean(textStyle?.underline)}
                onCheckedChange={(checked) =>
                  patchTextStyle({ underline: checked })
                }
                aria-label="Underline"
              />
              Underline
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Letter Spacing">
              <Input
                type="number"
                step={0.5}
                value={textStyle?.letter_spacing ?? 0}
                onChange={(e) =>
                  patchTextStyle({
                    letter_spacing: Number(e.target.value) || 0,
                  })
                }
                className={EDITOR_UI.input}
              />
            </Field>
            <Field label="Line Height">
              <Input
                type="number"
                step={0.05}
                min={0.8}
                max={3}
                value={textStyle?.line_height ?? 1.35}
                onChange={(e) =>
                  patchTextStyle({
                    line_height: Math.max(0.8, Number(e.target.value) || 1.35),
                  })
                }
                className={EDITOR_UI.input}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Alignment">
              <Select
                value={textStyle?.alignment ?? "left"}
                onValueChange={(value) =>
                  patchTextStyle({
                    alignment:
                      value === "center" ||
                      value === "right" ||
                      value === "justify"
                        ? value
                        : "left",
                  })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="justify">Justify</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Vertical">
              <Select
                value={textStyle?.vertical_alignment ?? "middle"}
                onValueChange={(value) =>
                  patchTextStyle({
                    vertical_alignment:
                      value === "top" || value === "bottom" ? value : "middle",
                  })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="middle">Middle</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Color">
            <div className="flex gap-2">
              <Input
                type="color"
                value={toColorInputValue(textStyle?.color, "#ffffff")}
                onChange={(e) => patchTextStyle({ color: e.target.value })}
                className="h-9 w-12 shrink-0 p-1"
              />
              <Input
                value={textStyle?.color ?? "#ffffff"}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  if (!next) return;
                  patchTextStyle({ color: next });
                }}
                className={EDITOR_UI.input}
                placeholder="#FFFFFF"
              />
            </div>
          </Field>
          <StyleNumberField
            label="Opacity"
            value={selectedObject.transform.opacity}
            min={0}
            max={1}
            step={0.05}
            onCommit={(opacity) =>
              onObjectPatch(selectedObject.id, {
                transform: { ...selectedObject.transform, opacity },
              })
            }
          />

          <AttributeGroup
            title="Padding"
            summary={`${textStyle?.padding.left ?? 12} / ${textStyle?.padding.top ?? 8}`}
          >
            <div className="grid grid-cols-2 gap-3">
              <StyleNumberField
                label="Pad X"
                value={textStyle?.padding.left ?? 12}
                min={0}
                onCommit={(n) =>
                  patchTextStyle({
                    padding: {
                      ...(textStyle?.padding ?? {
                        top: 8,
                        right: 12,
                        bottom: 8,
                        left: 12,
                      }),
                      left: n,
                      right: n,
                    },
                  })
                }
              />
              <StyleNumberField
                label="Pad Y"
                value={textStyle?.padding.top ?? 8}
                min={0}
                onCommit={(n) =>
                  patchTextStyle({
                    padding: {
                      ...(textStyle?.padding ?? {
                        top: 8,
                        right: 12,
                        bottom: 8,
                        left: 12,
                      }),
                      top: n,
                      bottom: n,
                    },
                  })
                }
              />
            </div>
          </AttributeGroup>

          <AttributeGroup
            title="Background"
            summary={
              selectedObject.style.text_background === true
                ? String(selectedObject.style.fill ?? "on")
                : "None"
            }
            active={selectedObject.style.text_background === true}
          >
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Switch
                checked={selectedObject.style.text_background === true}
                onCheckedChange={(checked) =>
                  patchTextStyle({
                    text_background: checked,
                    fill: checked
                      ? String(selectedObject.style.fill || "rgba(15,23,42,0.92)")
                      : "transparent",
                  })
                }
                aria-label="Show panel behind text"
              />
              Show panel behind text
            </div>
            {selectedObject.style.text_background === true ? (
              <Field label="Fill">
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={toColorInputValue(
                      String(selectedObject.style.fill ?? "#0F172A"),
                      "#0F172A",
                    )}
                    onChange={(e) =>
                      patchTextStyle({
                        text_background: true,
                        fill: e.target.value,
                      })
                    }
                    className="h-9 w-12 shrink-0 p-1"
                  />
                  <Input
                    value={String(selectedObject.style.fill ?? "")}
                    onChange={(e) =>
                      patchTextStyle({
                        text_background: true,
                        fill: e.target.value,
                      })
                    }
                    className={EDITOR_UI.input}
                  />
                </div>
              </Field>
            ) : null}
          </AttributeGroup>

          <AttributeGroup
            title="Stroke"
            summary={
              textStyle?.stroke
                ? `${textStyle.stroke.width}px`
                : "Off"
            }
            active={Boolean(textStyle?.stroke)}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Color">
                <Input
                  type="color"
                  value={toColorInputValue(textStyle?.stroke?.color, "#000000")}
                  onChange={(e) =>
                    patchTextStyle({
                      text_stroke: {
                        color: e.target.value,
                        width: textStyle?.stroke?.width ?? 1,
                      },
                    })
                  }
                  className="h-9 p-1"
                />
              </Field>
              <StyleNumberField
                label="Width"
                value={textStyle?.stroke?.width ?? 0}
                min={0}
                step={0.5}
                onCommit={(width) =>
                  patchTextStyle({
                    text_stroke:
                      width > 0
                        ? {
                            color: textStyle?.stroke?.color ?? "#000000",
                            width,
                          }
                        : null,
                  })
                }
              />
            </div>
          </AttributeGroup>

          <AttributeGroup
            title="Shadow"
            summary={
              textStyle?.shadow ? `blur ${textStyle.shadow.blur}` : "Off"
            }
            active={Boolean(textStyle?.shadow)}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Color">
                <Input
                  type="color"
                  value={toColorInputValue(textStyle?.shadow?.color, "#000000")}
                  onChange={(e) =>
                    patchTextStyle({
                      text_shadow: {
                        color: e.target.value,
                        blur: textStyle?.shadow?.blur ?? 4,
                        offsetX: textStyle?.shadow?.offsetX ?? 0,
                        offsetY: textStyle?.shadow?.offsetY ?? 2,
                      },
                    })
                  }
                  className="h-9 p-1"
                />
              </Field>
              <StyleNumberField
                label="Blur"
                value={textStyle?.shadow?.blur ?? 0}
                min={0}
                onCommit={(blur) =>
                  patchTextStyle({
                    text_shadow:
                      blur > 0 || textStyle?.shadow
                        ? {
                            color: textStyle?.shadow?.color ?? "#000000",
                            blur,
                            offsetX: textStyle?.shadow?.offsetX ?? 0,
                            offsetY: textStyle?.shadow?.offsetY ?? 2,
                          }
                        : null,
                  })
                }
              />
              <StyleNumberField
                label="Offset X"
                value={textStyle?.shadow?.offsetX ?? 0}
                onCommit={(offsetX) =>
                  patchTextStyle({
                    text_shadow: {
                      color: textStyle?.shadow?.color ?? "#000000",
                      blur: textStyle?.shadow?.blur ?? 4,
                      offsetX,
                      offsetY: textStyle?.shadow?.offsetY ?? 2,
                    },
                  })
                }
              />
              <StyleNumberField
                label="Offset Y"
                value={textStyle?.shadow?.offsetY ?? 0}
                onCommit={(offsetY) =>
                  patchTextStyle({
                    text_shadow: {
                      color: textStyle?.shadow?.color ?? "#000000",
                      blur: textStyle?.shadow?.blur ?? 4,
                      offsetX: textStyle?.shadow?.offsetX ?? 0,
                      offsetY,
                    },
                  })
                }
              />
            </div>
          </AttributeGroup>

          <AttributeGroup
            title="Glow"
            summary={
              textStyle?.glow ? `blur ${textStyle.glow.blur}` : "Off"
            }
            active={Boolean(textStyle?.glow)}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Color">
                <Input
                  type="color"
                  value={toColorInputValue(textStyle?.glow?.color, "#60A5FA")}
                  onChange={(e) =>
                    patchTextStyle({
                      text_glow: {
                        color: e.target.value,
                        blur: textStyle?.glow?.blur ?? 12,
                        strength: textStyle?.glow?.strength ?? 1,
                      },
                    })
                  }
                  className="h-9 p-1"
                />
              </Field>
              <StyleNumberField
                label="Blur"
                value={textStyle?.glow?.blur ?? 0}
                min={0}
                onCommit={(blur) =>
                  patchTextStyle({
                    text_glow:
                      blur > 0
                        ? {
                            color: textStyle?.glow?.color ?? "#60A5FA",
                            blur,
                            strength: textStyle?.glow?.strength ?? 1,
                          }
                        : null,
                  })
                }
              />
            </div>
          </AttributeGroup>

          <AttributeGroup
            title="Gradient"
            summary={textStyle?.gradient ? textStyle.gradient.type : "Off"}
            active={Boolean(textStyle?.gradient)}
          >
            <Field label="Stops">
              <Input
                placeholder="linear,180,#fff@0,#38bdf8@1"
                value={
                  textStyle?.gradient
                    ? `${textStyle.gradient.type},${textStyle.gradient.angle},${textStyle.gradient.stops
                        .map((s) => `${s.color}@${s.offset}`)
                        .join(",")}`
                    : ""
                }
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (!raw) {
                    patchTextStyle({ text_gradient: null });
                    return;
                  }
                  const [type, angle, ...stopParts] = raw.split(",");
                  const stops = stopParts
                    .map((part) => {
                      const [color, offset] = part.split("@");
                      if (!color) return null;
                      return {
                        color: color.trim(),
                        offset: Number(offset ?? 0) || 0,
                      };
                    })
                    .filter(
                      (s): s is { color: string; offset: number } => Boolean(s),
                    );
                  if (stops.length < 2) return;
                  patchTextStyle({
                    text_gradient: {
                      type: type === "radial" ? "radial" : "linear",
                      angle: Number(angle) || 180,
                      stops,
                    },
                  });
                }}
                className={EDITOR_UI.input}
              />
            </Field>
            <p className={EDITOR_UI.helper}>
              Format: type,angle,color@0,color@1 — leave empty to clear.
            </p>
          </AttributeGroup>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Switch
                checked={Boolean(textStyle?.auto_width)}
                onCheckedChange={(checked) =>
                  patchTextStyle({ auto_width: checked })
                }
                aria-label="Auto Width"
              />
              Auto Width
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Switch
                checked={Boolean(textStyle?.auto_height)}
                onCheckedChange={(checked) =>
                  patchTextStyle({ auto_height: checked })
                }
                aria-label="Auto Height"
              />
              Auto Height
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Switch
                checked={Boolean(textStyle?.auto_wrap)}
                onCheckedChange={(checked) =>
                  patchTextStyle({ auto_wrap: checked, wrap: checked })
                }
                aria-label="Auto Wrap"
              />
              Auto Wrap
            </div>
          </div>
        </>
      ) : (
        <p className={EDITOR_UI.helper}>
          This layer is not a text object. Select a Headline, Paragraph, or
          Ticker.
        </p>
      )}
    </section>
  );
}

function MediaFields({
  data,
  onFieldChange,
  kind,
  selectedObject,
  onBrowseMedia,
}: {
  data: StoryDataRecord;
  onFieldChange: PropertyInspectorPanelProps["onFieldChange"];
  kind: "logo" | "media";
  selectedObject: SceneObject | null;
  onBrowseMedia?: () => void;
}) {
  const target = resolveMediaTargetForObject(selectedObject);
  const field = target?.field ?? (kind === "logo" ? "logo" : "main_image");
  const value =
    typeof data[field] === "string" ? (data[field] as string) : "";
  const displayValue = isLibraryMediaRef(value)
    ? "Media Library asset"
    : value;

  return (
    <section className="space-y-3">
      <p className={EDITOR_UI.sectionHeader}>
        {kind === "logo" ? "Logo" : target?.label ?? "Media"}
      </p>
      <Field label={kind === "logo" ? "Logo" : "Media"}>
        <Input
          value={displayValue}
          readOnly={isLibraryMediaRef(value)}
          onChange={(e) => onFieldChange(field, e.target.value)}
          className={EDITOR_UI.input}
          placeholder="Media Library or URL"
        />
      </Field>
      {onBrowseMedia ? (
        <Button
          type="button"
          variant="outline"
          className={`${EDITOR_UI.button} w-full`}
          onClick={onBrowseMedia}
        >
          <FolderOpen className="mr-1.5 size-4" />
          Browse Media
        </Button>
      ) : null}
      <Field label="Scale">
        <Input
          value={data.video_scale}
          onChange={(e) => onFieldChange("video_scale", e.target.value)}
          className={EDITOR_UI.input}
        />
      </Field>
      <Field label="Opacity">
        <Input
          value={data.video_opacity}
          onChange={(e) => onFieldChange("video_opacity", e.target.value)}
          className={EDITOR_UI.input}
        />
      </Field>
    </section>
  );
}

function OptionalInfoFields({
  data,
  onFieldChange,
  onBrowseMedia,
  selectedObject,
}: {
  data: StoryDataRecord;
  onFieldChange: PropertyInspectorPanelProps["onFieldChange"];
  onBrowseMedia?: () => void;
  selectedObject: SceneObject | null;
}) {
  const imageField: keyof StoryDataRecord = "optional_info_image";
  const textField: keyof StoryDataRecord = "optional_info_text";
  const rawImageValue = String(data[imageField] ?? "");
  const slides = useMemo(
    () =>
      (rawImageValue || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [rawImageValue],
  );
  const intervalMs = Number(data.optional_info_slide_interval_ms || "3500");
  const transitionMs = Number(data.optional_info_transition_ms || "450");
  const currentIndexRaw = Number(data.optional_info_slide_index || "0");
  const currentIndex = Number.isFinite(currentIndexRaw)
    ? Math.max(0, currentIndexRaw)
    : 0;

  const updateSlides = (next: string[]) => {
    onFieldChange(imageField, next.join(","));
    if (next.length === 0) {
      onFieldChange("optional_info_slide_index", "0");
      return;
    }
    const bounded = Math.min(currentIndex, next.length - 1);
    onFieldChange("optional_info_slide_index", String(bounded));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target]!, next[index]!];
    updateSlides(next);
    if (currentIndex === index) {
      onFieldChange("optional_info_slide_index", String(target));
    } else if (currentIndex === target) {
      onFieldChange("optional_info_slide_index", String(index));
    }
  };

  const removeSlide = (index: number) => {
    const next = slides.filter((_, i) => i !== index);
    updateSlides(next);
  };

  const stepSlide = (delta: -1 | 1) => {
    if (slides.length === 0) return;
    const next = (currentIndex + delta + slides.length) % slides.length;
    onFieldChange("optional_info_slide_index", String(next));
  };

  return (
    <section className="space-y-3">
      <p className={EDITOR_UI.sectionHeader}>Optional Information</p>
      <p className={EDITOR_UI.helper}>
        Queue slides, set transition, and control playback from here.
      </p>
      <Field label="Text">
        <Input
          value={String(data[textField] ?? "")}
          onChange={(e) => onFieldChange(textField, e.target.value)}
          className={EDITOR_UI.input}
          placeholder="Quote, location, verse…"
        />
      </Field>
      <Field label="Image">
        {(() => {
          const raw = rawImageValue;
          const isSingleLibrary = isLibraryMediaRef(raw);
          const isQueue = slides.length > 1;
          const display = isQueue
            ? `${slides.length} slides queued`
            : isSingleLibrary
              ? "Media Library asset"
              : raw;
          return (
            <Input
              value={display}
              readOnly={isSingleLibrary || isQueue}
              onChange={(e) => onFieldChange(imageField, e.target.value)}
              className={EDITOR_UI.input}
              placeholder="Media Library or URL"
            />
          );
        })()}
      </Field>
      {onBrowseMedia ? (
        <Button
          type="button"
          variant="outline"
          className={`${EDITOR_UI.button} w-full`}
          onClick={onBrowseMedia}
        >
          <FolderOpen className="mr-1.5 size-4" />
          Browse Media
        </Button>
      ) : null}
      {slides.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border/60 p-2">
          <p className="text-xs font-medium text-muted-foreground">
            Slide Queue ({slides.length})
          </p>
          <div className="max-h-40 space-y-1 overflow-auto">
            {slides.map((slide, index) => (
              <div
                key={`${slide}-${index}`}
                className="flex items-center gap-1 rounded-md border border-border/50 px-2 py-1"
              >
                <span className="w-5 text-[11px] text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px]">
                  {slide}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={index === 0}
                  onClick={() => moveSlide(index, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={index === slides.length - 1}
                  onClick={() => moveSlide(index, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-destructive"
                  onClick={() => removeSlide(index)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className={EDITOR_UI.button}
          onClick={() => stepSlide(-1)}
          disabled={slides.length <= 1}
        >
          <SkipBack className="mr-1 size-4" />
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          className={EDITOR_UI.button}
          onClick={() => stepSlide(1)}
          disabled={slides.length <= 1}
        >
          <SkipForward className="mr-1 size-4" />
          Next
        </Button>
      </div>
      <Field label="Transition Style">
        <Select
          value={data.optional_info_transition_style || "fade"}
          onValueChange={(value) =>
            onFieldChange("optional_info_transition_style", value || "fade")
          }
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cut">Cut</SelectItem>
            <SelectItem value="fade">Fade</SelectItem>
            <SelectItem value="slide">Slide</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Interval (ms)">
          <Input
            type="number"
            min={1000}
            step={100}
            value={Number.isFinite(intervalMs) ? intervalMs : 3500}
            onChange={(e) =>
              onFieldChange(
                "optional_info_slide_interval_ms",
                String(Math.max(1000, Number(e.target.value) || 3500)),
              )
            }
            className={EDITOR_UI.input}
          />
        </Field>
        <Field label="Transition (ms)">
          <Input
            type="number"
            min={0}
            step={50}
            value={Number.isFinite(transitionMs) ? transitionMs : 450}
            onChange={(e) =>
              onFieldChange(
                "optional_info_transition_ms",
                String(Math.max(0, Number(e.target.value) || 450)),
              )
            }
            className={EDITOR_UI.input}
          />
        </Field>
      </div>
      {rawImageValue ? (
        <Button
          type="button"
          variant="ghost"
          className={`${EDITOR_UI.button} w-full`}
          onClick={() => onFieldChange(imageField, "")}
        >
          Clear Image (show text)
        </Button>
      ) : null}
    </section>
  );
}

function ClockFields({
  data,
  onFieldChange,
  selectedObject,
  onObjectPatch,
}: {
  data: StoryDataRecord;
  onFieldChange: PropertyInspectorPanelProps["onFieldChange"];
  selectedObject: SceneObject | null;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
}) {
  const textAlign = String(selectedObject?.style.alignment ?? "right");
  const patchStyle = (patch: Partial<SceneObject["style"]>) => {
    if (!selectedObject) return;
    onObjectPatch(selectedObject.id, {
      style: {
        ...selectedObject.style,
        ...patch,
      },
    });
  };

  return (
    <section className="space-y-3">
      <p className={EDITOR_UI.sectionHeader}>Clock / Date</p>
      <Field label="Time">
        <Input
          value={data.time}
          onChange={(e) => onFieldChange("time", e.target.value)}
          className={EDITOR_UI.input}
          placeholder="08:00"
        />
      </Field>
      <Field label="Date">
        <Input
          value={data.date}
          onChange={(e) => onFieldChange("date", e.target.value)}
          className={EDITOR_UI.input}
        />
      </Field>
      <Field label="Place">
        <Input
          value={data.place}
          onChange={(e) => onFieldChange("place", e.target.value)}
          className={EDITOR_UI.input}
          placeholder="Location / Place"
        />
      </Field>
      {selectedObject ? (
        <Field label="Text Alignment">
          <Select
            value={
              textAlign === "center" || textAlign === "left"
                ? textAlign
                : "right"
            }
            onValueChange={(value) =>
              patchStyle({
                alignment:
                  value === "center" || value === "left" || value === "right"
                    ? value
                    : "right",
              })
            }
          >
            <SelectTrigger className={EDITOR_UI.input}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      <Field label="Format (placeholder)">
        <Select defaultValue="24h">
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24-hour</SelectItem>
            <SelectItem value="12h">12-hour</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Timezone (placeholder)">
        <Input
          defaultValue="Asia/Kolkata"
          className={EDITOR_UI.input}
          readOnly
        />
      </Field>
    </section>
  );
}

function MediaContainerFields({
  selectedObject,
  data,
  onFieldChange,
  onFieldsPatch,
  onObjectPatch,
  onBrowseMedia,
}: {
  selectedObject: SceneObject | null;
  data: StoryDataRecord;
  onFieldChange: PropertyInspectorPanelProps["onFieldChange"];
  onFieldsPatch?: PropertyInspectorPanelProps["onFieldsPatch"];
  onObjectPatch: PropertyInspectorPanelProps["onObjectPatch"];
  onBrowseMedia?: () => void;
}) {
  const storyBindings = data as unknown as Record<string, string>;
  const isBackground = selectedObject
    ? isBackgroundContainerObject(selectedObject)
    : false;
  const isSmart = selectedObject
    ? isSmartContainerObject(selectedObject)
    : false;
  const smartMapping =
    selectedObject && isSmart ? getSmartMappingConfig(selectedObject) : null;
  const mappingDriven =
    Boolean(isSmart && smartMapping && smartMapping.mappingMode !== "manual");
  const config = selectedObject
    ? getMediaContainerConfig(selectedObject, storyBindings)
    : null;
  const mappedSlides = useMemo(() => {
    if (!selectedObject || !isSmart || !mappingDriven) return null;
    const resolved = resolveSmartContainerMapping(
      selectedObject,
      storyDataFromBindings(storyBindings),
      { bindings: storyBindings },
    );
    return resolved.slidesRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }, [selectedObject, isSmart, mappingDriven, storyBindings]);
  const slides = useMemo(() => {
    if (mappedSlides) return mappedSlides;
    if (!config) return [];
    return config.slides
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }, [mappedSlides, config]);

  if (!selectedObject || !config) return null;

  const currentIndex = Math.min(
    config.slideIndex,
    Math.max(0, slides.length - 1),
  );
  const title = isBackground
    ? "Background Media Container"
    : isSmart
      ? smartMapping?.containerName || "Smart Container"
      : "Media Container";

  const commitConfig = (
    patch: Parameters<typeof patchMediaContainerConfig>[1],
  ) => {
    const patched = patchMediaContainerConfig(
      selectedObject,
      patch,
      storyBindings,
    );
    onObjectPatch(selectedObject.id, { content: patched.content });
    if (isBackground) {
      const next = getMediaContainerConfig(patched, storyBindings);
      const storyPatch = mediaContainerToBackgroundStoryPatch(next);
      if (onFieldsPatch) onFieldsPatch(storyPatch as Partial<StoryDataRecord>);
      else {
        for (const [key, value] of Object.entries(storyPatch)) {
          onFieldChange(key as keyof StoryDataRecord, value as never);
        }
      }
    }
  };

  const updateSlides = (next: string[]) => {
    commitConfig({
      slides: next.join(","),
      slideIndex:
        next.length === 0 ? 0 : Math.min(currentIndex, next.length - 1),
    });
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target]!, next[index]!];
    let slideIndex = currentIndex;
    if (currentIndex === index) slideIndex = target;
    else if (currentIndex === target) slideIndex = index;
    commitConfig({ slides: next.join(","), slideIndex });
  };

  const removeSlide = (index: number) => {
    updateSlides(slides.filter((_, i) => i !== index));
  };

  const stepSlide = (delta: -1 | 1) => {
    if (slides.length === 0) return;
    const next = (currentIndex + delta + slides.length) % slides.length;
    commitConfig({ slideIndex: next });
  };

  return (
    <section className="space-y-3">
      <p className={EDITOR_UI.sectionHeader}>{title}</p>
      <p className={EDITOR_UI.helper}>
        {mappingDriven
          ? "Slide queue is driven by the Mapping tab. Switch Mapping Mode to Manual to browse and edit slides here."
          : "Add images or videos as slides. Browse appends to this container's queue."}
      </p>
      {mappingDriven ? (
        <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
          Driven by Mapping · {smartMapping?.mappingMode} ·{" "}
          {smartMapping?.bindingSource}
        </p>
      ) : null}
      <Field label="Slide Queue">
        <Input
          value={
            slides.length > 1
              ? `${slides.length} slides queued`
              : slides.length === 1 && isLibraryMediaRef(slides[0]!)
                ? "Media Library asset"
                : (slides[0] ?? "")
          }
          readOnly={slides.length > 0 || mappingDriven}
          onChange={(e) =>
            updateSlides(
              e.target.value
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean),
            )
          }
          className={EDITOR_UI.input}
          placeholder="Browse to add image or video slides"
        />
      </Field>
      {onBrowseMedia && !mappingDriven ? (
        <Button
          type="button"
          variant="outline"
          className={`${EDITOR_UI.button} w-full`}
          onClick={onBrowseMedia}
        >
          <FolderOpen className="mr-1.5 size-4" />
          Add Slide
        </Button>
      ) : null}
      {slides.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border/60 p-2">
          <p className="text-xs font-medium text-muted-foreground">
            Slides ({slides.length}) · active #
            {Math.min(currentIndex + 1, slides.length)}
          </p>
          <div className="max-h-40 space-y-1 overflow-auto">
            {slides.map((slide, index) => (
              <div
                key={`${slide}-${index}`}
                className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
                  index === currentIndex
                    ? "border-sky-500/50 bg-sky-500/10"
                    : "border-border/50"
                }`}
              >
                <span className="w-5 text-[11px] text-muted-foreground">
                  {index + 1}
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-[11px] hover:underline"
                  onClick={() => commitConfig({ slideIndex: index })}
                >
                  {isLibraryMediaRef(slide) ? "Library asset" : slide}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={mappingDriven || index === 0}
                  onClick={() => moveSlide(index, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={mappingDriven || index === slides.length - 1}
                  onClick={() => moveSlide(index, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-destructive"
                  disabled={mappingDriven}
                  onClick={() => removeSlide(index)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className={EDITOR_UI.button}
          onClick={() => stepSlide(-1)}
          disabled={slides.length <= 1}
        >
          <SkipBack className="mr-1 size-4" />
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          className={EDITOR_UI.button}
          onClick={() => stepSlide(1)}
          disabled={slides.length <= 1}
        >
          <SkipForward className="mr-1 size-4" />
          Next
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2">
        <Label className="text-xs text-muted-foreground">Autoplay slides</Label>
        <Switch
          checked={config.autoplay}
          onCheckedChange={(checked) => commitConfig({ autoplay: checked })}
        />
      </div>
      <Field label="Transition">
        <Select
          value={config.transitionStyle}
          onValueChange={(value) =>
            commitConfig({ transitionStyle: value || "fade" })
          }
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cut">Cut</SelectItem>
            <SelectItem value="fade">Fade / Cross Fade</SelectItem>
            <SelectItem value="slide">Slide</SelectItem>
            <SelectItem value="push">Push</SelectItem>
            <SelectItem value="zoom">Zoom</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Scale">
        <Select
          value={config.fit}
          onValueChange={(value) => commitConfig({ fit: value || "contain" })}
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Fit — keep aspect ratio</SelectItem>
            <SelectItem value="cover">Fill frame — crop edges</SelectItem>
            <SelectItem value="fill">Stretch — may distort</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Interval (ms)">
          <Input
            type="number"
            min={1000}
            step={100}
            value={config.intervalMs}
            onChange={(e) =>
              commitConfig({
                intervalMs: Math.max(1000, Number(e.target.value) || 5000),
              })
            }
            className={EDITOR_UI.input}
          />
        </Field>
        <Field label="Transition (ms)">
          <Input
            type="number"
            min={0}
            step={50}
            value={config.transitionMs}
            onChange={(e) =>
              commitConfig({
                transitionMs: Math.max(0, Number(e.target.value) || 600),
              })
            }
            className={EDITOR_UI.input}
          />
        </Field>
      </div>
      {isBackground ? (
        <>
          <Field label="Primary">
            <Input
              type="color"
              value={data.primary_color || "#071225"}
              onChange={(e) => onFieldChange("primary_color", e.target.value)}
              className="h-9 p-1"
            />
          </Field>
          <Field label="Secondary">
            <Input
              type="color"
              value={data.secondary_color || "#0B1F3A"}
              onChange={(e) => onFieldChange("secondary_color", e.target.value)}
              className="h-9 p-1"
            />
          </Field>
          <Field label="Accent">
            <Input
              type="color"
              value={data.accent_color || "#1D4ED8"}
              onChange={(e) => onFieldChange("accent_color", e.target.value)}
              className="h-9 p-1"
            />
          </Field>
        </>
      ) : null}
      {slides.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          className={`${EDITOR_UI.button} w-full`}
          onClick={() => updateSlides([])}
        >
          Clear all slides
        </Button>
      ) : null}
    </section>
  );
}
