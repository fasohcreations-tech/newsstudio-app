"use client";

import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

type SelectionChromeProps = {
  object: SceneObject;
  showGuides?: boolean;
  artboardWidth: number;
  artboardHeight: number;
};

const HANDLES = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
] as const;

/**
 * Selection outline + resize handles + alignment guides for the selected object.
 */
export function SelectionChrome({
  object,
  showGuides = true,
  artboardWidth,
  artboardHeight,
}: SelectionChromeProps) {
  const { x, y, width, height } = object.transform;
  const cx = x + width / 2;
  const cy = y + height / 2;

  return (
    <div className="pointer-events-none absolute inset-0 z-40" aria-hidden>
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
        className="absolute"
        style={{
          left: x,
          top: y,
          width,
          height,
          boxShadow: "0 0 0 2px #38BDF8",
        }}
      >
        <span
          className="absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[12px] font-semibold text-white"
          style={{ background: object.layer_color || "#38BDF8" }}
        >
          {object.name}
        </span>
        {HANDLES.map((handle) => {
          const style = handleStyle(handle, width, height);
          return (
            <span
              key={handle}
              className="absolute size-2.5 rounded-sm border-2 border-sky-400 bg-white shadow"
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}

function handleStyle(
  handle: (typeof HANDLES)[number],
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
