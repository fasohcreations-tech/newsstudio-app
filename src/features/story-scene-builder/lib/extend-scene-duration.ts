import type {
  ComposerScene,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";

/**
 * Master templates often lock layer `end_ms` at ~10s. Story panels / voice
 * windows are frequently longer — extend visibility so the composition does
 * not go blank mid-clip.
 */
export function extendComposerSceneForDuration(
  scene: ComposerScene,
  durationMs: number,
): ComposerScene {
  const target = Math.max(1, Math.ceil(durationMs));
  const objects = scene.composer_document.objects.map((obj: SceneObject) => ({
    ...obj,
    end_ms: Math.max(obj.end_ms ?? 0, target),
  }));

  return {
    ...scene,
    duration_ms: Math.max(scene.duration_ms ?? 0, target),
    composer_document: {
      ...scene.composer_document,
      objects,
    },
  };
}

/** Stretch object/layer end times inside a Motion Scene document JSON. */
export function extendSceneDocumentDuration<T>(
  document: T,
  durationMs: number,
): T {
  if (!document || typeof document !== "object") return document;
  const target = Math.max(1, Math.ceil(durationMs));
  const doc = document as {
    objects?: Array<{ end_ms?: number }>;
    layers?: Array<{ end_ms?: number }>;
  };

  const next = { ...doc } as Record<string, unknown>;
  if (Array.isArray(doc.objects)) {
    next.objects = doc.objects.map((obj) => ({
      ...obj,
      end_ms: Math.max(obj.end_ms ?? 0, target),
    }));
  }
  if (Array.isArray(doc.layers)) {
    next.layers = doc.layers.map((layer) => ({
      ...layer,
      end_ms: Math.max(layer.end_ms ?? 0, target),
    }));
  }
  return next as T;
}
