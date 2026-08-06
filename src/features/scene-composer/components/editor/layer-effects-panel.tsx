"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  Plus,
  Trash2,
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
import { Switch } from "@/components/ui/switch";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import {
  EFFECT_CATALOG,
  LIGHT_SWEEP_PATH_OPTIONS,
  addEffect,
  angleForLightSweepPath,
  duplicateEffect,
  getObjectEffectStack,
  removeEffect,
  reorderEffect,
  setEffectEnabled,
  setObjectEffectStack,
  updateEffectParams,
} from "@/features/scene-composer/lib/broadcast-effects";
import type {
  BroadcastEffectInstance,
  BroadcastEffectType,
  LightSweepPath,
} from "@/features/scene-composer/lib/broadcast-effects";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

type LayerEffectsPanelProps = {
  object: SceneObject;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
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

/**
 * Effects tab — stack add/remove/duplicate/reorder + parameter editors.
 */
export function LayerEffectsPanel({
  object,
  onObjectPatch,
}: LayerEffectsPanelProps) {
  const stack = getObjectEffectStack(object);

  const commit = (nextStack: ReturnType<typeof getObjectEffectStack>) => {
    const next = setObjectEffectStack(object, nextStack);
    onObjectPatch(object.id, { metadata: next.metadata });
  };

  const patchParams = (effectId: string, params: Record<string, unknown>) => {
    commit(updateEffectParams(stack, effectId, params));
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={EDITOR_UI.sectionHeader}>Effects</p>
          <p className={EDITOR_UI.helper}>
            Stackable broadcast effects · {stack.effects.length} on this layer
          </p>
        </div>
        {/* Uncontrolled action menu — value={null}+reset re-fired on sync and
            caused Maximum update depth exceeded. Remount clears the label. */}
        <Select
          key={`add-fx-${stack.effects.length}`}
          onValueChange={(value) => {
            if (!value) return;
            commit(addEffect(stack, value as BroadcastEffectType));
          }}
        >
          <SelectTrigger className={`${EDITOR_UI.input} w-[150px]`}>
            <SelectValue placeholder="Add effect" />
          </SelectTrigger>
          <SelectContent>
            {EFFECT_CATALOG.map((item) => (
              <SelectItem key={item.type} value={item.type}>
                <span className="flex items-center gap-1">
                  <Plus className="size-3" />
                  {item.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {stack.effects.length === 0 ? (
        <p className={EDITOR_UI.helper}>
          No effects yet. Add Light Sweep, Glow, Shadow, or Glass.
        </p>
      ) : null}

      <div className="space-y-3">
        {stack.effects.map((effect, index) => (
          <EffectCard
            key={effect.id}
            effect={effect}
            index={index}
            total={stack.effects.length}
            onToggle={(enabled) =>
              commit(setEffectEnabled(stack, effect.id, enabled))
            }
            onDuplicate={() => commit(duplicateEffect(stack, effect.id))}
            onRemove={() => commit(removeEffect(stack, effect.id))}
            onMoveUp={() => commit(reorderEffect(stack, effect.id, "up"))}
            onMoveDown={() => commit(reorderEffect(stack, effect.id, "down"))}
            onParams={(params) => patchParams(effect.id, params)}
          />
        ))}
      </div>
    </div>
  );
}

function EffectCard({
  effect,
  index,
  total,
  onToggle,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onParams,
}: {
  effect: BroadcastEffectInstance;
  index: number;
  total: number;
  onToggle: (enabled: boolean) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onParams: (params: Record<string, unknown>) => void;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Switch checked={effect.enabled} onCheckedChange={onToggle} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium">{effect.name}</p>
          <p className="text-[11px] capitalize text-muted-foreground">
            {effect.category.replace(/_/g, " ")}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7"
          disabled={index === 0}
          onClick={onMoveUp}
          title="Move up"
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7"
          disabled={index >= total - 1}
          onClick={onMoveDown}
          title="Move down"
        >
          <ArrowDown className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7"
          onClick={onDuplicate}
          title="Duplicate"
        >
          <Copy className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7"
          onClick={onRemove}
          title="Remove"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {effect.enabled ? (
        <EffectParamsEditor effect={effect} onParams={onParams} />
      ) : null}
    </div>
  );
}

function EffectParamsEditor({
  effect,
  onParams,
}: {
  effect: BroadcastEffectInstance;
  onParams: (params: Record<string, unknown>) => void;
}) {
  const p = effect.params as Record<string, unknown>;

  if (effect.type === "light_sweep") {
    const path = String(p.path ?? "diagonal") as LightSweepPath;
    return (
      <div className="grid grid-cols-2 gap-2">
        <Field label="Path">
          <Select
            value={path}
            onValueChange={(next) => {
              const nextPath = String(next) as LightSweepPath;
              const presetAngle = angleForLightSweepPath(nextPath);
              onParams({
                path: nextPath,
                ...(presetAngle != null ? { angle: presetAngle } : {}),
              });
            }}
          >
            <SelectTrigger className={EDITOR_UI.input}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIGHT_SWEEP_PATH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <NumberField
          label="Angle"
          value={Number(p.angle ?? 45)}
          min={0}
          max={360}
          onChange={(angle) => onParams({ path: "custom", angle })}
        />
        <NumberField
          label="Start %"
          value={Number(p.start ?? 0)}
          min={0}
          max={100}
          onChange={(start) => onParams({ start })}
        />
        <NumberField
          label="End %"
          value={Number(p.end ?? 100)}
          min={0}
          max={100}
          onChange={(end) => onParams({ end })}
        />
        <NumberField
          label="Peak Width"
          value={Number(p.width ?? 18)}
          min={2}
          max={80}
          onChange={(width) => onParams({ width })}
        />
        <NumberField
          label="Opacity"
          value={Number(p.opacity ?? 0.55)}
          min={0}
          max={1}
          step={0.05}
          onChange={(opacity) => onParams({ opacity })}
        />
        <NumberField
          label="Speed"
          value={Number(p.speed ?? 0.55)}
          min={0.05}
          max={3}
          step={0.05}
          onChange={(speed) => onParams({ speed })}
        />
        <NumberField
          label="Softness"
          value={Number(p.softness ?? 0.45)}
          min={0.05}
          max={1}
          step={0.05}
          onChange={(softness) => onParams({ softness })}
        />
        <NumberField
          label="Repeat Delay (ms)"
          value={Number(p.repeatDelayMs ?? 900)}
          min={0}
          max={5000}
          step={50}
          onChange={(repeatDelayMs) => onParams({ repeatDelayMs })}
        />
        <Field label="Color">
          <Input
            type="color"
            value={String(p.color ?? "#FFFFFF")}
            onChange={(e) => onParams({ color: e.target.value })}
            className={EDITOR_UI.input}
          />
        </Field>
        <Field label="Direction">
          <Select
            value={String(p.direction ?? "forward")}
            onValueChange={(direction) => onParams({ direction })}
          >
            <SelectTrigger className={EDITOR_UI.input}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="forward">Forward</SelectItem>
              <SelectItem value="reverse">Reverse</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Blend Mode">
          <Select
            value={String(p.blendMode ?? "screen")}
            onValueChange={(blendMode) => onParams({ blendMode })}
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
                "hard-light",
                "multiply",
                "plus-lighter",
              ].map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="col-span-2 flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
          <Label className={EDITOR_UI.label}>Loop continuously</Label>
          <Switch
            checked={Boolean(p.loop ?? true)}
            onCheckedChange={(loop) => onParams({ loop })}
          />
        </div>
        <p className={`${EDITOR_UI.helper} col-span-2`}>
          Path sets the travel axis. Start/End % control where the highlight
          enters and exits (0 = near edge, 100 = far edge). Set End below Start
          to reverse travel without flipping Direction.
        </p>
      </div>
    );
  }

  if (effect.type === "outer_glow" || effect.type === "inner_glow") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Field label="Color">
          <Input
            type="color"
            value={String(p.color ?? "#38BDF8")}
            onChange={(e) => onParams({ color: e.target.value })}
            className={EDITOR_UI.input}
          />
        </Field>
        <NumberField
          label="Radius"
          value={Number(p.radius ?? 12)}
          min={0}
          max={80}
          onChange={(radius) => onParams({ radius })}
        />
        <NumberField
          label="Intensity"
          value={Number(p.intensity ?? 0.8)}
          min={0}
          max={2}
          step={0.05}
          onChange={(intensity) => onParams({ intensity })}
        />
        <NumberField
          label="Opacity"
          value={Number(p.opacity ?? 0.7)}
          min={0}
          max={1}
          step={0.05}
          onChange={(opacity) => onParams({ opacity })}
        />
        <Field label="Blend Mode">
          <Select
            value={String(p.blendMode ?? "screen")}
            onValueChange={(blendMode) => onParams({ blendMode })}
          >
            <SelectTrigger className={EDITOR_UI.input}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["normal", "screen", "overlay", "soft-light"].map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    );
  }

  if (effect.type === "drop_shadow" || effect.type === "inner_shadow") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Field label="Color">
          <Input
            type="color"
            value={String(p.color ?? "#000000")}
            onChange={(e) => onParams({ color: e.target.value })}
            className={EDITOR_UI.input}
          />
        </Field>
        <NumberField
          label="Distance"
          value={Number(p.distance ?? 8)}
          min={0}
          max={80}
          onChange={(distance) => onParams({ distance })}
        />
        <NumberField
          label="Blur"
          value={Number(p.blur ?? 16)}
          min={0}
          max={80}
          onChange={(blur) => onParams({ blur })}
        />
        <NumberField
          label="Opacity"
          value={Number(p.opacity ?? 0.4)}
          min={0}
          max={1}
          step={0.05}
          onChange={(opacity) => onParams({ opacity })}
        />
        <NumberField
          label="Angle"
          value={Number(p.angle ?? 225)}
          min={0}
          max={360}
          onChange={(angle) => onParams({ angle })}
        />
      </div>
    );
  }

  if (effect.type === "glass") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Opacity"
          value={Number(p.opacity ?? 0.28)}
          min={0}
          max={1}
          step={0.05}
          onChange={(opacity) => onParams({ opacity })}
        />
        <NumberField
          label="Blur"
          value={Number(p.blur ?? 10)}
          min={0}
          max={40}
          onChange={(blur) => onParams({ blur })}
        />
        <NumberField
          label="Noise"
          value={Number(p.noise ?? 0.12)}
          min={0}
          max={1}
          step={0.05}
          onChange={(noise) => onParams({ noise })}
        />
        <NumberField
          label="Reflection"
          value={Number(p.reflection ?? 0.35)}
          min={0}
          max={1}
          step={0.05}
          onChange={(reflection) => onParams({ reflection })}
        />
      </div>
    );
  }

  // Generic numeric fallbacks for blur / color / outline / noise / particle
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(p)
        .filter(([key]) => key !== "enabled")
        .map(([key, value]) => {
          if (typeof value === "number") {
            return (
              <NumberField
                key={key}
                label={key}
                value={value}
                step={key.includes("opacity") || key.includes("density") ? 0.05 : 1}
                onChange={(next) => onParams({ [key]: next })}
              />
            );
          }
          if (typeof value === "string" && key.toLowerCase().includes("color")) {
            return (
              <Field key={key} label={key}>
                <Input
                  type="color"
                  value={value}
                  onChange={(e) => onParams({ [key]: e.target.value })}
                  className={EDITOR_UI.input}
                />
              </Field>
            );
          }
          return null;
        })}
    </div>
  );
}
