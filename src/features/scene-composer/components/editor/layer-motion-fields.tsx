"use client";

import { useState } from "react";
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
  ENTRANCE_ANIMATION_OPTIONS,
  EXIT_ANIMATION_OPTIONS,
  IDLE_ANIMATION_OPTIONS,
  MOTION_EASING_OPTIONS,
  MOTION_IDLE_AXIS_OPTIONS,
  MOTION_IDLE_PIVOT_OPTIONS,
  DEFAULT_IDLE_SWIVEL_AMPLITUDE_DEG,
  DEFAULT_IDLE_PATH_RADIUS_PX,
  getLayerMotionConfig,
  patchLayerMotionConfig,
} from "@/features/scene-composer/lib/motion-animation";
import type {
  MotionEasing,
  MotionEntranceType,
  MotionExitType,
  MotionIdleAxis,
  MotionIdlePivot,
  MotionIdleType,
} from "@/features/scene-composer/lib/motion-animation";
import {
  applyMotionPresetToObject,
  getAppliedPresetName,
  getCategoryLabel,
  useMotionPresetLibrary,
} from "@/features/scene-composer/lib/motion-presets";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

type LayerMotionFieldsProps = {
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

/**
 * Animation property inspector — entrance / idle / exit + preset apply/save.
 */
export function LayerMotionFields({
  object,
  onObjectPatch,
  onPreview,
}: LayerMotionFieldsProps) {
  const motion = getLayerMotionConfig(object);
  const library = useMotionPresetLibrary();
  const appliedName = getAppliedPresetName(object);
  const [saveName, setSaveName] = useState("");

  const apply = (
    patch: Parameters<typeof patchLayerMotionConfig>[1],
  ) => {
    const next = patchLayerMotionConfig(object, patch);
    onObjectPatch(object.id, { metadata: next.metadata });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={EDITOR_UI.sectionHeader}>Animation</p>
        {onPreview ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={EDITOR_UI.button}
            onClick={onPreview}
            title="Play from the start to preview entrance, idle, and exit"
          >
            Preview
          </Button>
        ) : null}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Selecting a layer auto-plays its motion. Preview restarts the full scene
        from 0.
      </p>

      <Field label="Motion Preset">
        <Select
          value={
            typeof object.metadata?.motion_preset_id === "string"
              ? object.metadata.motion_preset_id
              : undefined
          }
          onValueChange={(value) => {
            const preset = library.getById(value ?? "");
            if (!preset) return;
            const next = applyMotionPresetToObject(object, preset);
            onObjectPatch(object.id, { metadata: next.metadata });
          }}
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue placeholder="Apply from library…" />
          </SelectTrigger>
          <SelectContent>
            {library.catalog.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {getCategoryLabel(preset.category)} · {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {appliedName ? (
          <p className="text-[11px] text-muted-foreground">
            Applied: {appliedName}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Full library opens above the timeline.
          </p>
        )}
      </Field>

      <div className="flex flex-col gap-2 rounded-md border border-border/50 p-2">
        <Input
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Save current as custom preset…"
          className={EDITOR_UI.input}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={EDITOR_UI.button}
          onClick={() => {
            const saved = library.saveFromMotion(
              saveName || `${object.name} Preset`,
              motion,
            );
            const next = applyMotionPresetToObject(object, saved);
            onObjectPatch(object.id, { metadata: next.metadata });
            setSaveName("");
          }}
        >
          Save custom preset
        </Button>
      </div>

      <Field label="Entrance Animation">
        <Select
          value={motion.entrance.type}
          onValueChange={(value) =>
            apply({
              entrance: { type: (value ?? "none") as MotionEntranceType },
            })
          }
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTRANCE_ANIMATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (ms)">
          <Input
            type="number"
            min={0}
            step={50}
            value={motion.entrance.durationMs}
            onChange={(e) =>
              apply({
                entrance: {
                  durationMs: Math.max(0, Number(e.target.value) || 0),
                },
              })
            }
            className={EDITOR_UI.input}
          />
        </Field>
        <Field label="Delay (ms)">
          <Input
            type="number"
            min={0}
            step={50}
            value={motion.entrance.delayMs}
            onChange={(e) =>
              apply({
                entrance: {
                  delayMs: Math.max(0, Number(e.target.value) || 0),
                },
              })
            }
            className={EDITOR_UI.input}
          />
        </Field>
      </div>

      <Field label="Easing">
        <Select
          value={motion.entrance.easing}
          onValueChange={(value) =>
            apply({
              entrance: { easing: (value ?? "ease_out") as MotionEasing },
            })
          }
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOTION_EASING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Idle Animation">
        <Select
          value={motion.idle.type}
          onValueChange={(value) =>
            apply({
              idle: { type: (value ?? "none") as MotionIdleType },
            })
          }
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IDLE_ANIMATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {motion.idle.type === "orbit" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Path Radius (px)">
              <Input
                type="number"
                min={4}
                max={400}
                step={4}
                value={motion.idle.pathRadius ?? DEFAULT_IDLE_PATH_RADIUS_PX}
                onChange={(e) =>
                  apply({
                    idle: {
                      pathRadius: Math.max(4, Number(e.target.value) || 4),
                    },
                  })
                }
                className={EDITOR_UI.input}
              />
            </Field>
            <Field label="Idle Speed">
              <Input
                type="number"
                min={0.1}
                max={4}
                step={0.1}
                value={motion.idle.speed}
                onChange={(e) =>
                  apply({
                    idle: {
                      speed: Math.max(0.05, Number(e.target.value) || 1),
                    },
                  })
                }
                className={EDITOR_UI.input}
              />
            </Field>
          </div>
          <Field label="Start Angle (°)">
            <Input
              type="number"
              min={-360}
              max={360}
              step={5}
              value={motion.idle.offset ?? 0}
              onChange={(e) =>
                apply({
                  idle: {
                    offset: Number(e.target.value) || 0,
                  },
                })
              }
              className={EDITOR_UI.input}
            />
          </Field>
          <p className="text-[11px] text-muted-foreground">
            Loops forever around the object’s home position. Increase radius for
            a bigger circle path.
          </p>
        </>
      ) : null}

      {motion.idle.type === "rotate" || motion.idle.type === "swivel" ? (
        <>
          <Field label="3D Axis">
            <Select
              value={motion.idle.axis ?? "z"}
              onValueChange={(value) =>
                apply({
                  idle: { axis: (value ?? "z") as MotionIdleAxis },
                })
              }
            >
              <SelectTrigger className={EDITOR_UI.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTION_IDLE_AXIS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} — {opt.hint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              X = tumble, Y = turn (card flip), Z = flat spin
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label={
                motion.idle.type === "swivel"
                  ? "Swing (±°)"
                  : "Spin (°/sec)"
              }
            >
              <Input
                type="number"
                min={1}
                max={180}
                step={1}
                value={
                  motion.idle.amplitude ?? DEFAULT_IDLE_SWIVEL_AMPLITUDE_DEG
                }
                onChange={(e) =>
                  apply({
                    idle: {
                      amplitude: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                className={EDITOR_UI.input}
              />
            </Field>
            <Field label="Idle Speed">
              <Input
                type="number"
                min={0.1}
                max={4}
                step={0.1}
                value={motion.idle.speed}
                onChange={(e) =>
                  apply({
                    idle: {
                      speed: Math.max(0.05, Number(e.target.value) || 1),
                    },
                  })
                }
                className={EDITOR_UI.input}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rest Angle (°)">
              <Input
                type="number"
                min={-180}
                max={180}
                step={1}
                value={motion.idle.offset ?? 0}
                onChange={(e) =>
                  apply({
                    idle: {
                      offset: Number(e.target.value) || 0,
                    },
                  })
                }
                className={EDITOR_UI.input}
              />
            </Field>
            <Field label="Pivot">
              <Select
                value={motion.idle.pivot ?? "center"}
                onValueChange={(value) =>
                  apply({
                    idle: {
                      pivot: (value ?? "center") as MotionIdlePivot,
                    },
                  })
                }
              >
                <SelectTrigger className={EDITOR_UI.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTION_IDLE_PIVOT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Y-axis tip: try Pivot Left/Right for a door-hinge card turn. Rest
            Angle shifts the center of the swing.
          </p>
        </>
      ) : null}

      <Field label="Exit Animation">
        <Select
          value={motion.exit.type}
          onValueChange={(value) =>
            apply({
              exit: { type: (value ?? "none") as MotionExitType },
            })
          }
        >
          <SelectTrigger className={EDITOR_UI.input}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXIT_ANIMATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Exit Duration (ms)">
          <Input
            type="number"
            min={0}
            step={50}
            value={motion.exit.durationMs}
            onChange={(e) =>
              apply({
                exit: {
                  durationMs: Math.max(0, Number(e.target.value) || 0),
                },
              })
            }
            className={EDITOR_UI.input}
          />
        </Field>
        <Field label="Speed">
          <Input
            type="number"
            min={0.1}
            max={4}
            step={0.1}
            value={motion.speed}
            onChange={(e) =>
              apply({
                speed: Math.max(0.05, Number(e.target.value) || 1),
              })
            }
            className={EDITOR_UI.input}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2">
        <Label className={EDITOR_UI.label}>Loop idle</Label>
        <Switch
          checked={motion.idle.loop}
          onCheckedChange={(checked) =>
            apply({ idle: { loop: Boolean(checked) } })
          }
        />
      </div>
    </section>
  );
}
