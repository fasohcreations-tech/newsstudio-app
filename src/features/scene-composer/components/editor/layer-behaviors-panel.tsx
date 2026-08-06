"use client";

import { useEffect, useState } from "react";
import { Copy, Play, Save } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import {
  EDGE_SWEEP_PRESETS,
  EDGE_SWEEP_STYLE_OPTIONS,
  applyEdgeSweepPreset,
  createDefaultEdgeSweep,
  getEdgeSweepConfig,
  patchEdgeSweepConfig,
  setEdgeSweepConfig,
} from "@/features/scene-composer/lib/edge-sweep";
import type {
  EdgeSweepBlendMode,
  EdgeSweepConfig,
  EdgeSweepCornerStyle,
  EdgeSweepDirection,
  EdgeSweepLoopMode,
  EdgeSweepStyle,
} from "@/features/scene-composer/lib/edge-sweep";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

const CUSTOM_PRESET_STORAGE_KEY = "mediaos.composer.edge-sweep-custom-presets.v1";

type LayerBehaviorsPanelProps = {
  object: SceneObject;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
  onPreview?: () => void;
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
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={EDITOR_UI.input}
      />
    </Field>
  );
}

function loadCustomPresets(): Array<{ id: string; name: string; config: EdgeSweepConfig }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomPresets(
  presets: Array<{ id: string; name: string; config: EdgeSweepConfig }>,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_PRESET_STORAGE_KEY, JSON.stringify(presets));
}

/**
 * Behaviors tab — Edge Sweep controls (enable, preview, duplicate, save preset).
 */
