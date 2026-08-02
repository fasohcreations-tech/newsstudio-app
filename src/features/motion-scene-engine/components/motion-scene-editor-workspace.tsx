"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Grid3x3, Maximize2, Minimize2, Save, Shield } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SceneCanvasPanel } from "@/features/motion-scene-engine/components/panels/scene-canvas-panel";
import { SceneInspectorPanel } from "@/features/motion-scene-engine/components/panels/scene-inspector-panel";
import { SceneLibraryPanel } from "@/features/motion-scene-engine/components/panels/scene-library-panel";
import { SceneTimelinePanel } from "@/features/motion-scene-engine/components/panels/scene-timeline-panel";
import {
  placeMotionSceneOnTimelineAction,
  updateMotionSceneAction,
} from "@/features/motion-scene-engine/actions/motion-scene.actions";
import { useScenePreview } from "@/features/motion-scene-engine/hooks/use-scene-preview";
import type {
  MotionScene,
  MotionSceneWithRelations,
  SceneCategory,
} from "@/features/motion-scene-engine/types/motion-scene.types";

type MotionSceneEditorWorkspaceProps = {
  initialScene: MotionSceneWithRelations;
  scenes: MotionScene[];
  categories: SceneCategory[];
  projectId?: string | null;
  trackId?: string | null;
};

export function MotionSceneEditorWorkspace({
  initialScene,
  scenes,
  categories,
  projectId,
  trackId,
}: MotionSceneEditorWorkspaceProps) {
  const [scene, setScene] = useState(initialScene);
  const [sceneList, setSceneList] = useState(scenes);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(220);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preview = useScenePreview(scene);

  useEffect(() => {
    setScene(initialScene);
  }, [initialScene]);

  const persist = useCallback(
    (next: MotionSceneWithRelations) => {
      setScene(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const result = await updateMotionSceneAction({
          sceneId: next.id,
          patch: {
            name: next.name,
            duration_ms: next.duration_ms,
            aspect_format: next.aspect_format,
            theme_mode: next.theme_mode,
            properties: next.properties,
            scene_document: next.scene_document,
            canvas: next.canvas,
          },
        });
        if (!result.success) {
          toast.error(result.error ?? "Autosave failed");
        }
      }, 800);
    },
    [],
  );

  const handleUpdate = (patch: Record<string, unknown>) => {
    persist({ ...scene, ...patch } as MotionSceneWithRelations);
  };

  const openScene = (sceneId: string) => {
    window.location.href = projectId
      ? `/creative-studio/scenes/${sceneId}?projectId=${projectId}`
      : `/creative-studio/scenes/${sceneId}`;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href="/creative-studio/scenes" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{scene.name}</p>
          <p className="text-[10px] text-muted-foreground">
            Motion Scene Editor · JSON document · autosave on
          </p>
        </div>
        {projectId && trackId ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8"
            onClick={() => {
              void placeMotionSceneOnTimelineAction({
                sceneId: scene.id,
                projectId,
                trackId,
                startMs: preview.state.playheadMs,
              }).then((result) => {
                if (!result.success) {
                  toast.error(result.error ?? "Failed to place scene");
                  return;
                }
                toast.success("Motion scene placed on project timeline", {
                  action: {
                    label: "Open project",
                    onClick: () => {
                      window.location.href = `/creative-studio/projects/${projectId}`;
                    },
                  },
                });
              });
            }}
          >
            Place at playhead
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => void persist(scene)}
        >
          <Save className="mr-1 size-3.5" />
          Save
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {!leftCollapsed ? (
          <aside className="w-72 shrink-0 border-r border-border/60 bg-card">
            <SceneLibraryPanel
              scenes={sceneList}
              categories={categories}
              projectId={projectId}
              onScenesChange={setSceneList}
              onOpenScene={openScene}
            />
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setLeftCollapsed((v) => !v)}
              aria-label="Toggle library"
            >
              {leftCollapsed ? (
                <Maximize2 className="size-3.5" />
              ) : (
                <Minimize2 className="size-3.5" />
              )}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={preview.toggleGrid}
              aria-label="Toggle grid"
            >
              <Grid3x3 className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={preview.toggleSafeArea}
              aria-label="Toggle safe area"
            >
              <Shield className="size-3.5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1">
            <SceneCanvasPanel
              scene={scene}
              preview={preview.state}
              onSelectLayer={preview.selectLayer}
            />
          </div>

          <div style={{ height: timelineHeight }} className="shrink-0">
            <SceneTimelinePanel
              scene={scene}
              preview={preview.state}
              onSeek={preview.seek}
              onTogglePlay={preview.togglePlay}
              onSelectLayer={preview.selectLayer}
            />
          </div>
        </div>

        {!rightCollapsed ? (
          <aside className="w-80 shrink-0 border-l border-border/60 bg-card">
            <SceneInspectorPanel
              scene={scene}
              selectedLayerId={preview.state.selectedLayerId}
              onUpdate={handleUpdate}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
