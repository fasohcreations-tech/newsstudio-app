"use client";

import { useEffect, useRef } from "react";

import { computeAlignmentGuides } from "@/features/scene-composer/lib/alignment-guides";
import type { AlignmentGuide } from "@/features/scene-composer/lib/alignment-guides";
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
  siblings?: SceneObject[];
  showGuides?: boolean;
  artboardWidth: number;
  artboardHeight: number;
  zoom: number;
  snapEnabled?: boolean;
  gridSize?: number;
  spaceHeld?: boolean;
  onAlignmentGuides?: (guides: AlignmentGuide[]) => void;
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
  mode: "move" | "resize" | "rotate";
  handle?: ResizeHandle;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  origin: ObjectTransform;
  /** Rotation only — box centre in client space + the pointer's starting angle. */
  centerClientX?: number;
  centerClientY?: number;
  startAngleDeg?: number;
};

const ROTATE_SNAP_DEG = 15;

function normalizeDeg(value: number): number {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/**
 * Selection outline + interactive move / resize / rotate handles.
 */
export function SelectionChrome({
  object,
  siblings = [],
  showGuides = true,
  artboardWidth,
  artboardHeight,
  zoom,
  snapEnabled = false,
  gridSize = 16,
  spaceHeld = false,
  onAlignmentGuides,
  onTransformLive,
  onTransformCommit,
}: SelectionChromeProps) {
  const { x, y, width, height, rotation } = object.transform;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const dragRef = useRef<DragSession | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const latestTransformRef = useRef(object.transform);
  latestTransformRef.current = object.transform;
  const objectRef = useRef(object);
  objectRef.current = object;
  const siblingsRef = useRef(siblings);
  siblingsRef.current = siblings;
  const onGuidesRef = useRef(onAlignmentGuides);
  onGuidesRef.current = onAlignmentGuides;

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();

      const dx = (event.clientX - drag.startClientX) / Math.max(0.01, zoom);
      const dy = (event.clientY - drag.startClientY) / Math.max(0.01, zoom);

      let next: ObjectTransform;
      if (drag.mode === "move") {
        let x = snapValue(drag.origin.x + dx, gridSize, snapEnabled);
        let y = snapValue(drag.origin.y + dy, gridSize, snapEnabled);
        const probe = {
          ...objectRef.current,
          transform: { ...drag.origin, x, y },
        };
        const { guides, snapped } = computeAlignmentGuides({
          moving: probe,
          siblings: siblingsRef.current,
          artboard: { width: artboardWidth, height: artboardHeight },
        });
        x = snapped.x;
        y = snapped.y;
        onGuidesRef.current?.(guides);
        next = { ...drag.origin, x, y };
      } else if (drag.mode === "rotate") {
        const angleNow =
          (Math.atan2(
            event.clientY - (drag.centerClientY ?? 0),
            event.clientX - (drag.centerClientX ?? 0),
          ) *
            180) /
          Math.PI;
        const delta = angleNow - (drag.startAngleDeg ?? 0);
        // Shift constrains to 15° steps, the usual broadcast-editor behaviour.
        const raw = drag.origin.rotation + delta;
        next = {
          ...drag.origin,
          rotation: normalizeDeg(
            event.shiftKey
              ? Math.round(raw / ROTATE_SNAP_DEG) * ROTATE_SNAP_DEG
              : raw,
          ),
        };
        latestTransformRef.current = next;
        onTransformLive?.(next);
        return;
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
      onGuidesRef.current?.([]);
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
    mode: "move" | "resize" | "rotate",
    handle?: ResizeHandle,
  ) => {
    if (object.locked || spaceHeld) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const session: DragSession = {
      mode,
      handle,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: { ...object.transform },
    };

    if (mode === "rotate") {
      const box = boxRef.current?.getBoundingClientRect();
      const centerX = box ? box.left + box.width / 2 : event.clientX;
      const centerY = box ? box.top + box.height / 2 : event.clientY;
      session.centerClientX = centerX;
      session.centerClientY = centerY;
      session.startAngleDeg =
        (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) /
        Math.PI;
    }

    dragRef.current = session;
    latestTransformRef.current = object.transform;
  };

  const interactive = Boolean(onTransformLive || onTransformCommit) && !object.locked;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40"
      aria-hidden={!interactive}
      data-selection-chrome
    >
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
        ref={boxRef}
        className={`absolute ${interactive ? "pointer-events-auto cursor-move" : ""}`}
        style={{
          left: x,
          top: y,
          width,
          height,
          boxShadow: "0 0 0 2px #38BDF8",
          // Match the rendered layer so the chrome tracks a rotated object.
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: "center center",
        }}
        onPointerDown={(event) => beginDrag(event, "move")}
      >
        <span
          className="pointer-events-none absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[12px] font-semibold text-white"
          style={{ background: object.layer_color || "#38BDF8" }}
        >
          {object.name}
          {object.locked ? " · locked" : ""}
          {rotation ? ` · ${Math.round(rotation)}°` : ""}
        </span>

        <span
          className={`absolute left-1/2 w-px bg-sky-400 ${
            interactive ? "" : "opacity-50"
          }`}
          style={{ top: -26, height: 26 }}
        />
        <span
          className={`absolute size-3 rounded-full border-2 border-sky-400 bg-white shadow ${
            interactive ? "pointer-events-auto" : ""
          }`}
          style={{
            left: width / 2 - 6,
            top: -32,
            cursor: interactive ? "grab" : undefined,
          }}
          title="Rotate (hold Shift for 15° steps)"
          onPointerDown={(event) => beginDrag(event, "rotate")}
        />

        {/* Anchor / pivot point — visual gizmo at the transform centre. */}
        <span
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300 bg-amber-400/90 shadow"
          style={{ left: width / 2, top: height / 2 }}
          title="Anchor"
        />

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
