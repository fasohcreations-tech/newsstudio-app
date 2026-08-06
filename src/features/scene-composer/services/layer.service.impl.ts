import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

/** Re-packs sort_order to 0..n-1 in array order. */
function resequence(objects: SceneObject[]): SceneObject[] {
  return objects.map((obj, index) => ({ ...obj, sort_order: index }));
}

/** Depth-first ids of a subtree, including the root. */
function subtreeIds(objects: SceneObject[], rootId: string): string[] {
  const out = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const parent = queue.shift()!;
    for (const obj of objects) {
      if (obj.parent_object_id === parent && !out.includes(obj.id)) {
        out.push(obj.id);
        queue.push(obj.id);
      }
    }
  }
  return out;
}

export function createLayerService() {
  return {
    reorder(objects: SceneObject[], fromIndex: number, toIndex: number) {
      const next = [...objects];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return resequence(next);
    },

    /**
     * Drag & drop reorder in document order. `place` is relative to the target
     * layer, and the dragged layer adopts the target's parent so a layer can be
     * dropped into or out of a group. Whole subtrees move with their root.
     */
    moveRelativeTo(
      objects: SceneObject[],
      draggedId: string,
      targetId: string,
      place: "above" | "below",
    ): SceneObject[] {
      if (draggedId === targetId) return objects;

      const dragged = objects.find((obj) => obj.id === draggedId);
      const target = objects.find((obj) => obj.id === targetId);
      if (!dragged || !target) return objects;

      // Never drop a group inside itself.
      const moving = subtreeIds(objects, draggedId);
      if (moving.includes(targetId)) return objects;

      const ordered = [...objects].sort((a, b) => a.sort_order - b.sort_order);
      const block = ordered.filter((obj) => moving.includes(obj.id));
      const rest = ordered.filter((obj) => !moving.includes(obj.id));

      const targetIndex = rest.findIndex((obj) => obj.id === targetId);
      if (targetIndex === -1) return objects;
      const insertAt = place === "above" ? targetIndex + 1 : targetIndex;

      const reparented = block.map((obj) =>
        obj.id === draggedId
          ? { ...obj, parent_object_id: target.parent_object_id ?? null }
          : obj,
      );

      return resequence([
        ...rest.slice(0, insertAt),
        ...reparented,
        ...rest.slice(insertAt),
      ]);
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

    /** Removes the given layers and every descendant. */
    remove(objects: SceneObject[], ids: string[]) {
      const doomed = new Set(ids.flatMap((id) => subtreeIds(objects, id)));
      return resequence(objects.filter((obj) => !doomed.has(obj.id)));
    },

    updateObject(
      objects: SceneObject[],
      id: string,
      patch: Partial<SceneObject>,
    ) {
      return objects.map((obj) => (obj.id === id ? { ...obj, ...patch } : obj));
    },

    /**
     * Wraps the given layers in a new group object sized to their bounding box.
     * Children keep their own transforms — the group is a transform/visibility
     * parent, matching how the renderer walks `parent_object_id`.
     */
    group(objects: SceneObject[], ids: string[]) {
      const members = objects.filter((obj) => ids.includes(obj.id));
      if (members.length < 2) return objects;

      const groupId = `obj-${crypto.randomUUID()}`;
      const left = Math.min(...members.map((m) => m.transform.x));
      const top = Math.min(...members.map((m) => m.transform.y));
      const right = Math.max(
        ...members.map((m) => m.transform.x + m.transform.width),
      );
      const bottom = Math.max(
        ...members.map((m) => m.transform.y + m.transform.height),
      );

      const anchor = members.reduce(
        (lowest, m) => (m.sort_order < lowest.sort_order ? m : lowest),
        members[0],
      );

      const groupObject: SceneObject = {
        id: groupId,
        name: "Group",
        object_type: "group",
        parent_object_id: anchor.parent_object_id ?? null,
        component_id: null,
        sort_order: anchor.sort_order,
        start_ms: Math.min(...members.map((m) => m.start_ms)),
        end_ms: Math.max(...members.map((m) => m.end_ms)),
        offset_ms: 0,
        visible: true,
        locked: false,
        layer_color: "#64748B",
        transform: {
          x: left,
          y: top,
          width: Math.max(1, right - left),
          height: Math.max(1, bottom - top),
          scale: 1,
          rotation: 0,
          opacity: 1,
        },
        style: {},
        content: {},
        bindings: {},
        metadata: {},
      };

      const memberIds = new Set(ids);
      const next = objects.map((obj) =>
        memberIds.has(obj.id)
          ? { ...obj, parent_object_id: groupId }
          : obj,
      );

      const ordered = [...next, groupObject].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      return resequence(ordered);
    },

    /** Dissolves a group, re-parenting its children to the group's parent. */
    ungroup(objects: SceneObject[], groupId: string) {
      const group = objects.find((obj) => obj.id === groupId);
      if (!group) return objects;

      const next = objects
        .filter((obj) => obj.id !== groupId)
        .map((obj) =>
          obj.parent_object_id === groupId
            ? { ...obj, parent_object_id: group.parent_object_id ?? null }
            : obj,
        );

      return resequence(next.sort((a, b) => a.sort_order - b.sort_order));
    },
  };
}
