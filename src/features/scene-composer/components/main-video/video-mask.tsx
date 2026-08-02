"use client";

import type { CSSProperties, ReactNode } from "react";

import type { Gnn001VideoFit } from "@/features/scene-composer/lib/gnn-001-main-video.constants";

type VideoMaskProps = {
  fit: Gnn001VideoFit;
  scale: number;
  positionX: number;
  positionY: number;
  rotation: number;
  opacity: number;
  crop: number;
  cornerRadius: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function fitToObjectFit(fit: Gnn001VideoFit): CSSProperties["objectFit"] {
  switch (fit) {
    case "fit":
      return "contain";
    case "fill":
      return "cover";
    case "crop":
      return "cover";
    case "center":
      return "none";
    case "zoom":
      return "cover";
    default:
      return "cover";
  }
}

/**
 * Dedicated video mask — supports Fit / Fill / Crop / Center / Zoom.
 */
export function VideoMask({
  fit,
  scale,
  positionX,
  positionY,
  rotation,
  opacity,
  crop,
  cornerRadius,
  children,
  className,
  style,
}: VideoMaskProps) {
  const zoomBoost = fit === "zoom" ? 1.12 : fit === "crop" ? 1 + crop : 1;
  const effectiveScale = scale * zoomBoost;

  return (
    <div
      className={className}
      data-video-mask
      data-fit={fit}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: Math.max(0, cornerRadius - 2),
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: fit === "crop" ? `-${crop * 100}%` : 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: `
            translate(${positionX}px, ${positionY}px)
            rotate(${rotation}deg)
            scale(${effectiveScale})
          `,
          transformOrigin: "center center",
          ["--video-object-fit" as string]: fitToObjectFit(fit),
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function videoMaskMediaStyle(): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    objectFit: "var(--video-object-fit, cover)" as CSSProperties["objectFit"],
    objectPosition: "center",
    display: "block",
  };
}
