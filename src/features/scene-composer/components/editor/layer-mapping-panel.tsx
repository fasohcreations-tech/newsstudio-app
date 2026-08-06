"use client";

import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import {
  SMART_BINDING_SOURCES,
  SMART_BINDING_SOURCE_LABELS,
  SMART_DATA_TYPES,
  SMART_DATA_TYPE_LABELS,
  SMART_MAPPING_MODE_LABELS,
  SMART_MAPPING_TRANSITIONS,
  SMART_MAPPING_TRANSITION_LABELS,
  getSmartMappingConfig,
  mappingTransitionToMediaStyle,
  patchSmartMappingConfig,
  resolveSmartContainerMapping,
  type SmartDataType,
  type SmartMappingMode,
} from "@/features/scene-composer/lib/story-mapping";
import {
  allowedMappingModesForObject,
  isMediaContainerMappingLayer,
} from "@/features/scene-composer/lib/story-mapping/layer-defaults";
import { patchMediaContainerConfig } from "@/features/scene-composer/lib/media-container";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

type LayerMappingPanelProps = {
  object: SceneObject;
  story: StoryDataRecord;
  storyBindings?: Record<string, string>;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
};

export function LayerMappingPanel({
  object,
  story,
  storyBindings = {},
  organizationName,
  organizationLogoUrl,
  onObjectPatch,
}: LayerMappingPanelProps) {
  const mapping = getSmartMappingConfig(object);
  const isContainer = isMediaContainerMappingLayer(object);
  const allowedModes = allowedMappingModesForObject(object);
  const resolved = useMemo(
    () =>
      resolveSmartContainerMapping(object, story, {
        bindings: storyBindings,
        organizationName,
        organizationLogoUrl,
      }),
    [object, story, storyBindings, organizationName, organizationLogoUrl],
  );

  const commitMapping = (
    patch: Parameters<typeof patchSmartMappingConfig>[1],
  ) => {
    let next = patchSmartMappingConfig(object, patch);
    const nextMapping = getSmartMappingConfig(next);
    if (isMediaContainerMappingLayer(next)) {
      // Keep media_container transition / interval aligned with mapping playback.
      next = patchMediaContainerConfig(
        next,
        {
          transitionStyle: mappingTransitionToMediaStyle(nextMapping.transition),
          intervalMs:
            nextMapping.durationMode === "manual"
              ? nextMapping.durationMs
              : undefined,
        },
        storyBindings,
      );
    }
    onObjectPatch(object.id, {
      content: next.content,
      ...(patch.containerName !== undefined
        ? { name: nextMapping.containerName }
        : null),
    });
  };

  const toggleType = (type: SmartDataType) => {
    const has = mapping.acceptedTypes.includes(type);
    const next = has
      ? mapping.acceptedTypes.filter((item) => item !== type)
      : [...mapping.acceptedTypes, type];
    commitMapping({
      acceptedTypes: next.length > 0 ? next : ["image", "video"],
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className={EDITOR_UI.panelTitle}>Story Mapping</p>
        <p className={EDITOR_UI.helper}>
          Layers never bind directly to Story fields. The Mapping Engine resolves
          Story data into this layer at preview and export time.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className={EDITOR_UI.label}>
          {isContainer ? "Container Name" : "Layer Name"}
        </Label>
        <Input
          className={EDITOR_UI.input}
          value={mapping.containerName}
          onChange={(event) =>
            commitMapping({ containerName: event.target.value })
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label className={EDITOR_UI.label}>Accepted Data Types</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {SMART_DATA_TYPES.map((type) => {
            const active = mapping.acceptedTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                className={`rounded-md border px-2 py-1.5 text-left text-[11px] ${
                  active
                    ? "border-sky-500/50 bg-sky-500/10 text-sky-100"
                    : "border-white/10 text-zinc-400 hover:border-white/20"
                }`}
                onClick={() => toggleType(type)}
              >
                {SMART_DATA_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={EDITOR_UI.label}>Binding Source</Label>
        <Select
          value={mapping.bindingSource}
          onValueChange={(value: string) => commitMapping({ bindingSource: value })}
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SMART_BINDING_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {SMART_BINDING_SOURCE_LABELS[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mapping.bindingSource === "static_value" ? (
        <div className="space-y-1.5">
          <Label className={EDITOR_UI.label}>Static Value</Label>
          <Input
            className={EDITOR_UI.input}
            value={mapping.staticValue}
            onChange={(event) =>
              commitMapping({ staticValue: event.target.value })
            }
            placeholder="URL, library ref, or text"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label className={EDITOR_UI.label}>Mapping Mode</Label>
        <Select
          value={mapping.mappingMode}
          onValueChange={(value: string) =>
            commitMapping({ mappingMode: value as SmartMappingMode })
          }
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedModes.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {SMART_MAPPING_MODE_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className={EDITOR_UI.label}>Fallback</Label>
        <Input
          className={EDITOR_UI.input}
          value={mapping.fallback}
          onChange={(event) => commitMapping({ fallback: event.target.value })}
          placeholder="Used when Story source is empty"
        />
      </div>

      {isContainer ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className={EDITOR_UI.label}>Duration</Label>
              <Select
                value={mapping.durationMode}
                onValueChange={(value: string) =>
                  commitMapping({ durationMode: value as "auto" | "manual" })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={EDITOR_UI.label}>Duration (ms)</Label>
              <Input
                type="number"
                min={500}
                step={100}
                className={EDITOR_UI.input}
                disabled={mapping.durationMode !== "manual"}
                value={mapping.durationMs}
                onChange={(event) =>
                  commitMapping({ durationMs: Number(event.target.value) })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={EDITOR_UI.label}>Transition</Label>
            <Select
              value={mapping.transition}
              onValueChange={(value: string) =>
                commitMapping({ transition: value as typeof mapping.transition })
              }
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SMART_MAPPING_TRANSITIONS.map((transition) => (
                  <SelectItem key={transition} value={transition}>
                    {SMART_MAPPING_TRANSITION_LABELS[transition]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}

      <div className="space-y-2 rounded-md border border-white/10 bg-white/[0.02] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
          Preview
        </p>
        <p className={EDITOR_UI.helper}>
          {resolved.previewLabel}
          {resolved.usedFallback ? " (fallback)" : ""}
        </p>
        {resolved.pages.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No mapped pages yet.</p>
        ) : (
          <ol className="max-h-36 space-y-1 overflow-auto text-[11px] text-zinc-300">
            {resolved.pages.map((page, index) => (
              <li key={`${page.value}-${index}`} className="truncate">
                {index + 1}. [{page.kind}] {page.label || page.value}
              </li>
            ))}
          </ol>
        )}
        {resolved.text ? (
          <p className="truncate text-[11px] text-zinc-400">
            Text: {resolved.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
