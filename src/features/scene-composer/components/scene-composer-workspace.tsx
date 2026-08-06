"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  History,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResizablePanel } from "@/features/platform/components/resizable-panel";
import {
  placeMotionSceneOnTimelineAction,
  saveMotionSceneVersionAction,
} from "@/features/motion-scene-engine/actions/motion-scene.actions";
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
import { EditorMenuBar } from "@/features/scene-composer/components/editor/editor-menu-bar";
import { EnhancedTimelinePanel } from "@/features/scene-composer/components/editor/enhanced-timeline-panel";
import {
  PropertyInspectorPanel,
  type InspectorTab,
} from "@/features/scene-composer/components/editor/property-inspector-panel";
import { SceneHistoryPanel } from "@/features/scene-composer/components/scene-history-panel";
import { WORKFLOW_STATE_LABELS } from "@/features/scene-composer/constants/scene-composer.constants";
import {
  useComposerAutosave,
  useComposerDocument,
} from "@/features/scene-composer/hooks/use-composer-document";
import { useComposerCanvas } from "@/features/scene-composer/hooks/use-composer-canvas";
import { useEditorCommands } from "@/features/scene-composer/hooks/use-editor-commands";
import { useEditorHotkeys } from "@/features/scene-composer/hooks/use-editor-hotkeys";
import { isLockedMasterTemplate } from "@/features/story-scene-builder/lib/master-template-guard";
import { useComposerPlayback } from "@/features/scene-composer/hooks/use-composer-playback";
import {
  LayerFactory,
  type LayerKind,
} from "@/features/scene-composer/lib/layer-factory";
import {
  parseTextBindingToken,
  storyFieldForTextBinding,
} from "@/features/scene-composer/lib/text-layer";
import { isTextLikeObject } from "@/features/story-production/services/story-preview.service";
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
import { ComposerLayersPanel } from "@/features/scene-composer/components/panels/composer-layers-panel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useStoryDataForm } from "@/features/story-production/hooks/use-story-data-form";
import { useResolvedStoryBindings } from "@/features/story-production/hooks/use-resolved-story-bindings";
import {
  appendMediaContainerSlide,
  getMediaContainerConfig,
  isBackgroundContainerObject,
  isMediaSlideContainerObject,
  isSmartContainerObject,
  mediaContainerResolveKey,
  mediaContainerToBackgroundStoryPatch,
  patchMediaContainerConfig,
} from "@/features/scene-composer/lib/media-container";
import {
  buildLayerMappingBindings,
  getSmartMappingConfig,
  mappingTransitionToMediaStyle,
  storyDataFromBindings,
} from "@/features/scene-composer/lib/story-mapping";
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
  /** Opens the Property Inspector on a specific tab (Template Designer deep links). */
  initialInspectorTab?: InspectorTab;
  /** Where the back arrow returns to — Scene Library by default. */
  backHref?: string;
  backLabel?: string;
};

