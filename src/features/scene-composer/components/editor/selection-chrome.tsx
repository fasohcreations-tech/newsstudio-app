"use client";

import { useEffect, useRef } from "react";

import {
  clampTransform,
  snapValue,
} from "@/features/scene-composer/services/canvas.service.impl";
import type {
  ObjectTransform,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type SelectionChromeProps = {
  object: SceneObject;
  showGuides?: boolean;
  artboardWidth: number;
  artboardHeight: number;
  zoom: number;
  snapEnabled?: boolean;
  gridSize?: number;
  spaceHeld?: boolean;
  /** Live transform while dragging (no undo entry). */
  onTransformLive?: (transform: ObjectTransform) => void;
  /** Commit transform on pointer up (one undo entry). */
  onTransformCommit?: (
    transform: ObjectTransform,
    origin: ObjectTransform,
  ) => void;
};

const HANDLES: ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

const MIN_SIZE = 8;

type DragSession = {
  mode: "move" | "resize";
  handle?: ResizeHandle;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  origin: ObjectTransform;
};

/**
 * Selection outline + interactive move / resize handles.
 */
export function SelectionChrome({
  object,
  showGuides = true,
  artboardWidth,
  artboardHeight,
  zoom,
  snapEnabled = false,
  gridSize = 16,
  spaceHeld = false,
  onTransformLive,
  onTransformCommit,
}: SelectionChromeProps) {
  const { x, y, width, height } = object.transform;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const dragRef = useRef<DragSession | null>(null);
  const latestTransformRef = useRef(object.transform);
  latestTransformRef.current = object.transform;

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();

      const dx = (event.clientX - drag.startClientX) / Math.max(0.01, zoom);
      const dy = (event.clientY - drag.startClientY) / Math.max(0.01, zoom);

      let next: ObjectTransform;
      if (drag.mode === "move") {
        next = {
          ...drag.origin,
          x: snapValue(drag.origin.x + dx, gridSize, snapEnabled),
          y: snapValue(drag.origin.y + dy, gridSize, snapEnabled),
        };
      } else {
        next = resizeFromHandle(drag.origin, drag.handle!, dx, dy);
        next = {
          ...next,
          x: snapValue(next.x, gridSize, snapEnabled),
          y: snapValue(next.y, gridSize, snapEnabled),
          width: Math.max(
            MIN_SIZE,
            snapValue(next.width, gridSize, snapEnabled) || next.width,
          ),
          height: Math.max(
            MIN_SIZE,
            snapValue(next.height, gridSize, snapEnabled) || next.height,
          ),
        };
      }

      next = clampTransform(next, {
        width: artboardWidth,
        height: artboardHeight,
      });
      latestTransformRef.current = next;
      onTransformLive?.(next);
    };

    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      onTransformCommit?.(latestTransformRef.current, drag.origin);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [
    artboardHeight,
    artboardWidth,
    gridSize,
    onTransformCommit,
    onTransformLive,
    snapEnabled,
    zoom,
  ]);

  const beginDrag = (
    event: React.PointerEvent,
    mode: "move" | "resize",
    handle?: ResizeHandle,
  ) => {
    if (object.locked || spaceHeld) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    dragRef.current = {
      mode,
      handle,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: { ...object.transform },
    };
    latestTransformRef.current = object.transform;
  };

  const interactive = Boolean(onTransformLive || onTransformCommit) && !object.locked;

  return (
    <div className="pointer-events-none absolute inset-0 z-40" aria-hidden={!interactive}>
      {showGuides ? (
        <>
          <div
            className="absolute left-0 right-0 border-t border-dashed border-sky-400/50"
            style={{ top: cy }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-dashed border-sky-400/50"
            style={{ left: cx }}
          />
          <div
            className="absolute border border-dashed border-violet-400/30"
            style={{ left: 0, top: 0, width: artboardWidth, height: artboardHeight }}
          />
        </>
      ) : null}

      <div
        className={`absolute ${interactive ? "pointer-events-auto cursor-move" : ""}`}
        style={{
          left: x,
          top: y,
          width,
          height,
          boxShadow: "0 0 0 2px #38BDF8",
        }}
        onPointerDown={(event) => beginDrag(event, "move")}
      >
        <span
          className="pointer-events-none absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[12px] font-semibold text-white"
          style={{ background: object.layer_color || "#38BDF8" }}
        >
          {object.name}
          {object.locked ? " · locked" : ""}
        </span>
        {HANDLES.map((handle) => {
          const style = handleStyle(handle, width, height);
          return (
            <span
              key={handle}
              className={`absolute size-2.5 rounded-sm border-2 border-sky-400 bg-white shadow ${
                interactive ? "pointer-events-auto" : ""
              }`}
              style={{
                ...style,
                cursor: interactive ? resizeCursor(handle) : undefined,
              }}
              onPointerDown={(event) => beginDrag(event, "resize", handle)}
            />
          );
        })}
      </div>
    </div>
  );
}

function resizeFromHandle(
  origin: ObjectTransform,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): ObjectTransform {
  let { x, y, width, height } = origin;

  const fromLeft = handle.includes("w");
  const fromRight = handle.includes("e");
  const fromTop = handle.includes("n");
  const fromBottom = handle.includes("s");

  if (fromLeft) {
    const nextWidth = Math.max(MIN_SIZE, width - dx);
    x = x + (width - nextWidth);
    width = nextWidth;
  } else if (fromRight) {
    width = Math.max(MIN_SIZE, width + dx);
  }

  if (fromTop) {
    const nextHeight = Math.max(MIN_SIZE, height - dy);
    y = y + (height - nextHeight);
    height = nextHeight;
  } else if (fromBottom) {
    height = Math.max(MIN_SIZE, height + dy);
  }

  return { ...origin, x, y, width, height };
}

function resizeCursor(handle: ResizeHandle): string {
  switch (handle) {
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "nw":
    case "se":
      return "nwse-resize";
  }
}

function handleStyle(
  handle: ResizeHandle,
  width: number,
  height: number,
): React.CSSProperties {
  const half = 5;
  switch (handle) {
    case "nw":
      return { left: -half, top: -half };
    case "n":
      return { left: width / 2 - half, top: -half };
    case "ne":
      return { left: width - half, top: -half };
    case "e":
      return { left: width - half, top: height / 2 - half };
    case "se":
      return { left: width - half, top: height - half };
    case "s":
      return { left: width / 2 - half, top: height - half };
    case "sw":
      return { left: -half, top: height - half };
    case "w":
      return { left: -half, top: height / 2 - half };
  }
}
