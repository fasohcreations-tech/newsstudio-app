"use client";

export type CornerAccentPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type CornerAccentProps = {
  position: CornerAccentPosition;
  color: string;
  thickness: number;
  /** Accent arm length in px (spec: ~30–40). */
  length?: number;
  inset?: number;
};

/**
 * Small editable L-bracket corner accent. Color from Brand Kit / state.
 */
export function CornerAccent({
  position,
  color,
  thickness,
  length = 36,
  inset = 6,
}: CornerAccentProps) {
  const isTop = position.startsWith("top");
  const isLeft = position.endsWith("left");

  return (
    <div
      aria-hidden
      data-corner-accent={position}
      style={{
        position: "absolute",
        top: isTop ? inset : undefined,
        bottom: !isTop ? inset : undefined,
        left: isLeft ? inset : undefined,
        right: !isLeft ? inset : undefined,
        width: length,
        height: length,
        pointerEvents: "none",
        zIndex: 8,
      }}
    >
      {/* Horizontal arm */}
      <span
        style={{
          position: "absolute",
          [isTop ? "top" : "bottom"]: 0,
          [isLeft ? "left" : "right"]: 0,
          width: length,
          height: thickness,
          background: color,
          borderRadius: 1,
          boxShadow: `0 0 0 0.5px rgba(255,255,255,0.12)`,
        }}
      />
      {/* Vertical arm */}
      <span
        style={{
          position: "absolute",
          [isTop ? "top" : "bottom"]: 0,
          [isLeft ? "left" : "right"]: 0,
          width: thickness,
          height: length,
          background: color,
          borderRadius: 1,
          boxShadow: `0 0 0 0.5px rgba(255,255,255,0.12)`,
        }}
      />
    </div>
  );
}

export function CornerAccentSet(props: {
  color: string;
  thickness: number;
  length?: number;
  inset?: number;
}) {
  return (
    <>
      <CornerAccent position="top-left" {...props} />
      <CornerAccent position="top-right" {...props} />
      <CornerAccent position="bottom-left" {...props} />
      <CornerAccent position="bottom-right" {...props} />
    </>
  );
}
