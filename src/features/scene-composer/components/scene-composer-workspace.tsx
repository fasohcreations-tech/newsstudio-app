"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResizablePanel } from "@/features/platform/components/resizable-panel";
import { placeMotionSceneOnTimelineAction } from "@/features/motion-scene-engine/actions/motion-scene.actions";
import type {
  MotionScene,
  SceneCategory,
} from "@/features/motion-scene-engine/types/motion-scene.types";
import {
  exportComposerSceneAction,
  saveComposerSceneAction,
} from "@/features/scene-composer/actions/scene-composer.actions";
import { EditorCanvas } from "@/features/scene-composer/components/editor/editor-canvas";
import { EDITOR_UI } from "@/features/scene-composer/components/editor/editor.constants";
import { EnhancedTimelinePanel } from "@/features/scene-composer/components/editor/enhanced-timeline-panel";
import { MotionPresetDrawer } from "@/features/scene-composer/components/editor/motion-preset-drawer";
import { PropertyInspectorPanel } from "@/features/scene-composer/components/editor/property-inspector-panel";
import { ResizableTimelineShell } from "@/features/scene-composer/components/editor/resizable-timeline-shell";
import { WORKFLOW_STATE_LABELS } from "@/features/scene-composer/constants/scene-composer.constants";
import {
  useComposerAutosave,
  useComposerDocument,
} from "@/features/scene-composer/hooks/use-composer-document";
import { useComposerCanvas } from "@/features/scene-composer/hooks/use-composer-canvas";
import { useComposerPlayback } from "@/features/scene-composer/hooks/use-composer-playback";
import {
  areShapesEnabledOnAllLayers,
  disableShapeComposerOnAllLayers,
  duplicateShapeObject,
  enableShapeComposerOnAllLayers,
} from "@/features/scene-composer/lib/shape-composer";
import type {
  ComposerScene,
  SceneComponent,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import { StoryAssetsPanel } from "@/features/story-production/components/panels/story-assets-panel";
import { BindingsDebugPanel } from "@/features/story-production/components/panels/bindings-debug-panel";
import { useStoryDataForm } from "@/features/story-production/hooks/use-story-data-form";
import { useResolvedStoryBindings } from "@/features/story-production/hooks/use-resolved-story-bindings";
import {
  defaultTargetForAssetCategory,
  resolveMediaTargetForObject,
  type StoryMediaTarget,
} from "@/features/story-production/lib/resolve-media-target";
import type {
  StoryDataRecord,
  StoryPreviewAspect,
} from "@/features/story-production/types/story-data.types";

type SceneComposerWorkspaceProps = {
  initialScene: ComposerScene;
  scenes: MotionScene[];
  categories: SceneCategory[];
  components: SceneComponent[];
  projectId?: string | null;
  trackId?: string | null;
};

export function SceneComposerWorkspace({
  initialScene,
  scenes: _scenes,
  categories: _categories,
  components: _components,
  projectId,
  trackId,
}: SceneComposerWorkspaceProps) {
  const composer = useComposerDocument(initialScene);
  const playback = useComposerPlayback(
    composer.scene.duration_ms,
    composer.scene.frame_rate,
  );
  const canvas = useComposerCanvas();

  const [timelineZoom, setTimelineZoom] = useState(1);
  const [previewAspect] = useState<StoryPreviewAspect>("1920x1080");
  const [showBindingsDebug, setShowBindingsDebug] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeMediaTarget, setActiveMediaTarget] =
    useState<StoryMediaTarget | null>(null);
  const [browseRequestKey, setBrowseRequestKey] = useState(0);
  const [browseRequestTarget, setBrowseRequestTarget] =
    useState<StoryMediaTarget | null>(null);

  const selectedObject = useMemo(() => {
    const id = canvas.selection.primaryObjectId;
    if (!id) return null;
    return (
      composer.scene.composer_document.objects.find((object) => object.id === id) ??
      null
    );
  }, [canvas.selection.primaryObjectId, composer.scene.composer_document.objects]);

  /** Skip auto-preview on first mount; play layer motion whenever selection changes. */
  const lastMotionPreviewIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const target = resolveMediaTargetForObject(selectedObject);
    if (!target) return;
    setActiveMediaTarget((prev) =>
      prev?.field === target.field && prev?.bindingKey === target.bindingKey
        ? prev
        : target,
    );
  }, [selectedObject?.id]);

  useEffect(() => {
    const id = selectedObject?.id ?? null;
    if (lastMotionPreviewIdRef.current === undefined) {
      lastMotionPreviewIdRef.current = id;
      return;
    }
    if (id && id !== lastMotionPreviewIdRef.current) {
      playback.seek(selectedObject!.start_ms);
      playback.play();
    }
    lastMotionPreviewIdRef.current = id;
  }, [selectedObject?.id, selectedObject?.start_ms, playback.seek, playback.play]);

  const openMediaBrowser = useCallback(
    (object?: SceneObject | null) => {
      const target =
        resolveMediaTargetForObject(object ?? selectedObject) ??
        activeMediaTarget ??
        defaultTargetForAssetCategory("videos");
      if (object) canvas.selectObject(object.id);
      setActiveMediaTarget(target);
      setBrowseRequestTarget(target);
      setBrowseRequestKey((key) => key + 1);
    },
    [activeMediaTarget, canvas, selectedObject],
  );

  const handleBrowseFromCanvas = useCallback(
    (object: SceneObject) => {
      const target = resolveMediaTargetForObject(object);
      if (!target) {
        toast.error("This placeholder does not accept media");
        return;
      }
      canvas.selectObject(object.id);
      setActiveMediaTarget(target);
      setBrowseRequestTarget(target);
      setBrowseRequestKey((key) => key + 1);
    },
    [canvas],
  );

  const sceneMetadataRef = useRef(composer.scene.metadata);
  sceneMetadataRef.current = composer.scene.metadata;

  const handleBindingsChange = useCallback(
    (bindings: Record<string, string>, data: StoryDataRecord) => {
      composer.updateSceneMeta({
        resolved_bindings: bindings,
        metadata: {
          ...(sceneMetadataRef.current ?? {}),
          story_data: data,
          story_data_version: "1.0",
          story_engine_version: "3.7",
        },
      });
    },
    [composer.updateSceneMeta],
  );

  const storyForm = useStoryDataForm({
    scene: composer.scene,
    onBindingsChange: handleBindingsChange,
  });

  const previewBindings = useResolvedStoryBindings(storyForm.bindings);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(
    () => () => {
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
    },
    [],
  );

  const saveScene = useCallback(async (scene: ComposerScene) => {
    setSaveStatus("saving");
    const result = await saveComposerSceneAction({
      sceneId: scene.id,
      name: scene.name,
      duration_ms: scene.duration_ms,
      frame_rate: scene.frame_rate,
      workflow_state: scene.workflow_state,
      composer_settings: scene.composer_settings,
      composer_document: scene.composer_document,
      resolved_bindings: scene.resolved_bindings,
      metadata: scene.metadata,
    });
    if (!result.success) {
      setSaveStatus("error");
      toast.error(result.error ?? "Autosave failed");
      return;
    }
    setSaveStatus("saved");
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current);
    }
    saveStatusTimerRef.current = setTimeout(() => {
      setSaveStatus("idle");
    }, 1800);
  }, []);

  const { schedule } = useComposerAutosave(composer.scene, saveScene);

  useEffect(() => {
    schedule();
  }, [composer.scene, schedule]);

  const setObjects = useCallback(
    (objects: SceneObject[], label?: string) => {
      composer.setObjects(objects, label);
      schedule();
    },
    [composer, schedule],
  );

  const patchObject = useCallback(
    (id: string, patch: Partial<SceneObject>) => {
      const next = composer.scene.composer_document.objects.map((object) => {
        if (object.id !== id) return object;
        return {
          ...object,
          ...patch,
          style: patch.style ? { ...object.style, ...patch.style } : object.style,
          transform: patch.transform
            ? { ...object.transform, ...patch.transform }
            : object.transform,
          metadata: patch.metadata
            ? { ...object.metadata, ...patch.metadata }
            : object.metadata,
          content: patch.content
            ? { ...object.content, ...patch.content }
            : object.content,
        };
      });
      setObjects(next, "Update object");
    },
    [composer.scene.composer_document.objects, setObjects],
  );

  const addShapeObject = useCallback(
    (object: SceneObject) => {
      setObjects(
        [...composer.scene.composer_document.objects, object],
        "Add shape",
      );
      canvas.selectObject(object.id);
    },
    [canvas, composer.scene.composer_document.objects, setObjects],
  );

  const allLayersShapeEnabled = useMemo(
    () =>
      areShapesEnabledOnAllLayers(composer.scene.composer_document.objects),
    [composer.scene.composer_document.objects],
  );

  const toggleShapeAllLayers = useCallback(
    (enabled: boolean) => {
      const objects = composer.scene.composer_document.objects;
      setObjects(
        enabled
          ? enableShapeComposerOnAllLayers(objects)
          : disableShapeComposerOnAllLayers(objects),
        enabled
          ? "Enable shapes on all layers"
          : "Disable shapes on all layers",
      );
      toast.success(
        enabled
          ? "Shape Composer enabled on all layers"
          : "Shape Composer disabled on all layers",
      );
    },
    [composer.scene.composer_document.objects, setObjects],
  );

  const deleteObject = useCallback(
    (id: string) => {
      setObjects(
        composer.scene.composer_document.objects.filter(
          (object) => object.id !== id,
        ),
        "Delete object",
      );
      if (canvas.selection.primaryObjectId === id) {
        canvas.selectObject(null);
      }
    },
    [canvas, composer.scene.composer_document.objects, setObjects],
  );

  const duplicateObject = useCallback(
    (object: SceneObject) => {
      const copy = duplicateShapeObject(object);
      setObjects(
        [...composer.scene.composer_document.objects, copy],
        "Duplicate shape",
      );
      canvas.selectObject(copy.id);
    },
    [canvas, composer.scene.composer_document.objects, setObjects],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        event.preventDefault();
        if (event.shiftKey) composer.redo();
        else composer.undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        void saveScene(composer.scene);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [composer, saveScene]);

  if (!mounted) {
    return (
      <div className="flex h-[calc(100svh-3.5rem-2.25rem)] min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading scene composer...
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100svh-3.5rem-2.25rem)] min-h-0 flex-col overflow-hidden border-y border-border/60 bg-background md:-m-6">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={EDITOR_UI.button}
          nativeButton={false}
          render={<Link href="/creative-studio/scenes" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`${EDITOR_UI.panelTitle} truncate`}>
              {composer.scene.name}
            </p>
            <Badge variant="outline" className="text-[12px]">
              {WORKFLOW_STATE_LABELS[composer.scene.workflow_state]}
            </Badge>
            <Badge variant="secondary" className="text-[12px]">
              Scene Composer
            </Badge>
          </div>
          <p className={EDITOR_UI.helper}>
            Broadcast graphics editor · Live preview · v{composer.scene.version}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={EDITOR_UI.button}
          disabled={!composer.canUndo}
          onClick={() => composer.undo()}
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={EDITOR_UI.button}
          disabled={!composer.canRedo}
          onClick={() => composer.redo()}
        >
          <Redo2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={EDITOR_UI.button}
          onClick={() =>
            void exportComposerSceneAction(composer.scene.id).then((result) => {
              if (!result.success) {
                toast.error(result.error ?? "Export failed");
                return;
              }
              const blob = new Blob([JSON.stringify(result.data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const anchor = window.document.createElement("a");
              anchor.href = url;
              anchor.download = `${composer.scene.name.replace(/\s+/g, "-").toLowerCase()}.scene.json`;
              anchor.click();
              URL.revokeObjectURL(url);
            })
          }
        >
          <Download className="mr-1.5 size-4" />
          Export
        </Button>
        {projectId && trackId ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={EDITOR_UI.button}
            onClick={() =>
              void placeMotionSceneOnTimelineAction({
                sceneId: composer.scene.id,
                projectId,
                trackId,
                startMs: playback.playheadMs,
              }).then((result) => {
                if (!result.success) {
                  toast.error(result.error ?? "Place failed");
                  return;
                }
                toast.success("Scene placed on timeline");
              })
            }
          >
            Place at playhead
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={showBindingsDebug ? "secondary" : "ghost"}
          className={EDITOR_UI.button}
          onClick={() => setShowBindingsDebug((value) => !value)}
        >
          Bindings
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={EDITOR_UI.button}
          onClick={() => void saveScene(composer.scene)}
        >
          <Save className="mr-1.5 size-4" />
          Save
        </Button>
        <span
          className={`min-w-[84px] text-right text-[12px] ${
            saveStatus === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "Saved"
              : saveStatus === "error"
                ? "Save failed"
                : ""}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <ResizablePanel
          storageKey="mediaos.composer.left-v36"
          defaultWidth={300}
          minWidth={260}
          maxWidth={380}
          side="left"
          alwaysVisible
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <StoryAssetsPanel
                onApplyMedia={storyForm.applyMedia}
                data={storyForm.data}
                activeTarget={activeMediaTarget}
                onActiveTargetChange={setActiveMediaTarget}
                organizationId={composer.scene.organization_id}
                browseRequestKey={browseRequestKey}
                browseRequestTarget={browseRequestTarget}
              />
            </div>
            <BindingsDebugPanel
              story={storyForm.data}
              bindings={storyForm.bindings}
              open={showBindingsDebug}
            />
          </div>
        </ResizablePanel>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <EditorCanvas
              scene={composer.scene}
              resolvedBindings={previewBindings}
              playheadMs={playback.playheadMs}
              motionMode={playback.isPlaying ? "playback" : "edit"}
              isPlaying={playback.isPlaying}
              aspect={previewAspect}
              viewport={canvas.viewport}
              selectedObject={selectedObject}
              isPanning={canvas.isPanning}
              spaceHeld={canvas.spaceHeld}
              onSelectObject={canvas.selectObject}
              onPan={canvas.panBy}
              onSetZoom={canvas.setZoom}
              onFitZoom={canvas.setFitZoom}
              onToggle={canvas.toggle}
              onSetPanning={canvas.setIsPanning}
              onBrowseMedia={handleBrowseFromCanvas}
            />
          </div>
        </div>

        <ResizablePanel
          storageKey="mediaos.composer.right-v36"
          defaultWidth={340}
          minWidth={300}
          maxWidth={440}
          side="right"
          alwaysVisible
        >
          <PropertyInspectorPanel
            selectedObject={selectedObject}
            data={storyForm.data}
            onFieldChange={storyForm.updateField}
            onObjectPatch={patchObject}
            onClearSelection={() => canvas.selectObject(null)}
            onBrowseMedia={() => openMediaBrowser(selectedObject)}
            onPreviewMotion={() => {
              // Always restart from 0 so entrance → idle → exit is visible on every layer.
              playback.restart();
            }}
            onAddShapeObject={addShapeObject}
            onDeleteObject={deleteObject}
            onDuplicateObject={duplicateObject}
            onToggleShapeAllLayers={toggleShapeAllLayers}
            allLayersShapeEnabled={allLayersShapeEnabled}
          />
        </ResizablePanel>
      </div>

      <ResizableTimelineShell>
        <div className="flex h-full min-h-0 flex-col">
          <MotionPresetDrawer
            selectedObject={selectedObject}
            onObjectPatch={patchObject}
            onApplied={() => {
              playback.restart();
            }}
          />
          <div className="min-h-0 flex-1">
            <EnhancedTimelinePanel
              objects={composer.scene.composer_document.objects}
              playheadMs={playback.playheadMs}
              durationMs={composer.scene.duration_ms}
              frameRate={playback.frameRate}
              isPlaying={playback.isPlaying}
              loopPlayback={playback.loopPlayback}
              selectedIds={canvas.selection.selectedObjectIds}
              formatTimecode={playback.formatTimecode}
              onSeek={playback.seek}
              onTogglePlay={playback.togglePlay}
              onStop={playback.stop}
              onRestart={playback.restart}
              onStepFrame={playback.stepFrame}
              onToggleLoop={() => playback.setLoopPlayback((v) => !v)}
              onSetFrameRate={(fps) => {
                playback.setFrameRate(fps);
                composer.updateSceneMeta({ frame_rate: fps });
              }}
              onSelect={(id) => canvas.selectObject(id)}
              timelineZoom={timelineZoom}
              onTimelineZoom={setTimelineZoom}
              onObjectsChange={setObjects}
            />
          </div>
        </div>
      </ResizableTimelineShell>
    </div>
  );
}
