import { getObjectBounds } from "@/features/scene-composer/services/canvas.service.impl";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export type AlignmentGuide = {
  orientation: "vertical" | "horizontal";
  /** Position on the artboard axis (x for vertical, y for horizontal). */
  position: number;
  /** Guide span endpoints for drawing. */
  from: number;
  to: number;
};

const THRESHOLD = 6;

type Edge = { value: number; kind: "start" | "center" | "end" };

function edgesOf(object: SceneObject): { x: Edge[]; y: Edge[] } {
  const b = getObjectBounds(object);
  return {
    x: [
      { value: b.left, kind: "start" },
      { value: (b.left + b.right) / 2, kind: "center" },
      { value: b.right, kind: "end" },
    ],
    y: [
      { value: b.top, kind: "start" },
      { value: (b.top + b.bottom) / 2, kind: "center" },
      { value: b.bottom, kind: "end" },
    ],
  };
}

/**
 * Smart alignment guides — snap a moving object to sibling edges/centers
 * and to the artboard midlines.
 */
export function computeAlignmentGuides(args: {
  moving: SceneObject;
  siblings: SceneObject[];
  artboard: { width: number; height: number };
  threshold?: number;
}): {
  guides: AlignmentGuide[];
  snapped: { x: number; y: number };
} {
  const threshold = args.threshold ?? THRESHOLD;
  const movingEdges = edgesOf(args.moving);
  let snapDx = 0;
  let snapDy = 0;
  let bestDx = threshold + 1;
  let bestDy = threshold + 1;
  const guides: AlignmentGuide[] = [];

  const targetsX: number[] = [
    0,
    args.artboard.width / 2,
    args.artboard.width,
  ];
  const targetsY: number[] = [
    0,
    args.artboard.height / 2,
    args.artboard.height,
  ];

  for (const sibling of args.siblings) {
    if (sibling.id === args.moving.id || !sibling.visible) continue;
    const edges = edgesOf(sibling);
    for (const e of edges.x) targetsX.push(e.value);
    for (const e of edges.y) targetsY.push(e.value);
  }

  for (const edge of movingEdges.x) {
    for (const target of targetsX) {
      const delta = target - edge.value;
      const abs = Math.abs(delta);
      if (abs < bestDx) {
        bestDx = abs;
        snapDx = delta;
      }
    }
  }

  for (const edge of movingEdges.y) {
    for (const target of targetsY) {
      const delta = target - edge.value;
      const abs = Math.abs(delta);
      if (abs < bestDy) {
        bestDy = abs;
        snapDy = delta;
      }
    }
  }

  const snappedX =
    bestDx <= threshold
      ? args.moving.transform.x + snapDx
      : args.moving.transform.x;
  const snappedY =
    bestDy <= threshold
      ? args.moving.transform.y + snapDy
      : args.moving.transform.y;

  const probe: SceneObject = {
    ...args.moving,
    transform: {
      ...args.moving.transform,
      x: snappedX,
      y: snappedY,
    },
  };
  const probeEdges = edgesOf(probe);
  const b = getObjectBounds(probe);

  for (const edge of probeEdges.x) {
    for (const target of targetsX) {
      if (Math.abs(edge.value - target) <= 0.5) {
        guides.push({
          orientation: "vertical",
          position: target,
          from: Math.min(0, b.top),
          to: Math.max(args.artboard.height, b.bottom),
        });
      }
    }
  }
  for (const edge of probeEdges.y) {
    for (const target of targetsY) {
      if (Math.abs(edge.value - target) <= 0.5) {
        guides.push({
          orientation: "horizontal",
          position: target,
          from: Math.min(0, b.left),
          to: Math.max(args.artboard.width, b.right),
        });
      }
    }
  }

  // Deduplicate coincident guides.
  const unique: AlignmentGuide[] = [];
  for (const guide of guides) {
    if (
      unique.some(
        (g) =>
          g.orientation === guide.orientation &&
          Math.abs(g.position - guide.position) < 0.5,
      )
    ) {
      continue;
    }
    unique.push(guide);
  }

  return {
    guides: unique,
    snapped: { x: snappedX, y: snappedY },
  };
}

/** Objects whose axis-aligned bounds intersect the marquee rect. */
export function objectsInMarquee(
  objects: SceneObject[],
  rect: { left: number; top: number; right: number; bottom: number },
): SceneObject[] {
  const left = Math.min(rect.left, rect.right);
  const right = Math.max(rect.left, rect.right);
  const top = Math.min(rect.top, rect.bottom);
  const bottom = Math.max(rect.top, rect.bottom);
  return objects.filter((object) => {
    if (!object.visible) return false;
    const b = getObjectBounds(object);
    return !(
      b.right < left ||
      b.left > right ||
      b.bottom < top ||
      b.top > bottom
    );
  });
}
