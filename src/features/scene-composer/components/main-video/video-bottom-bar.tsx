"use client";

type VideoBottomBarProps = {
  visible: boolean;
  height: number;
  color: string;
  opacity: number;
  caption: string;
  camera: string;
  credit: string;
  safeArea: number;
};

/**
 * Optional lower strip inside the video frame. Hidden by default.
 * Supports {{video_caption}}, {{camera}}, {{credit}}.
 */
export function VideoBottomBar({
  visible,
  height,
  color,
  opacity,
  caption,
  camera,
  credit,
  safeArea,
}: VideoBottomBarProps) {
  if (!visible) return null;

  const parts = [
    caption || "{{video_caption}}",
    camera ? `CAM ${camera}` : null,
    credit ? credit : null,
  ].filter(Boolean) as string[];

  return (
    <div
      data-video-bottom-bar
      style={{
        position: "absolute",
        bottom: safeArea,
        left: safeArea,
        right: safeArea,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
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
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(245, 248, 255, 0.9)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
        }}
      >
        {parts[0]}
      </span>
      {parts.length > 1 ? (
        <span
          style={{
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(200, 210, 230, 0.75)",
            whiteSpace: "nowrap",
          }}
        >
          {parts.slice(1).join(" · ")}
        </span>
      ) : null}
    </div>
  );
}
