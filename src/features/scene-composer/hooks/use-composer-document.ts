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
  }

  // Shape Composer on every layer that does not already have config.
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
  delayMs = 900,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveFn(sceneRef.current);
    }, delayMs);
  }, [delayMs, saveFn]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { schedule };
}