export function LayerBehaviorsPanel({
  object,
  onObjectPatch,
  onPreview,
}: LayerBehaviorsPanelProps) {
  const config = getEdgeSweepConfig(object);
  const [saveName, setSaveName] = useState("");
  // Load from localStorage after mount — reading during render breaks SSR hydration.
  const [customPresets, setCustomPresets] = useState<
    Array<{ id: string; name: string; config: EdgeSweepConfig }>
  >([]);

  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  const commit = (next: SceneObject) => {
    if (next === object) return;
    onObjectPatch(object.id, { metadata: next.metadata });
  };

  const patch = (partial: Partial<EdgeSweepConfig>) => {
    commit(patchEdgeSweepConfig(object, partial));
  };

  const requestPreview = () => {
    window.dispatchEvent(
      new CustomEvent("mediaos:edge-sweep-preview", {
        detail: { objectId: object.id },
      }),
    );
    onPreview?.();
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className={EDITOR_UI.sectionHeader}>Behaviors</p>
        <p className={EDITOR_UI.helper}>
          Reusable object behaviors · Edge Sweep perimeter highlight
        </p>
      </div>

      <section className="space-y-3 rounded-md border border-border/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className={EDITOR_UI.sectionHeader}>Edge Sweep</p>
          <div className="ml-auto flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => patch({ enabled })}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={EDITOR_UI.button}
              onClick={requestPreview}
            >
              <Play className="mr-1 size-3.5" />
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={EDITOR_UI.button}
              onClick={() => {
                const copy = createDefaultEdgeSweep({
                  ...config,
                  enabled: true,
                });
                commit(setEdgeSweepConfig(object, copy));
              }}
              title="Duplicate current settings onto this layer"
            >
              <Copy className="mr-1 size-3.5" />
              Duplicate
            </Button>
          </div>
        </div>

        <Field label="Preset">
          {/* Uncontrolled action menu — value={null}+reset caused max update depth. */}
          <Select
            key={`edge-preset-${object.id}`}
            onValueChange={(value) => {
              if (!value) return;
              const builtin = EDGE_SWEEP_PRESETS.find((p) => p.id === value);
              if (builtin) {
                commit(applyEdgeSweepPreset(object, builtin));
                return;
              }
              const custom = customPresets.find((p) => p.id === value);
              if (custom) {
                commit(
                  setEdgeSweepConfig(object, {
                    ...custom.config,
                    enabled: true,
                  }),
                );
              }
            }}
          >
            <SelectTrigger className={EDITOR_UI.input}>
              <SelectValue placeholder="Apply Edge Sweep preset…" />
            </SelectTrigger>
            <SelectContent>
              {EDGE_SWEEP_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
              {customPresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  Custom · {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex flex-col gap-2 rounded-md border border-border/40 p-2">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Save as preset name…"
            className={EDITOR_UI.input}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={EDITOR_UI.button}
            onClick={() => {
              const name = saveName.trim() || `${object.name} Edge Sweep`;
              const next = [
                ...customPresets,
                {
                  id: `custom.edge.${Date.now().toString(36)}`,
                  name,
                  config: { ...config, enabled: true },
                },
              ];
              setCustomPresets(next);
              saveCustomPresets(next);
              setSaveName("");
            }}
          >
            <Save className="mr-1 size-3.5" />
            Save as Preset
          </Button>
        </div>

        {config.enabled ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Sweep Style">
              <Select
                value={config.style}
                onValueChange={(style) =>
                  patch({ style: (style ?? "single") as EdgeSweepStyle })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDGE_SWEEP_STYLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Sweep Color">
              <Input
                type="color"
                value={config.color}
                onChange={(e) => patch({ color: e.target.value })}
                className={EDITOR_UI.input}
              />
            </Field>

            <NumberField
              label="Sweep Width"
              value={config.width}
              min={1}
              max={12}
              step={0.25}
              onChange={(width) => patch({ width })}
            />
            <NumberField
              label="Sweep Length"
              value={config.length}
              min={0.04}
              max={0.6}
              step={0.01}
              onChange={(length) => patch({ length })}
            />
            <NumberField
              label="Brightness"
              value={config.brightness}
              min={0.5}
              max={2}
              step={0.05}
              onChange={(brightness) => patch({ brightness })}
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
              label="Speed"
              value={config.speed}
              min={0.05}
              max={2}
              step={0.05}
              onChange={(speed) => patch({ speed })}
            />
            <NumberField
              label="Margin"
              value={
                config.margins
                  ? (config.margins.top +
                      config.margins.right +
                      config.margins.bottom +
                      config.margins.left) /
                    4
                  : config.margin
              }
              min={-40}
              max={80}
              step={1}
              onChange={(margin) =>
                patch({
                  margin,
                  margins: null,
                })
              }
            />
            <p className={`${EDITOR_UI.helper} col-span-2`}>
              Margin pulls the sweep path in from the item edges (negative =
              outside). Use per-side fields to offset one edge only.
            </p>
            <NumberField
              label="Margin Top"
              value={config.margins?.top ?? config.margin}
              min={-40}
              max={80}
              step={1}
              onChange={(top) => patch({ margins: { top } })}
            />
            <NumberField
              label="Margin Right"
              value={config.margins?.right ?? config.margin}
              min={-40}
              max={80}
              step={1}
              onChange={(right) => patch({ margins: { right } })}
            />
            <NumberField
              label="Margin Bottom"
              value={config.margins?.bottom ?? config.margin}
              min={-40}
              max={80}
              step={1}
              onChange={(bottom) => patch({ margins: { bottom } })}
            />
            <NumberField
              label="Margin Left"
              value={config.margins?.left ?? config.margin}
              min={-40}
              max={80}
              step={1}
              onChange={(left) => patch({ margins: { left } })}
            />
            <Field label="Direction">
              <Select
                value={config.direction}
                onValueChange={(direction) =>
                  patch({
                    direction: (direction ??
                      "clockwise") as EdgeSweepDirection,
                  })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clockwise">Clockwise</SelectItem>
                  <SelectItem value="counterclockwise">
                    Counter-clockwise
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Loop">
              <Select
                value={config.loop}
                onValueChange={(loop) =>
                  patch({
                    loop: (loop ?? "continuous") as EdgeSweepLoopMode,
                  })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continuous">Continuous</SelectItem>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="on_hover">On Hover</SelectItem>
                  <SelectItem value="on_scene_start">On Scene Start</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Corner Style">
              <Select
                value={config.cornerStyle}
                onValueChange={(cornerStyle) =>
                  patch({
                    cornerStyle: (cornerStyle ??
                      "rounded") as EdgeSweepCornerStyle,
                  })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="sharp">Sharp</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Blend Mode">
              <Select
                value={config.blendMode}
                onValueChange={(blendMode) =>
                  patch({
                    blendMode: (blendMode ?? "screen") as EdgeSweepBlendMode,
                  })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "normal",
                    "screen",
                    "overlay",
                    "soft-light",
                    "plus-lighter",
                  ].map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <NumberField
              label="Glow Intensity"
              value={config.glowIntensity}
              min={0}
              max={1.5}
              step={0.05}
              onChange={(glowIntensity) => patch({ glowIntensity })}
            />
            <NumberField
              label="Trail Length"
              value={config.trailLength}
              min={0}
              max={1.5}
              step={0.05}
              onChange={(trailLength) => patch({ trailLength })}
            />
            <NumberField
              label="Trail Fade"
              value={config.trailFade}
              min={0}
              max={1}
              step={0.05}
              onChange={(trailFade) => patch({ trailFade })}
            />
          </div>
        ) : (
          <p className={EDITOR_UI.helper}>
            Enable Edge Sweep or apply a preset to edit parameters.
          </p>
        )}
      </section>
    </div>
  );
}
