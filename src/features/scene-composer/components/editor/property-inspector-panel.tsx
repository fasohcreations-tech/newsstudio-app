"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import { LayerBehaviorsPanel } from "@/features/scene-composer/components/editor/layer-behaviors-panel";
import { LayerEffectsPanel } from "@/features/scene-composer/components/editor/layer-effects-panel";
import { LayerMotionFields } from "@/features/scene-composer/components/editor/layer-motion-fields";
import { LayerShapePanel } from "@/features/scene-composer/components/editor/layer-shape-panel";
import { MainVideoPropertiesPanel } from "@/features/scene-composer/components/panels/main-video-properties-panel";
import { GNN_001_MAIN_VIDEO_CONTAINER_SLUG } from "@/features/scene-composer/lib/gnn-001-main-video.constants";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import { StoryDataFormPanel } from "@/features/story-production/components/panels/story-data-form-panel";
import { MalayalamFontSelect } from "@/features/story-production/components/form/malayalam-font-select";
import { isLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import { resolveMediaTargetForObject } from "@/features/story-production/lib/resolve-media-target";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

type PropertyInspectorPanelProps = {
  selectedObject: SceneObject | null;
  data: StoryDataRecord;
  organizationId?: string | null;
  storyId?: string | null;
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
  if (object.metadata?.layer === "background" || object.name === "Background") {
    return "background" as const;
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
    /headline|subheadline|reporter/i.test(object.name)
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

/**
 * Dynamic right inspector — changes with the selected object.
 * Story Form remains available as a secondary tab.
 */
export function PropertyInspectorPanel({
  selectedObject,
  data,
  organizationId,
  storyId,
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
  const [tab, setTab] = useState<
    "object" | "animation" | "effects" | "behaviors" | "shape" | "story"
  >(selectedObject ? "object" : "story");

  useEffect(() => {
    setTab((current) => {
      const next = selectedObject ? "object" : "story";
      return current === next ? current : next;
    });
  }, [selectedObject?.id]);

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
          if (
            value === "object" ||
            value === "animation" ||
            value === "effects" ||
            value === "behaviors" ||
            value === "shape" ||
            value === "story"
          ) {
            setTab(value);
          }
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-3 mt-3 grid h-auto grid-cols-6 gap-1">
          <TabsTrigger value="object" className="text-[10px]">
            Object
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
                  <TransformFields
                    object={selectedObject}
                    onObjectPatch={onObjectPatch}
                  />
                  <Separator />
                  {kind === "text" || kind === "ticker" ? (
                    <TextFields
                      data={data}
                      onFieldChange={onFieldChange}
                      kind={kind}
                      selectedObject={selectedObject}
                      onObjectPatch={onObjectPatch}
                    />
                  ) : null}
                  {kind === "logo" || kind === "media" ? (
                    <MediaFields
                      data={data}
                      onFieldChange={onFieldChange}
                      kind={kind}
                      selectedObject={selectedObject}
                      onBrowseMedia={onBrowseMedia}
                    />
                  ) : null}
                  {kind === "optional" ? (
                    <OptionalInfoFields
                      data={data}
                      onFieldChange={onFieldChange}
                      onBrowseMedia={onBrowseMedia}
                      selectedObject={selectedObject}
                    />
                  ) : null}
                  {kind === "clock" || kind === "date" ? (
                    <ClockFields
                      data={data}
                      onFieldChange={onFieldChange}
                      selectedObject={selectedObject}
                      onObjectPatch={onObjectPatch}
                    />
                  ) : null}
                  {kind === "background" ? (
                    <BackgroundFields data={data} onFieldChange={onFieldChange} />
                  ) : null}
                </>
              )}
            </div>
          </ScrollArea>
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
  data,
  onFieldChange,
  kind,
  selectedObject,
  onObjectPatch,
}: {
  data: StoryDataRecord;
  onFieldChange: PropertyInspectorPanelProps["onFieldChange"];
  kind: "text" | "ticker";
  selectedObject: SceneObject | null;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
}) {
  const selectedIsText =
    Boolean(selectedObject) &&
    (selectedObject?.object_type === "text" ||
      selectedObject?.object_type === "rich_text");
  const isPlaceField =
    selectedObject?.metadata?.region_key === "place" ||
    /place/i.test(selectedObject?.name ?? "");
  const fontSize =
    selectedIsText && selectedObject
      ? Number(selectedObject.style.font_size ?? 24)
      : 24;
  const fontWeight =
    selectedIsText && selectedObject
      ? Number(selectedObject.style.font_weight ?? 600)
      : 600;
  const textAlign =
    selectedIsText && selectedObject
      ? String(selectedObject.style.alignment ?? "left")
      : "left";

  const patchTextStyle = (patch: Partial<SceneObject["style"]>) => {
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
      <p className={EDITOR_UI.sectionHeader}>Text</p>
      {kind === "ticker" ? (
        <Field label="Ticker">
          <Input
            value={data.ticker}
            onChange={(e) => onFieldChange("ticker", e.target.value)}
            className={EDITOR_UI.input}
          />
        </Field>
      ) : (
        <>
          {isPlaceField ? (
            <Field label="Place">
              <Input
                value={data.place}
                onChange={(e) => onFieldChange("place", e.target.value)}
                className={EDITOR_UI.input}
              />
            </Field>
          ) : null}
          <Field label="Headline">
            <Input
              value={data.headline}
              onChange={(e) => onFieldChange("headline", e.target.value)}
              className={EDITOR_UI.input}
            />
          </Field>
          <Field label="Subheadline">
            <Input
              value={data.subheadline}
              onChange={(e) => onFieldChange("subheadline", e.target.value)}
              className={EDITOR_UI.input}
            />
          </Field>
          <Field label="Reporter">
            <Input
              value={data.reporter_name}
              onChange={(e) => onFieldChange("reporter_name", e.target.value)}
              className={EDITOR_UI.input}
            />
          </Field>
        </>
      )}
      {selectedIsText ? (
        <>
          <Field label="Headline Size">
            <Input
              type="number"
              min={12}
              max={96}
              step={1}
              value={fontSize}
              onChange={(e) =>
                patchTextStyle({
                  font_size: Math.max(12, Number(e.target.value) || 24),
                })
              }
              className={EDITOR_UI.input}
            />
          </Field>
          <Field label="Font Weight">
            <Select
              value={fontWeight >= 700 ? "bold" : "regular"}
              onValueChange={(value) => {
                const nextWeight = value === "bold" ? 800 : 600;
                const alreadyBold = fontWeight >= 700;
                if (value === "bold" ? alreadyBold : !alreadyBold) return;
                patchTextStyle({ font_weight: nextWeight });
              }}
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title Alignment">
            <Select
              value={textAlign}
              onValueChange={(value) =>
                patchTextStyle({
                  alignment:
                    value === "center" || value === "right" ? value : "left",
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
        </>
      ) : null}
      <Field label="Malayalam Font">
        <MalayalamFontSelect
          value={data.font_family}
          onChange={(value) => onFieldChange("font_family", value)}
          className={EDITOR_UI.input}
        />
      </Field>
      <Field label="Accent Color">
        <Input
          type="color"
          value={data.accent_color || "#1D4ED8"}
          onChange={(e) => onFieldChange("accent_color", e.target.value)}
          className="h-9 p-1"
        />
      </Field>
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

function BackgroundFields({
  data,
  onFieldChange,
}: {
  data: StoryDataRecord;
  onFieldChange: PropertyInspectorPanelProps["onFieldChange"];
}) {
  return (
    <section className="space-y-3">
      <p className={EDITOR_UI.sectionHeader}>Background</p>
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
    </section>
  );
}
