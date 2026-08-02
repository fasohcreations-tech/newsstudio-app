"use client";

import Link from "next/link";
import { ExternalLink, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreativeTimelineClip } from "@/features/creative-studio/types/creative-studio.types";
import {
  buildSceneEditorHref,
  parseClipMotionSceneMetadata,
} from "@/features/motion-scene-engine/lib/clip-motion-scene-metadata";
import { MOTION_SCENE_TYPE_LABELS } from "@/features/motion-scene-engine/constants/motion-scene.constants";
import type { MotionSceneType } from "@/features/motion-scene-engine/types/motion-scene.types";

type InspectorPanelProps = {
  clip: CreativeTimelineClip | null;
  onChange: (patch: Partial<CreativeTimelineClip>) => void;
  disabled?: boolean;
  projectId?: string;
  graphicsTrackId?: string | null;
};

export function InspectorPanel({
  clip,
  onChange,
  disabled = false,
  projectId,
  graphicsTrackId = null,
}: InspectorPanelProps) {
  if (!clip) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        Select a clip on the timeline to edit properties.
      </div>
    );
  }

  const motionMeta =
    clip.clip_kind === "graphic"
      ? parseClipMotionSceneMetadata(clip.metadata)
      : null;

  const sceneEditorHref =
    motionMeta?.motionSceneId != null
      ? buildSceneEditorHref({
          sceneId: motionMeta.motionSceneId,
          projectId,
          trackId: graphicsTrackId,
        })
      : null;

  const sceneTypeLabel =
    motionMeta?.sceneType &&
    motionMeta.sceneType in MOTION_SCENE_TYPE_LABELS
      ? MOTION_SCENE_TYPE_LABELS[motionMeta.sceneType as MotionSceneType]
      : motionMeta?.sceneType;

  return (
    <div className="space-y-4 text-sm">
      {clip.clip_kind === "graphic" ? (
        <div className="space-y-2 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
            <Layers className="size-3.5" />
            Motion Scene
          </div>
          {sceneTypeLabel ? (
            <p className="text-[11px] text-muted-foreground">{sceneTypeLabel}</p>
          ) : null}
          {sceneEditorHref ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              nativeButton={false}
              render={<Link href={sceneEditorHref} />}
            >
              <ExternalLink className="size-3.5" />
              Open in Scene Editor
            </Button>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              No linked motion scene. Create one from the Scene library.
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="clip-name">Name</Label>
        <Input
          id="clip-name"
          value={clip.name}
          disabled={disabled}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Start (ms)</Label>
          <Input
            type="number"
            value={clip.start_ms}
            disabled={disabled}
            onChange={(e) =>
              onChange({ start_ms: Number(e.target.value) || 0 })
            }
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label>End (ms)</Label>
          <Input
            type="number"
            value={clip.end_ms}
            disabled={disabled}
            onChange={(e) =>
              onChange({ end_ms: Number(e.target.value) || 0 })
            }
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Position X</Label>
          <Input
            type="number"
            value={clip.position_x}
            onChange={(e) =>
              onChange({ position_x: Number(e.target.value) || 0 })
            }
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label>Position Y</Label>
          <Input
            type="number"
            value={clip.position_y}
            onChange={(e) =>
              onChange({ position_y: Number(e.target.value) || 0 })
            }
            className="h-8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clip-scale">
          Scale ({Number(clip.scale).toFixed(2)})
        </Label>
        <input
          id="clip-scale"
          type="range"
          min={10}
          max={300}
          step={1}
          value={Number(clip.scale) * 100}
          onChange={(e) =>
            onChange({ scale: Number(e.target.value) / 100 })
          }
          className="w-full accent-primary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clip-rotation">
          Rotation ({Number(clip.rotation).toFixed(0)}°)
        </Label>
        <input
          id="clip-rotation"
          type="range"
          min={-180}
          max={180}
          step={1}
          value={Number(clip.rotation)}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clip-opacity">Opacity</Label>
        <input
          id="clip-opacity"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Number(clip.opacity) * 100}
          onChange={(e) =>
            onChange({ opacity: Number(e.target.value) / 100 })
          }
          className="w-full accent-primary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clip-volume">Volume</Label>
        <input
          id="clip-volume"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Number(clip.volume) * 100}
          onChange={(e) =>
            onChange({ volume: Number(e.target.value) / 100 })
          }
          className="w-full accent-primary"
        />
      </div>

      <div className="space-y-1">
        <Label>Speed (placeholder)</Label>
        <Input
          type="number"
          value={clip.speed}
          disabled
          className="h-8"
        />
        <p className="text-[10px] text-muted-foreground">
          Speed changes will ship with the render pipeline.
        </p>
      </div>
    </div>
  );
}
