import { createLayerService } from "@/features/scene-composer/services/layer.service.impl";
import { alignObjects } from "@/features/scene-composer/services/canvas.service.impl";
import type {
  ObjectTransform,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import {
  COMMAND_LABELS,
  transformKind,
  type ApplyObjects,
  type ApplyObjectsSilent,
  type EditorCommandKind,
} from "@/features/scene-composer/lib/editor-commands/types";

const layers = createLayerService();

function patchTransforms(
  objects: SceneObject[],
  updates: Map<string, Partial<ObjectTransform>>,
): SceneObject[] {
  return objects.map((object) => {
    const patch = updates.get(object.id);
    if (!patch) return object;
    return {
      ...object,
      transform: { ...object.transform, ...patch },
    };
  });
}

/**
 * Command factories — each call applies state through `commit` / `live`.
 * Callers never mutate the objects array themselves.
 */
export function createEditorCommands(deps: {
  getObjects: () => SceneObject[];
  commit: ApplyObjects;
  live: ApplyObjectsSilent;
}) {
  const { getObjects, commit, live } = deps;

  const run = (
    next: SceneObject[],
    previous: SceneObject[],
    kind: EditorCommandKind,
    label = COMMAND_LABELS[kind],
  ) => {
    commit(next, previous, label, kind);
  };

  return {
    /** Live drag / resize — no undo entry until `commitTransform`. */
    previewTransform(id: string, transform: ObjectTransform) {
      const objects = getObjects();
      live(
        objects.map((object) =>
          object.id === id
            ? { ...object, transform: { ...object.transform, ...transform } }
            : object,
        ),
      );
    },

    commitTransform(
      id: string,
      transform: ObjectTransform,
      origin: ObjectTransform,
    ) {
      const objects = getObjects();
      const previous = objects.map((object) =>
        object.id === id
          ? { ...object, transform: { ...object.transform, ...origin } }
          : object,
      );
      const next = objects.map((object) =>
        object.id === id
          ? { ...object, transform: { ...object.transform, ...transform } }
          : object,
      );
      const kind = transformKind(origin, transform);
      run(next, previous, kind);
    },

    nudge(ids: string[], dx: number, dy: number) {
      if (ids.length === 0 || (dx === 0 && dy === 0)) return;
      const objects = getObjects();
      const idSet = new Set(ids);
      const previous = objects;
      const next = objects.map((object) => {
        if (!idSet.has(object.id) || object.locked) return object;
        return {
          ...object,
          transform: {
            ...object.transform,
            x: object.transform.x + dx,
            y: object.transform.y + dy,
          },
        };
      });
      run(next, previous, "nudge_layers");
    },

    deleteLayers(ids: string[]) {
      if (ids.length === 0) return;
      const objects = getObjects();
      const previous = objects;
      const next = layers.remove(objects, ids);
      run(next, previous, "delete_layers");
    },

    duplicateLayers(ids: string[]): string[] {
      if (ids.length === 0) return [];
      let objects = getObjects();
      const previous = objects;
      const createdIds: string[] = [];
      for (const id of ids) {
        const source = objects.find((object) => object.id === id);
        if (!source) continue;
        const before = objects.length;
        objects = layers.duplicate(source, objects);
        if (objects.length > before) {
          createdIds.push(objects[objects.length - 1]!.id);
        }
      }
      if (createdIds.length === 0) return [];
      run(objects, previous, "duplicate_layers");
      return createdIds;
    },

    pasteLayers(clipboard: SceneObject[]): string[] {
      if (clipboard.length === 0) return [];
      const objects = getObjects();
      const previous = objects;
      const copies = clipboard.map((object) => ({
        ...structuredClone(object),
        id: `obj-${crypto.randomUUID()}`,
        name: object.name.endsWith(" Copy")
          ? object.name
          : `${object.name} Copy`,
        sort_order: objects.length,
        transform: {
          ...object.transform,
          x: object.transform.x + 24,
          y: object.transform.y + 24,
        },
      }));
      const next = [...objects, ...copies].map((object, index) => ({
        ...object,
        sort_order: index,
      }));
      run(next, previous, "paste_layers");
      return copies.map((c) => c.id);
    },

    renameLayer(id: string, name: string) {
      const objects = getObjects();
      const previous = objects;
      const next = layers.rename(objects, id, name);
      run(next, previous, "rename_layer");
    },

    toggleVisibility(id: string) {
      const objects = getObjects();
      run(
        layers.toggleVisibility(objects, id),
        objects,
        "toggle_visibility",
      );
    },

    toggleLock(id: string) {
      const objects = getObjects();
      run(layers.toggleLock(objects, id), objects, "toggle_lock");
    },

    reorderRelative(
      draggedId: string,
      targetId: string,
      place: "above" | "below",
    ) {
      const objects = getObjects();
      run(
        layers.moveRelativeTo(objects, draggedId, targetId, place),
        objects,
        "reorder_layers",
      );
    },

    groupLayers(ids: string[]) {
      if (ids.length < 2) return;
      const objects = getObjects();
      run(layers.group(objects, ids), objects, "group_layers");
    },

    ungroupLayer(groupId: string) {
      const objects = getObjects();
      run(layers.ungroup(objects, groupId), objects, "ungroup_layers");
    },

    align(
      ids: string[],
      mode: "left" | "center" | "right" | "top" | "middle" | "bottom",
    ) {
      if (ids.length < 2) return;
      const objects = getObjects();
      const selected = objects.filter((object) => ids.includes(object.id));
      const aligned = alignObjects(selected, mode);
      const byId = new Map(aligned.map((object) => [object.id, object]));
      const next = objects.map((object) => byId.get(object.id) ?? object);
      run(next, objects, "align_layers");
    },

    updateObject(id: string, patch: Partial<SceneObject>) {
      const objects = getObjects();
      const previous = objects;
      const next = layers.updateObject(objects, id, patch);
      run(next, previous, "update_object");
    },

    setObjects(next: SceneObject[], kind: EditorCommandKind = "set_objects") {
      run(next, getObjects(), kind);
    },

    /** Multi-id live transform (box drag of several layers). */
    previewTransforms(updates: Map<string, Partial<ObjectTransform>>) {
      live(patchTransforms(getObjects(), updates));
    },

    commitTransforms(
      updates: Map<string, Partial<ObjectTransform>>,
      origins: Map<string, ObjectTransform>,
    ) {
      const objects = getObjects();
      const previous = objects.map((object) => {
        const origin = origins.get(object.id);
        if (!origin) return object;
        return { ...object, transform: { ...object.transform, ...origin } };
      });
      const next = patchTransforms(objects, updates);
      run(next, previous, "transform_layer");
    },
  };
}

export type EditorCommands = ReturnType<typeof createEditorCommands>;
