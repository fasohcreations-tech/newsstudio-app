"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createComposerHistoryService } from "@/features/scene-composer/services/history.service.impl";
import { objectsToLayers } from "@/features/scene-composer/lib/object-factory";
import {
  needsGnn001LowerPanelPatch,
  patchGnn001LowerPanelObjects,
} from "@/features/scene-composer/lib/gnn-001-lower-panel.styles";
import {
  needsGnn001LeftRailPatch,
  patchGnn001LeftRailObjects,
} from "@/features/scene-composer/lib/gnn-001-left-rail.layout";
import {
  needsGnn001EdgeSweepDemoPatch,
  patchGnn001EdgeSweepDemos,
} from "@/features/scene-composer/lib/edge-sweep";
import {
  needsGnn001LightSweepDemoPatch,
  patchGnn001LightSweepDemos,
} from "@/features/scene-composer/lib/broadcast-effects";
import {
  needsShapeComposerSeed,
  seedShapeComposerOnAllLayers,
} from "@/features/scene-composer/lib/shape-composer";
import type {
  ComposerScene,
  ComposerSceneDocument,
  ComposerSettings,
  SceneObject,
  SceneWorkflowState,
} from "@/features/scene-composer/types/scene-composer.types";

const history = createComposerHistoryService();

function isGnn001Scene(scene: ComposerScene) {
  const packageCode = (scene.metadata as Record<string, unknown> | undefined)
    ?.package_code;
  return (
    packageCode === "GNN-001" ||
    scene.name.includes("GNN-001") ||
    scene.name.includes("Full News Story")
  );
}

function withDocumentSeeds(scene: ComposerScene): ComposerScene {
  let objects = scene.composer_document.objects;
  let changed = false;

  if (isGnn001Scene(scene)) {
    if (needsGnn001LowerPanelPatch(objects)) {
      objects = patchGnn001LowerPanelObjects(objects);
      changed = true;
    }
    if (needsGnn001LeftRailPatch(objects)) {
      objects = patchGnn001LeftRailObjects(objects);
      changed = true;
    }
    if (needsGnn001EdgeSweepDemoPatch(objects)) {
      objects = patchGnn001EdgeSweepDemos(objects);
      changed = true;
    }
    // Morning demo: Headline Light Sweep (covers Lower Information Panel).
    // Additive only — never clears Shape Composer metadata.
    if (needsGnn001LightSweepDemoPatch(objects)) {
      objects = patchGnn001LightSweepDemos(objects);
      changed = true;
    }
  }

  // Shape Composer on every layer that does not already have config.
  // Runs after effect demos so shape + effects coexist on the same objects.
  if (needsShapeComposerSeed(objects)) {
    objects = seedShapeComposerOnAllLayers(objects);
    changed = true;
  }

  if (!changed) return scene;

  const composer_document = {
    ...scene.composer_document,
    objects,
    layers: objectsToLayers(objects),
  };

  return {
    ...scene,
    composer_document,
    scene_document: composer_document,
  };
}

export function useComposerDocument(initialScene: ComposerScene) {
  const [scene, setScene] = useState(() => withDocumentSeeds(initialScene));
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    // Only remount document when switching scenes. Do not reset on updated_at —
    // autosave/revalidate used to bump updated_at and re-seed in a tight loop.
    setScene(withDocumentSeeds(initialScene));
    history.clear();
  }, [initialScene.id]);

  useEffect(() => {
    return history.subscribe(() => {
      setRevision((n) => n + 1);
    });
  }, []);

  const applyDocument = useCallback(
    (nextDoc: ComposerSceneDocument, label: string) => {
      const prev = scene.composer_document;
      setScene((current) => ({
        ...current,
        composer_document: nextDoc,
        scene_document: { ...nextDoc, layers: objectsToLayers(nextDoc.objects) },
      }));
      history.push({
        label,
        undo: () =>
          setScene((current) => ({
            ...current,
            composer_document: prev,
            scene_document: { ...prev, layers: objectsToLayers(prev.objects) },
          })),
        redo: () =>
          setScene((current) => ({
            ...current,
            composer_document: nextDoc,
            scene_document: { ...nextDoc, layers: objectsToLayers(nextDoc.objects) },
          })),
      });
    },
    [scene.composer_document],
  );

  /** Update objects without pushing undo history (live drag). */
  const replaceObjectsSilent = useCallback((objects: SceneObject[]) => {
    setScene((current) => {
      const nextDoc = {
        ...current.composer_document,
        objects,
        layers: objectsToLayers(objects),
      };
      return {
        ...current,
        composer_document: nextDoc,
        scene_document: nextDoc,
      };
    });
  }, []);

  /**
   * Commit objects with an explicit previous snapshot (one undo step for drag/resize).
   */
  const commitObjectsChange = useCallback(
    (
      nextObjects: SceneObject[],
      previousObjects: SceneObject[],
      label = "Edit objects",
    ) => {
      const nextDoc: ComposerSceneDocument = {
        ...scene.composer_document,
        objects: nextObjects,
        layers: objectsToLayers(nextObjects),
      };
      const prevDoc: ComposerSceneDocument = {
        ...scene.composer_document,
        objects: previousObjects,
        layers: objectsToLayers(previousObjects),
      };
      setScene((current) => ({
        ...current,
        composer_document: nextDoc,
        scene_document: nextDoc,
      }));
      history.push({
        label,
        undo: () =>
          setScene((current) => ({
            ...current,
            composer_document: prevDoc,
            scene_document: prevDoc,
          })),
        redo: () =>
          setScene((current) => ({
            ...current,
            composer_document: nextDoc,
            scene_document: nextDoc,
          })),
      });
    },
    [scene.composer_document],
  );

  const setObjects = useCallback(
    (objects: SceneObject[], label = "Edit objects") => {
      applyDocument(
        {
          ...scene.composer_document,
          objects,
          layers: objectsToLayers(objects),
        },
        label,
      );
    },
    [applyDocument, scene.composer_document],
  );

  const updateSceneMeta = useCallback((patch: Partial<ComposerScene>) => {
    setScene((current) => ({ ...current, ...patch }));
  }, []);

  const updateSettings = useCallback((settings: ComposerSettings) => {
    setScene((current) => ({
      ...current,
      composer_settings: settings,
      properties: { ...current.properties, composer_settings: settings },
    }));
  }, []);

  const setWorkflowState = useCallback((workflow_state: SceneWorkflowState) => {
    setScene((current) => ({ ...current, workflow_state }));
  }, []);

  return useMemo(
    () => ({
      scene,
      revision,
      setObjects,
      replaceObjectsSilent,
      commitObjectsChange,
      applyDocument,
      updateSceneMeta,
      updateSettings,
      setWorkflowState,
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
      undo: () => history.undo(),
      redo: () => history.redo(),
    }),
    [
      scene,
      revision,
      setObjects,
      replaceObjectsSilent,
      commitObjectsChange,
      applyDocument,
      updateSceneMeta,
      updateSettings,
      setWorkflowState,
    ],
  );
}

export function useComposerAutosave(
  scene: ComposerScene,
  saveFn: (scene: ComposerScene) => Promise<void>,
  /** Debounce inactivity before writing — keep high to cut egress on drag/scrub. */
  delayMs = 3500,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveFnRef.current(sceneRef.current);
    }, delayMs);
  }, [delayMs]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { schedule };
}
