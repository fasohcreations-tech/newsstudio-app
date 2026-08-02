"use client";

import type { CSSProperties, ReactNode } from "react";

type VideoFrameProps = {
  borderWidth: number;
  borderColor: string;
  cornerRadius: number;
  frameOpacity: number;
  glassOpacity: number;
  innerShadow: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Premium metallic dark broadcast frame — thin border, soft bevel, subtle depth.
 * No thick borders or neon glow.
 */
export function VideoFrame({
  borderWidth,
  borderColor,
  cornerRadius,
  frameOpacity,
  glassOpacity,
  innerShadow,
  children,
  className,
  style,
}: VideoFrameProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        opacity: frameOpacity,
        borderRadius: cornerRadius,
        border: `${borderWidth}px solid ${borderColor}`,
        background: `
          linear-gradient(165deg, rgba(58, 68, 84, 0.55) 0%, rgba(22, 28, 38, 0.92) 42%, rgba(12, 16, 24, 0.98) 100%)
        `,
        boxShadow: `
          inset 0 1px 0 rgba(220, 228, 240, 0.28),
          inset 0 -1px 0 rgba(0, 0, 0, 0.45),
          inset 0 0 ${10 + innerShadow * 18}px rgba(0, 0, 0, ${0.18 + innerShadow * 0.35}),
          0 4px 14px rgba(0, 0, 0, 0.28),
          0 1px 0 rgba(255, 255, 255, 0.04)
        `,
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Thin silver inner highlight */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: Math.max(1, borderWidth),
          borderRadius: Math.max(0, cornerRadius - borderWidth),
          border: "1px solid rgba(210, 220, 235, 0.22)",
          pointerEvents: "none",
          zIndex: 6,
        }}
      />
      {/* Soft glass wash */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: cornerRadius,
          background: `linear-gradient(180deg, rgba(255,255,255,${glassOpacity * 0.8}) 0%, transparent 28%, rgba(0,0,0,${glassOpacity}) 100%)`,
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
      {children}
    </div>
  );
}
