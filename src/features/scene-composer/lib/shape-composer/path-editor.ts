import { createPathPoint } from "@/features/scene-composer/lib/shape-composer/defaults";
import type {
  ShapePath,
  ShapePathPoint,
} from "@/features/scene-composer/lib/shape-composer/types";

/** Move a path point (normalized 0–1 coords). */
export function movePathPoint(
  path: ShapePath,
  pointId: string,
  x: number,
  y: number,
): ShapePath {
  return {
    ...path,
    points: path.points.map((pt) =>
      pt.id === pointId
        ? {
            ...pt,
            x: clamp01(x),
            y: clamp01(y),
          }
        : pt,
    ),
  };
}

/** Insert a point after `afterId` (or at end). */
export function addPathPoint(
  path: ShapePath,
  x: number,
  y: number,
  afterId?: string,
): ShapePath {
  const point = createPathPoint(clamp01(x), clamp01(y));
  if (!afterId) {
    return { ...path, points: [...path.points, point] };
  }
  const idx = path.points.findIndex((p) => p.id === afterId);
  if (idx < 0) return { ...path, points: [...path.points, point] };
  const next = [...path.points];
  next.splice(idx + 1, 0, point);
  return { ...path, points: next };
}

export function deletePathPoint(path: ShapePath, pointId: string): ShapePath {
  if (path.points.length <= 2) return path;
  return {
    ...path,
    points: path.points.filter((p) => p.id !== pointId),
  };
}

export function setPathPointHandles(
  path: ShapePath,
  pointId: string,
  handles: Partial<
    Pick<
      ShapePathPoint,
      "handleInX" | "handleInY" | "handleOutX" | "handleOutY" | "corner" | "smooth"
    >
  >,
): ShapePath {
  return {
    ...path,
    points: path.points.map((pt) =>
      pt.id === pointId ? { ...pt, ...handles } : pt,
    ),
  };
}

/** Convert point to smooth (auto mirrored handles). */
export function smoothPathPoint(path: ShapePath, pointId: string): ShapePath {
  const idx = path.points.findIndex((p) => p.id === pointId);
  if (idx < 0) return path;
  const prev = path.points[(idx - 1 + path.points.length) % path.points.length];
  const next = path.points[(idx + 1) % path.points.length];
  const dx = (next.x - prev.x) * 0.25;
  const dy = (next.y - prev.y) * 0.25;
  return setPathPointHandles(path, pointId, {
    smooth: true,
    corner: false,
    handleInX: -dx,
    handleInY: -dy,
    handleOutX: dx,
    handleOutY: dy,
  });
}

/** Convert point to sharp corner (clear handles). */
export function cornerPathPoint(path: ShapePath, pointId: string): ShapePath {
  return setPathPointHandles(path, pointId, {
    smooth: false,
    corner: true,
    handleInX: 0,
    handleInY: 0,
    handleOutX: 0,
    handleOutY: 0,
  });
}

/** Mirror out handle from in handle (or vice versa). */
export function mirrorPathHandles(
  path: ShapePath,
  pointId: string,
  from: "in" | "out" = "out",
): ShapePath {
  const pt = path.points.find((p) => p.id === pointId);
  if (!pt) return path;
  if (from === "out") {
    return setPathPointHandles(path, pointId, {
      handleInX: -pt.handleOutX,
      handleInY: -pt.handleOutY,
      smooth: true,
      corner: false,
    });
  }
  return setPathPointHandles(path, pointId, {
    handleOutX: -pt.handleInX,
    handleOutY: -pt.handleInY,
    smooth: true,
    corner: false,
  });
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}
