"use client";

import {
  resolveGnn001FrameProps,
  type Gnn001FrameProps,
} from "@/features/scene-composer/lib/gnn-001-frame.constants";

type Gnn001BroadcastFrameProps = {
  width: number;
  height: number;
  content?: Record<string, unknown>;
  bindings?: Record<string, string>;
  props?: Partial<Gnn001FrameProps>;
};

/**
 * Layer 2 — premium broadcast frame chrome.
 * No text, logos, or animations.
 */
export function Gnn001BroadcastFrame({
  width,
  height,
  content = {},
  bindings = {},
  props,
}: Gnn001BroadcastFrameProps) {
  const resolved = {
    ...resolveGnn001FrameProps(content, bindings),
    ...props,
  };

  const accentStrip = content.accent_strip === true;
  const cornerMarks = content.corner_marks === true;
  const glass = content.glass !== false && content.composition_border !== true;
  const solidFill =
    typeof content.solid_fill === "string" && content.solid_fill.length > 0
      ? content.solid_fill
      : null;
  const compositionBorder = content.composition_border === true;
  const hideChrome = content.hide_chrome === true;
  const liveIndicator = content.live_indicator === true;

  const radius = Math.min(14, Math.max(10, resolved.border_radius));
  const outerStroke = Math.max(1, resolved.border_width);
  const accentWidth = Math.max(2, resolved.accent_width);
  const glassAlpha = resolved.glass_opacity;
  const shadowAlpha = resolved.shadow_strength * 0.55;

  if (liveIndicator) {
    return null;
  }

  if (hideChrome && !solidFill) {
    return null;
  }

  if (hideChrome && solidFill) {
    return (
      <div
        className="pointer-events-none absolute box-border"
        style={{
          width,
          height,
          borderRadius: radius,
          background: solidFill,
        }}
        aria-hidden
      />
    );
  }

  if (resolved.border_width <= 0 && !glass && !solidFill && !accentStrip && !cornerMarks) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute box-border"
      style={{
        width,
        height,
        borderRadius: compositionBorder ? 14 : radius,
        boxShadow: compositionBorder
          ? "none"
          : `0 10px 28px rgba(0,0,0,${shadowAlpha})`,
      }}
      aria-hidden
    >
      {/* Glass / solid fill */}
      {solidFill ? (
        <div
          className="absolute inset-0"
          style={{
            borderRadius: radius,
            background: solidFill,
          }}
        />
      ) : glass ? (
        <div
          className="absolute inset-0"
          style={{
            borderRadius: radius,
            background: `rgba(255,255,255,${glassAlpha})`,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        />
      ) : null}

      {/* Outer stroke */}
      {outerStroke > 0 ? (
      <div
        className="absolute inset-0 box-border"
        style={{
          borderRadius: compositionBorder ? 14 : radius,
          border: `${outerStroke}px solid ${resolved.border_color}`,
        }}
      />
      ) : null}

      {/* Inner highlight */}
      {outerStroke > 0 ? (
      <div
        className="absolute box-border"
        style={{
          inset: outerStroke + 1,
          borderRadius: Math.max(0, (compositionBorder ? 14 : radius) - outerStroke - 1),
          border: "1px solid rgba(255,255,255,0.28)",
        }}
      />
      ) : null}

      {/* Left accent strip */}
      {accentStrip ? (
        <div
          className="absolute"
          style={{
            left: outerStroke + 2,
            top: outerStroke + 4,
            bottom: outerStroke + 4,
            width: accentWidth,
            borderRadius: accentWidth,
            background: `linear-gradient(180deg, ${resolved.accent_color}, color-mix(in srgb, ${resolved.accent_color} 55%, #ffffff))`,
            boxShadow: `0 0 10px color-mix(in srgb, ${resolved.accent_color} 40%, transparent)`,
          }}
        />
      ) : null}

      {/* Decorative corners — Main Video only */}
      {cornerMarks ? (
        <>
          <CornerMark
            style={{ left: 10, top: 10 }}
            color={resolved.accent_color}
          />
          <CornerMark
            style={{ right: 10, top: 10, transform: "scaleX(-1)" }}
            color={resolved.accent_color}
          />
          <CornerMark
            style={{ left: 10, bottom: 10, transform: "scaleY(-1)" }}
            color={resolved.accent_color}
          />
          <CornerMark
            style={{
              right: 10,
              bottom: 10,
              transform: "scale(-1)",
            }}
            color={resolved.accent_color}
          />
        </>
      ) : null}
    </div>
  );
}

function CornerMark({
  style,
  color,
}: {
  style: React.CSSProperties;
  color: string;
}) {
  return (
    <div
      className="absolute"
      style={{
        width: 22,
        height: 22,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 22,
          height: 2,
          background: color,
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 2,
          height: 22,
          background: color,
          borderRadius: 1,
        }}
      />
    </div>
  );
}
