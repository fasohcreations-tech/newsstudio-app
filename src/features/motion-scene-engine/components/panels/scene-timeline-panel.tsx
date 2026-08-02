"use client";

import { Button } from "@/components/ui/button";
import type {
  MotionSceneWithRelations,
  SceneEditorState,
} from "@/features/motion-scene-engine/types/motion-scene.types";

type SceneTimelinePanelProps = {
  scene: MotionSceneWithRelations;
  preview: SceneEditorState;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onSelectLayer: (layerId: string | null) => void;
};

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export function SceneTimelinePanel({
  scene,
  preview,
  onSeek,
  onTogglePlay,
  onSelectLayer,
}: SceneTimelinePanelProps) {
  const duration = scene.duration_ms || preview.durationMs;

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-border/60 bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 px-2 text-xs"
          onClick={onTogglePlay}
        >
          {preview.isPlaying ? "Pause" : "Play"}
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatMs(preview.playheadMs)} / {formatMs(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration}
          value={preview.playheadMs}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="ml-auto w-48"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
          Layer Tracks
        </p>
        {scene.scene_document.layers.map((layer) => {
          const layerDuration = layer.end_ms - layer.start_ms;
          const widthPct = (duration > 0 ? layerDuration / duration : 0) * 100;
          const leftPct = (duration > 0 ? layer.start_ms / duration : 0) * 100;
          const selected = preview.selectedLayerId === layer.id;

          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onSelectLayer(layer.id)}
              className="mb-2 flex w-full items-center gap-2 rounded-md border border-border/40 p-2 text-left hover:bg-muted/40"
            >
              <span className="w-28 truncate text-xs">{layer.name}</span>
              <div className="relative h-6 flex-1 rounded bg-muted/50">
                <div
                  className={`absolute top-0 h-full rounded ${selected ? "bg-primary/70" : "bg-primary/40"}`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
              </div>
              <span className="w-16 text-right text-[10px] text-muted-foreground">
                {layer.start_ms}–{layer.end_ms}ms
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
