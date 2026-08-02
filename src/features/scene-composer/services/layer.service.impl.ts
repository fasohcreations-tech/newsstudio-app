import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export function createLayerService() {
  return {
    reorder(objects: SceneObject[], fromIndex: number, toIndex: number) {
      const next = [...objects];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next.map((obj, index) => ({ ...obj, sort_order: index }));
    },

    duplicate(object: SceneObject, all: SceneObject[]) {
      const copy: SceneObject = {
        ...structuredClone(object),
        id: `obj-${crypto.randomUUID()}`,
        name: `${object.name} Copy`,
        sort_order: all.length,
        transform: {
          ...object.transform,
          x: object.transform.x + 24,
          y: object.transform.y + 24,
        },
      };
      return [...all, copy];
    },

    toggleVisibility(objects: SceneObject[], id: string) {
      return objects.map((obj) =>
        obj.id === id ? { ...obj, visible: !obj.visible } : obj,
      );
    },

    toggleLock(objects: SceneObject[], id: string) {
      return objects.map((obj) =>
        obj.id === id ? { ...obj, locked: !obj.locked } : obj,
      );
    },

    rename(objects: SceneObject[], id: string, name: string) {
      return objects.map((obj) => (obj.id === id ? { ...obj, name } : obj));
    },

    remove(objects: SceneObject[], ids: string[]) {
      const set = new Set(ids);
      return objects
        .filter((obj) => !set.has(obj.id))
        .map((obj, index) => ({ ...obj, sort_order: index }));
    },

    updateObject(
      objects: SceneObject[],
      id: string,
      patch: Partial<SceneObject>,
    ) {
      return objects.map((obj) => (obj.id === id ? { ...obj, ...patch } : obj));
    },

    group(objects: SceneObject[], ids: string[]) {
      const groupId = `obj-${crypto.randomUUID()}`;
      const set = new Set(ids);
      return objects.map((obj) =>
        set.has(obj.id)
          ? {
              ...obj,
              parent_object_id: groupId,
              object_type: obj.object_type === "group" ? obj.object_type : obj.object_type,
            }
          : obj,
      );
    },
  };
}