export function SceneComposerWorkspace({
  initialScene,
  scenes: _scenes,
  categories: _categories,
  components: _components,
  projectId,
  trackId,
  initialInspectorTab,
  backHref = "/creative-studio/scenes",
  backLabel = "Scene Library",
}: SceneComposerWorkspaceProps) {
  const router = useRouter();
  const composer = useComposerDocument(initialScene);
  const playback = useComposerPlayback(
    composer.scene.duration_ms,
    composer.scene.frame_rate,
  );
  const canvas = useComposerCanvas();

  const [previewAspect] = useState<StoryPreviewAspect>("1920x1080");
  const [showBindingsDebug, setShowBindingsDebug] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mediaBrowserOpen, setMediaBrowserOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedFingerprintRef = useRef<string>("");
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const latestSceneRef = useRef(composer.scene);
  latestSceneRef.current = composer.scene;
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

  const selectedObjects = useMemo(() => {
    const ids = new Set(canvas.selection.selectedObjectIds);
    if (ids.size === 0) return [];
    return composer.scene.composer_document.objects.filter((object) =>
      ids.has(object.id),
    );
  }, [
    canvas.selection.selectedObjectIds,
    composer.scene.composer_document.objects,
  ]);

  const masterLocked = useMemo(
    () =>
      isLockedMasterTemplate({
        id: composer.scene.id,
        name: composer.scene.name,
        is_template: composer.scene.is_template,
        is_published: composer.scene.is_published,
        workflow_state: composer.scene.workflow_state,
        deleted_at: composer.scene.deleted_at,
      }),
    [
      composer.scene.deleted_at,
      composer.scene.id,
      composer.scene.is_published,
      composer.scene.is_template,
      composer.scene.name,
      composer.scene.workflow_state,
    ],
  );

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
    // Seek only — auto-play on every layer click remounted shape clocks and
    // Object-tab Selects together, which fed the max-update-depth loop.
    if (id && id !== lastMotionPreviewIdRef.current) {
      playback.seek(selectedObject!.start_ms);
    }
    lastMotionPreviewIdRef.current = id;
  }, [selectedObject?.id, selectedObject?.start_ms, playback.seek]);

  useEffect(() => {
    if (browseRequestKey > 0) setMediaBrowserOpen(true);
  }, [browseRequestKey]);

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
      setMediaBrowserOpen(true);
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
      setMediaBrowserOpen(true);
    },
    [canvas],
  );

  const sceneMetadataRef = useRef(composer.scene.metadata);
  sceneMetadataRef.current = composer.scene.metadata;
  const resolvedBindingsRef = useRef(composer.scene.resolved_bindings);
  resolvedBindingsRef.current = composer.scene.resolved_bindings;

  const handleBindingsChange = useCallback(
    (bindings: Record<string, string>, data: StoryDataRecord) => {
      const prevBindings = resolvedBindingsRef.current;
      const prevStory = (sceneMetadataRef.current as Record<string, unknown> | undefined)
        ?.story_data;
      const bindingsUnchanged =
        JSON.stringify(prevBindings) === JSON.stringify(bindings);
      const storyUnchanged =
        JSON.stringify(prevStory ?? null) === JSON.stringify(data);
      if (bindingsUnchanged && storyUnchanged) return;

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

  const selectedObjectRef = useRef(selectedObject);
  selectedObjectRef.current = selectedObject;

  const layerMappingBindings = useMemo(() => {
    const story = storyDataFromBindings(storyForm.bindings);
    return buildLayerMappingBindings(
      composer.scene.composer_document.objects,
      story,
      { bindings: storyForm.bindings },
    );
  }, [composer.scene.composer_document.objects, storyForm.bindings]);

  const previewBindings = useResolvedStoryBindings({
    ...storyForm.bindings,
    ...layerMappingBindings,
  });

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

  const sceneFingerprint = useCallback((scene: ComposerScene) => {
    return JSON.stringify({
      name: scene.name,
      duration_ms: scene.duration_ms,
      frame_rate: scene.frame_rate,
      workflow_state: scene.workflow_state,
      composer_settings: scene.composer_settings,
      composer_document: scene.composer_document,
      resolved_bindings: scene.resolved_bindings,
      metadata: scene.metadata,
    });
  }, []);

  const saveScene = useCallback(
    async (
      scene: ComposerScene,
      options?: { checkpoint?: boolean; revalidate?: boolean },
    ) => {
      if (
        isLockedMasterTemplate({
          id: scene.id,
          name: scene.name,
          is_template: scene.is_template,
          is_published: scene.is_published,
          workflow_state: scene.workflow_state,
          deleted_at: scene.deleted_at,
        })
      ) {
        setSaveStatus("idle");
        toast.error(
          "Published Master Template is locked. Duplicate or version it instead of editing.",
        );
        return;
      }

      const fingerprint = sceneFingerprint(scene);
      const isAutosave = !options?.checkpoint;

      // Skip no-op autosaves — UI was flashing "Saving..." even when DB already matched.
      if (isAutosave && fingerprint === lastSavedFingerprintRef.current) {
        return;
      }

      if (saveInFlightRef.current) {
        pendingSaveRef.current = true;
        return;
      }

      saveInFlightRef.current = true;
      pendingSaveRef.current = false;
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
        // Autosave must not revalidate server props (causes update-depth loops).
        revalidate: options?.revalidate ?? Boolean(options?.checkpoint),
        // Relational upserts only on explicit Save — avoids 409 spam + egress.
        syncTables: Boolean(options?.checkpoint),
      });

      if (!result.success) {
        saveInFlightRef.current = false;
        setSaveStatus("error");
        toast.error(result.error ?? "Autosave failed");
        return;
      }

      // Confirm persistence from server payload (updated_at present = DB write succeeded).
      lastSavedFingerprintRef.current = fingerprint;
      const savedAt = result.data.updated_at
        ? new Date(result.data.updated_at)
        : new Date();
      setLastSavedAt(
        savedAt.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );

      // Explicit Save / Ctrl+S: update the same scene file, then add a history checkpoint.
      if (options?.checkpoint) {
        const checkpoint = await saveMotionSceneVersionAction({
          sceneId: scene.id,
          label: `Saved · ${new Date().toLocaleString()}`,
        });
        if (checkpoint.success) {
          composer.updateSceneMeta({ version: checkpoint.data.version });
        } else {
          toast.error(checkpoint.error ?? "Saved, but history checkpoint failed");
        }
      }

      setSaveStatus("saved");
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2400);

      saveInFlightRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        void saveSceneRef.current(latestSceneRef.current, { revalidate: false });
      }
    },
    [composer.updateSceneMeta, sceneFingerprint],
  );

  const saveSceneRef = useRef(saveScene);
  saveSceneRef.current = saveScene;

  const { schedule } = useComposerAutosave(composer.scene, (scene) =>
    saveSceneRef.current(scene, { revalidate: false }),
  );

  useEffect(() => {
    // Only schedule when document content actually differs from last DB write.
    if (sceneFingerprint(composer.scene) === lastSavedFingerprintRef.current) {
      return;
    }
    schedule();
  }, [composer.scene, schedule, sceneFingerprint]);

  const setObjects = useCallback(
    (objects: SceneObject[], label?: string) => {
      composer.setObjects(objects, label);
      schedule();
    },
    [composer, schedule],
  );

  const objectsRef = useRef(composer.scene.composer_document.objects);
  objectsRef.current = composer.scene.composer_document.objects;
  const clipboardRef = useRef<SceneObject[]>([]);
  const [zoomPresetRequest, setZoomPresetRequest] = useState<{
    key: number;
    mode: "fit" | "absolute";
    zoom?: number;
  } | null>(null);
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);

  const commands = useEditorCommands({
    getObjects: () => objectsRef.current,
    replaceSilent: (objects) => {
      composer.replaceObjectsSilent(objects);
      schedule();
    },
    commitChange: (next, previous, label) => {
      composer.commitObjectsChange(next, previous, label);
      schedule();
    },
  });

  const selectIds = useCallback(
    (ids: string[]) => {
      canvas.selectObjects(ids);
    },
    [canvas],
  );

  const beginTextEdit = useCallback(
    (objectId: string) => {
      const object = objectsRef.current.find((item) => item.id === objectId);
      if (!object || object.locked || !isTextLikeObject(object)) return;
      canvas.selectObject(objectId);
      setEditingObjectId(objectId);
    },
    [canvas],
  );

  const cancelTextEdit = useCallback(() => {
    setEditingObjectId(null);
  }, []);

  const commitTextEdit = useCallback(
    (objectId: string, text: string) => {
      setEditingObjectId(null);
      const object = objectsRef.current.find((item) => item.id === objectId);
      if (!object) return;
      const next = text.replace(/\u00a0/g, " ").replace(/\n$/, "");
      const token =
        parseTextBindingToken(object.bindings.text) ??
        parseTextBindingToken(
          typeof object.content.text === "string" ? object.content.text : "",
        );
      if (token) {
        const field = storyFieldForTextBinding(token);
        if (field) {
          // Bound text edits the story field so preview + renderer update live.
          storyForm.updateField(field, next);
          return;
        }
      }
      commands.updateObject(objectId, {
        content: { ...object.content, text: next },
      });
      schedule();
    },
    [commands, schedule, storyForm],
  );

  // Leaving selection exits text edit mode (ESC is handled by the editor).
  useEffect(() => {
    if (!editingObjectId) return;
    if (!canvas.selection.selectedObjectIds.includes(editingObjectId)) {
      setEditingObjectId(null);
    }
  }, [canvas.selection.selectedObjectIds, editingObjectId]);

  const patchObject = useCallback(
    (id: string, patch: Partial<SceneObject>) => {
      // Always read latest objects — a stale scene closure made Visible/Locked
      // bail out after the first toggle (e.g. off→on looked like a no-op).
      const objects = objectsRef.current;
      const current = objects.find((object) => object.id === id);
      if (!current) return;

      const merged = {
        ...current,
        ...patch,
        style: patch.style ? { ...current.style, ...patch.style } : current.style,
        transform: patch.transform
          ? { ...current.transform, ...patch.transform }
          : current.transform,
        metadata: patch.metadata
          ? { ...current.metadata, ...patch.metadata }
          : current.metadata,
        content: patch.content
          ? { ...current.content, ...patch.content }
          : current.content,
        bindings:
          patch.bindings !== undefined ? patch.bindings : current.bindings,
      };

      // Bail when Select/Switch mount-sync would rewrite identical data.
      if (
        JSON.stringify({
          style: current.style,
          transform: current.transform,
          metadata: current.metadata,
          content: current.content,
          bindings: current.bindings,
          name: current.name,
          visible: current.visible,
          locked: current.locked,
          object_type: current.object_type,
        }) ===
        JSON.stringify({
          style: merged.style,
          transform: merged.transform,
          metadata: merged.metadata,
          content: merged.content,
          bindings: merged.bindings,
          name: merged.name,
          visible: merged.visible,
          locked: merged.locked,
          object_type: merged.object_type,
        })
      ) {
        return;
      }

      commands.updateObject(id, {
        ...patch,
        style: merged.style,
        transform: merged.transform,
        metadata: merged.metadata,
        content: merged.content,
        bindings: merged.bindings,
      });
      schedule();
    },
    [commands, schedule],
  );

  const applyMediaToSelection = useCallback(
    (url: string) => {
      const object = selectedObjectRef.current;
      if (!object || !isMediaSlideContainerObject(object)) {
        return false;
      }
      if (isSmartContainerObject(object)) {
        const mapping = getSmartMappingConfig(object);
        if (mapping.mappingMode !== "manual") {
          toast.message("Switch Mapping Mode to Manual to browse slides.");
          return true;
        }
      }
      const cfg = getMediaContainerConfig(object, storyForm.bindings);
      const incoming = url.includes(",")
        ? url.split(",").map((part) => part.trim()).filter(Boolean).at(-1) ??
          url
        : url;
      const nextSlides = appendMediaContainerSlide(cfg.slides, incoming);
      let patched = patchMediaContainerConfig(
        object,
        { slides: nextSlides },
        storyForm.bindings,
      );
      if (isSmartContainerObject(object)) {
        const mapping = getSmartMappingConfig(object);
        patched = patchMediaContainerConfig(
          patched,
          {
            transitionStyle: mappingTransitionToMediaStyle(mapping.transition),
            intervalMs:
              mapping.durationMode === "manual"
                ? mapping.durationMs
                : undefined,
          },
          storyForm.bindings,
        );
      }
      patchObject(object.id, { content: patched.content });
      if (isBackgroundContainerObject(object)) {
        storyForm.patchFields(
          mediaContainerToBackgroundStoryPatch(
            getMediaContainerConfig(patched, storyForm.bindings),
          ),
        );
      }
      return true;
    },
    [patchObject, storyForm],
  );

  const applyObjectTransform = useCallback(
    (
      id: string,
      transform: SceneObject["transform"],
      mode: "live" | "commit",
      origin?: SceneObject["transform"],
    ) => {
      if (mode === "live") {
        commands.previewTransform(id, transform);
        return;
      }
      commands.commitTransform(id, transform, origin ?? transform);
    },
    [commands],
  );

  const addShapeObject = useCallback(
    (object: SceneObject) => {
      commands.setObjects(
        [...objectsRef.current, object],
        "set_objects",
      );
      canvas.selectObject(object.id);
    },
    [canvas, commands],
  );

  const addLayer = useCallback(
    (kind: LayerKind) => {
      if (masterLocked) {
        toast.error("Master template is locked — duplicate it to edit.");
        return;
      }
      const settings = composer.scene.composer_settings;
      const artboard =
        settings.resolution_preset === "custom"
          ? {
              width: settings.custom_width,
              height: settings.custom_height,
            }
          : (() => {
              const [w, h] = settings.resolution_preset.split("x").map(Number);
              return { width: w, height: h };
            })();

      const offset = (objectsRef.current.length % 6) * 16;
      const created = LayerFactory.create(kind, {
        durationMs: composer.scene.duration_ms,
        sortOrder: objectsRef.current.length,
        artboard,
      });
      const placed: SceneObject = {
        ...created,
        transform: {
          ...created.transform,
          x: created.transform.x + offset,
          y: created.transform.y + offset,
        },
      };
      commands.setObjects([...objectsRef.current, placed], "set_objects");
      canvas.selectObject(placed.id);
      toast.success(`Added ${placed.name}`);
    },
    [
      canvas,
      commands,
      composer.scene.composer_settings,
      composer.scene.duration_ms,
      masterLocked,
    ],
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
      commands.deleteLayers([id]);
      if (canvas.selection.selectedObjectIds.includes(id)) {
        canvas.selectObject(null);
      }
    },
    [canvas, commands],
  );

  const duplicateObject = useCallback(
    (object: SceneObject) => {
      // Shape panel path may hand a freshly built object — prefer command duplicate.
      const created = commands.duplicateLayers([object.id]);
      if (created.length > 0) {
        canvas.selectObject(created[0]!);
        return;
      }
      const copy = duplicateShapeObject(object);
      commands.setObjects([...objectsRef.current, copy]);
      canvas.selectObject(copy.id);
    },
    [canvas, commands],
  );

  const selectedIds = canvas.selection.selectedObjectIds;
  const canEditSelection = selectedIds.length > 0 && !masterLocked;
  const canGroup = selectedIds.length >= 2 && !masterLocked;
  const selectedGroup =
    selectedObject?.object_type === "group" ? selectedObject : null;

  useEditorHotkeys({
    enabled: !masterLocked,
    commands,
    objects: composer.scene.composer_document.objects,
    selectedIds,
    canUndo: composer.canUndo,
    canRedo: composer.canRedo,
    onUndo: () => composer.undo(),
    onRedo: () => composer.redo(),
    onSave: () => void saveScene(composer.scene, { checkpoint: true }),
    onSelect: selectIds,
    onSelectAll: () =>
      selectIds(composer.scene.composer_document.objects.map((o) => o.id)),
    clipboardRef,
  });

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
          aria-label={`Back to ${backLabel}`}
          onClick={() => router.push(backHref)}
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
            {masterLocked ? (
              <Badge variant="destructive" className="text-[12px]">
                Master locked
              </Badge>
            ) : null}
            {composer.scene.is_template && !masterLocked ? (
              <Badge variant="outline" className="text-[12px]">
                Master draft
              </Badge>
            ) : null}
            {!composer.scene.is_template ? (
              <Badge variant="outline" className="text-[12px]">
                Story instance
              </Badge>
            ) : null}
          </div>
          <p className={EDITOR_UI.helper}>
            {masterLocked
              ? "Published Master Template — duplicate or version instead of editing."
              : `Broadcast graphics editor · Live preview · v${composer.scene.version}`}
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
          onClick={() => setHistoryOpen(true)}
        >
          <History className="mr-1.5 size-4" />
          History
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={EDITOR_UI.button}
          onClick={() => void saveScene(composer.scene, { checkpoint: true })}
        >
          <Save className="mr-1.5 size-4" />
          Save
        </Button>
        <span
          className={`min-w-[120px] text-right text-[12px] ${
            saveStatus === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
          title={
            lastSavedAt
              ? "Confirmed write to the scene database record"
              : undefined
          }
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
              ? lastSavedAt
                ? `Saved · ${lastSavedAt}`
                : "Saved"
              : saveStatus === "error"
                ? "Save failed"
                : lastSavedAt
                  ? `Saved · ${lastSavedAt}`
                  : ""}
        </span>
      </header>

      <EditorMenuBar
        canUndo={composer.canUndo}
        canRedo={composer.canRedo}
        canEditSelection={canEditSelection}
        canGroup={canGroup}
        canUngroup={Boolean(selectedGroup) && !masterLocked}
        canAlign={selectedIds.length >= 2 && !masterLocked}
        canAddLayer={!masterLocked}
        onUndo={() => composer.undo()}
        onRedo={() => composer.redo()}
        onSave={() => void saveScene(composer.scene, { checkpoint: true })}
        onCopy={() => {
          clipboardRef.current = selectedObjects.map((object) =>
            structuredClone(object),
          );
        }}
        onPaste={() => {
          const created = commands.pasteLayers(clipboardRef.current);
          if (created.length > 0) selectIds(created);
        }}
        onDuplicate={() => {
          const created = commands.duplicateLayers(selectedIds);
          if (created.length > 0) selectIds(created);
        }}
        onDelete={() => {
          commands.deleteLayers(selectedIds);
          selectIds([]);
        }}
        onSelectAll={() =>
          selectIds(composer.scene.composer_document.objects.map((o) => o.id))
        }
        onGroup={() => commands.groupLayers(selectedIds)}
        onUngroup={() => {
          if (!selectedGroup) return;
          commands.ungroupLayer(selectedGroup.id);
          selectIds([]);
        }}
        onAlign={(mode) => commands.align(selectedIds, mode)}
        onAddLayer={addLayer}
        onZoomFit={() =>
          setZoomPresetRequest({ key: Date.now(), mode: "fit" })
        }
        onZoom100={() =>
          setZoomPresetRequest({ key: Date.now(), mode: "absolute", zoom: 1 })
        }
        onZoom200={() =>
          setZoomPresetRequest({ key: Date.now(), mode: "absolute", zoom: 2 })
        }
      />

      <div className="flex min-h-0 flex-1">
        <ResizablePanel
          storageKey="mediaos.composer.left-layers-v1"
          defaultWidth={300}
          minWidth={260}
          maxWidth={400}
          side="left"
          alwaysVisible
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <ComposerLayersPanel
                objects={composer.scene.composer_document.objects}
                selectedIds={canvas.selection.selectedObjectIds}
                disabled={masterLocked}
                onAddLayer={addLayer}
                onObjectsChange={(objects, label) => {
                  // Layer panel still composes the next array; commit via commands.
                  commands.setObjects(objects);
                  void label;
                }}
                onSelect={(id, additive) => {
                  canvas.selectObject(id, additive);
                  if (id) {
                    const object =
                      composer.scene.composer_document.objects.find(
                        (item) => item.id === id,
                      ) ?? null;
                    if (object) {
                      playback.seek(object.start_ms);
                    }
                  }
                }}
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
              selectedObjects={selectedObjects}
              isPanning={canvas.isPanning}
              spaceHeld={canvas.spaceHeld}
              onSelectObject={canvas.selectObject}
              onSelectObjects={selectIds}
              onPan={canvas.panBy}
              onSetZoom={canvas.setZoom}
              onFitZoom={canvas.setFitZoom}
              onToggle={canvas.toggle}
              onSetPanning={canvas.setIsPanning}
              onBrowseMedia={handleBrowseFromCanvas}
              zoomPresetRequest={zoomPresetRequest}
              onTransformLive={(id, transform) =>
                applyObjectTransform(id, transform, "live")
              }
              onTransformCommit={(id, transform, origin) =>
                applyObjectTransform(id, transform, "commit", origin)
              }
              editingObjectId={editingObjectId}
              onBeginTextEdit={beginTextEdit}
              onCommitTextEdit={commitTextEdit}
              onCancelTextEdit={cancelTextEdit}
            />
          </div>
          <EnhancedTimelinePanel
            playheadMs={playback.playheadMs}
            durationMs={composer.scene.duration_ms}
            frameRate={playback.frameRate}
            isPlaying={playback.isPlaying}
            loopPlayback={playback.loopPlayback}
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
          />
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
            organizationId={composer.scene.organization_id}
            storyId={
              typeof composer.scene.metadata?.story_id === "string"
                ? composer.scene.metadata.story_id
                : null
            }
            instanceMode={Boolean(storyForm.isStoryInstance)}
            initialTab={initialInspectorTab}
            onFieldChange={storyForm.updateField}
            onFieldsPatch={storyForm.patchFields}
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

      <SceneHistoryPanel
        sceneId={composer.scene.id}
        sceneName={composer.scene.name}
        currentVersion={composer.scene.version}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onVersionSaved={(version) => composer.updateSceneMeta({ version })}
        onRestored={() => {
          // Full reload so the restored document replaces client state
          // (composer no longer resets on updated_at to avoid autosave loops).
          window.location.reload();
        }}
        persistLiveScene={async () => {
          await saveScene(composer.scene, { revalidate: false });
        }}
      />

      <Sheet open={mediaBrowserOpen} onOpenChange={setMediaBrowserOpen}>
        <SheetContent side="left" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Media Browser</SheetTitle>
            <SheetDescription>
              Choose media for the selected story placeholder.
            </SheetDescription>
          </SheetHeader>
          <div className="h-full min-h-0">
            <StoryAssetsPanel
              onApplyMedia={(field, url) => {
                if (applyMediaToSelection(url)) {
                  setMediaBrowserOpen(false);
                  return;
                }
                if (field === "main_image" && activeMediaTarget?.bindingKey === "__smart_container__") {
                  setMediaBrowserOpen(false);
                  return;
                }
                if (
                  field === "background_video" ||
                  field === "background_image"
                ) {
                  storyForm.patchFields({
                    background_video: url,
                    background_image: "",
                  });
                } else {
                  storyForm.applyMedia(field, url);
                }
                setMediaBrowserOpen(false);
              }}
              data={storyForm.data}
              activeTarget={activeMediaTarget}
              onActiveTargetChange={setActiveMediaTarget}
              organizationId={composer.scene.organization_id}
              browseRequestKey={browseRequestKey}
              browseRequestTarget={browseRequestTarget}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
