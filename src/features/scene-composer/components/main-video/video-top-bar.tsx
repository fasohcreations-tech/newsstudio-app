"use client";

type VideoTopBarProps = {
  visible: boolean;
  height: number;
  color: string;
  opacity: number;
  title: string;
  safeArea: number;
};

/**
 * Optional title strip above the video. Hidden by default.
 * Placeholder: {{scene_title}}
 */
export function VideoTopBar({
  visible,
  height,
  color,
  opacity,
  title,
  safeArea,
}: VideoTopBarProps) {
  if (!visible) return null;

  return (
    <div
      data-video-top-bar
      style={{
        position: "absolute",
        top: safeArea,
        left: safeArea,
        right: safeArea,
        height,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        borderRadius: 4,
        background: color,
        opacity,
        zIndex: 7,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "rgba(245, 248, 255, 0.92)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title || "{{scene_title}}"}
      </span>
    </div>
  );
}
