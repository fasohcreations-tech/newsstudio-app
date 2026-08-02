import { createDefaultShapeConfig } from "@/features/scene-composer/lib/shape-composer/defaults";
import { setShapeConfig } from "@/features/scene-composer/lib/shape-composer/apply";
import type {
  ShapeKind,
  ShapeLibraryItem,
  ShapeToolAction,
} from "@/features/scene-composer/lib/shape-composer/types";
import { createSceneObject } from "@/features/scene-composer/lib/object-factory";
import type {
  SceneObject,
  SceneObjectType,
} from "@/features/scene-composer/types/scene-composer.types";

const KIND_TO_OBJECT_TYPE: Partial<Record<ShapeKind, SceneObjectType>> = {
  rectangle: "rectangle",
  rounded_rectangle: "rounded_rectangle",
  circle: "circle",
  ellipse: "ellipse",
  line: "line",
  divider_line: "line",
  polygon: "polygon",
  triangle: "polygon",
  star: "polygon",
  arrow: "polygon",
  ribbon: "polygon",
  speech_bubble: "svg",
  svg_path: "svg",
  custom_path: "svg",
  image_mask: "mask",
  video_mask: "mask",
  glass_panel: "rounded_rectangle",
  gradient_panel: "gradient",
  border_frame: "rounded_rectangle",
  corner_accent: "polygon",
  ticker_bar: "rectangle",
  headline_bar: "rectangle",
  reporter_card: "rounded_rectangle",
  video_frame: "rounded_rectangle",
};

export function objectTypeForShapeKind(kind: ShapeKind): SceneObjectType {
  return KIND_TO_OBJECT_TYPE[kind] ?? "rectangle";
}

export function createShapeObject(input: {
  kind: ShapeKind;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  sortOrder?: number;
}): SceneObject {
  const object = createSceneObject({
    objectType: objectTypeForShapeKind(input.kind),
    name: input.name,
    durationMs: input.durationMs,
    sortOrder: input.sortOrder,
    transform: {
      x: input.x ?? 200,
      y: input.y ?? 200,
      width: input.width ?? 320,
      height: input.height ?? 180,
    },
  });
  return setShapeConfig(object, createDefaultShapeConfig(input.kind));
}

export function createShapeFromLibraryItem(
  item: ShapeLibraryItem,
  opts?: { x?: number; y?: number; sortOrder?: number; durationMs?: number },
): SceneObject {
  return createShapeObject({
    kind: item.kind,
    name: item.name,
    x: opts?.x ?? 160,
    y: opts?.y ?? 160,
    width: item.defaultWidth,
    height: item.defaultHeight,
    sortOrder: opts?.sortOrder,
    durationMs: opts?.durationMs,
  });
}

export function duplicateShapeObject(object: SceneObject): SceneObject {
  const copy = createSceneObject({
    objectType: object.object_type,
    name: `${object.name} Copy`,
    durationMs: object.end_ms - object.start_ms,
    sortOrder: object.sort_order + 1,
    transform: {
      ...object.transform,
      x: object.transform.x + 24,
      y: object.transform.y + 24,
    },
    content: { ...object.content },
  });
  return {
    ...copy,
    style: { ...object.style },
    bindings: { ...object.bindings },
    metadata: {
      ...object.metadata,
      shape: object.metadata.shape
        ? structuredClone(object.metadata.shape)
        : object.metadata.shape,
    },
    locked: false,
    visible: true,
  };
}

/** Align / distribute helpers operating on transform boxes. */
export function alignObjects(
  objects: SceneObject[],
  action: Extract<
    ShapeToolAction,
    | "align_left"
    | "align_center"
    | "align_right"
    | "align_top"
    | "align_middle"
    | "align_bottom"
  >,
): SceneObject[] {
  if (objects.length < 2) return objects;
  const xs = objects.map((o) => o.transform.x);
  const ys = objects.map((o) => o.transform.y);
  const rights = objects.map((o) => o.transform.x + o.transform.width);
  const bottoms = objects.map((o) => o.transform.y + o.transform.height);
  const minX = Math.min(...xs);
  const maxRight = Math.max(...rights);
  const minY = Math.min(...ys);
  const maxBottom = Math.max(...bottoms);
  const centerX = (minX + maxRight) / 2;
  const centerY = (minY + maxBottom) / 2;

  return objects.map((object) => {
    const t = { ...object.transform };
    switch (action) {
      case "align_left":
        t.x = minX;
        break;
      case "align_right":
        t.x = maxRight - t.width;
        break;
      case "align_center":
        t.x = centerX - t.width / 2;
        break;
      case "align_top":
        t.y = minY;
        break;
      case "align_bottom":
        t.y = maxBottom - t.height;
        break;
      case "align_middle":
        t.y = centerY - t.height / 2;
        break;
    }
    return { ...object, transform: t };
  });
}

export function distributeObjects(
  objects: SceneObject[],
  axis: "h" | "v",
): SceneObject[] {
  if (objects.length < 3) return objects;
  const sorted = [...objects].sort((a, b) =>
    axis === "h" ? a.transform.x - b.transform.x : a.transform.y - b.transform.y,
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSize = sorted.reduce(
    (sum, o) => sum + (axis === "h" ? o.transform.width : o.transform.height),
    0,
  );
  const span =
    axis === "h"
      ? last.transform.x + last.transform.width - first.transform.x
      : last.transform.y + last.transform.height - first.transform.y;
  const gap = (span - totalSize) / (sorted.length - 1);
  let cursor = axis === "h" ? first.transform.x : first.transform.y;
  const nextById = new Map<string, SceneObject>();

  sorted.forEach((object, index) => {
    if (index === 0) {
      nextById.set(object.id, object);
      cursor +=
        (axis === "h" ? object.transform.width : object.transform.height) + gap;
      return;
    }
    if (index === sorted.length - 1) {
      nextById.set(object.id, object);
      return;
    }
    nextById.set(object.id, {
      ...object,
      transform: {
        ...object.transform,
        x: axis === "h" ? cursor : object.transform.x,
        y: axis === "v" ? cursor : object.transform.y,
      },
    });
    cursor +=
      (axis === "h" ? object.transform.width : object.transform.height) + gap;
  });

  return objects.map((object) => nextById.get(object.id) ?? object);
}

/** Boolean ops are compositional markers for future geometry merge — stack metadata. */
export function markBooleanOperation(
  primary: SceneObject,
  secondary: SceneObject,
  op: "union" | "subtract" | "intersect",
): SceneObject {
  return {
    ...primary,
    metadata: {
      ...primary.metadata,
      shape_boolean: {
        op,
        with_object_id: secondary.id,
        version: 1,
      },
    },
  };
}

export function toggleShapeLock(object: SceneObject): SceneObject {
  return { ...object, locked: !object.locked };
}

export function toggleShapeHide(object: SceneObject): SceneObject {
  return { ...object, visible: !object.visible };
}

export function snapObjectToGrid(
  object: SceneObject,
  gridSize = 8,
): SceneObject {
  const snap = (n: number) => Math.round(n / gridSize) * gridSize;
  return {
    ...object,
    transform: {
      ...object.transform,
      x: snap(object.transform.x),
      y: snap(object.transform.y),
      width: Math.max(gridSize, snap(object.transform.width)),
      height: Math.max(gridSize, snap(object.transform.height)),
    },
  };
}
