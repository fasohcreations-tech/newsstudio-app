"use client";

import type { ReactNode } from "react";

type VideoOverlayProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * Overlay slot inside the video frame (bars, badges, future HUD).
 */
export function VideoOverlay({ children, className }: VideoOverlayProps) {
  return (
    <div
      className={className}
      data-video-overlay
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 7,
      }}
    >
      {children}
    </div>
  );
}
