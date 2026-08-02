"use client";

import {
  GNN_001_VIDEO_GLOW_ANCHOR,
  resolveGnn001BackgroundProps,
  type Gnn001BackgroundProps,
} from "@/features/scene-composer/lib/gnn-001-background.constants";

type Gnn001BroadcastBackgroundProps = {
  width?: number;
  height?: number;
  content?: Record<string, unknown>;
  bindings?: Record<string, string>;
  props?: Partial<Gnn001BackgroundProps>;
};

/**
 * Layer 1 — premium broadcast background.
 * No text, logos, or animations.
 */
export function Gnn001BroadcastBackground({
  width = 1920,
  height = 1080,
  content = {},
  bindings = {},
  props,
}: Gnn001BroadcastBackgroundProps) {
  const resolved = {
    ...resolveGnn001BackgroundProps(content, bindings),
    ...props,
  };

  const glowX =
    ((GNN_001_VIDEO_GLOW_ANCHOR.x + GNN_001_VIDEO_GLOW_ANCHOR.width / 2) /
      width) *
    100;
  const glowY =
    ((GNN_001_VIDEO_GLOW_ANCHOR.y + GNN_001_VIDEO_GLOW_ANCHOR.height / 2) /
      height) *
    100;
  const glowRadius = Math.max(
    GNN_001_VIDEO_GLOW_ANCHOR.width,
    GNN_001_VIDEO_GLOW_ANCHOR.height,
  );

  const mapOpacity = Math.min(0.1, Math.max(0.05, resolved.world_map_opacity));
  const glowAlpha = Math.min(1, Math.max(0, resolved.glow_intensity)) * 0.55;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ width, height }}
      aria-hidden
    >
      {/* Base navy + diagonal blue gradient (top-right → bottom-left) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              215deg,
              ${resolved.accent_color}33 0%,
              ${resolved.secondary_color} 38%,
              ${resolved.primary_color} 100%
            )
          `,
        }}
      />

      {/* Soft radial glow behind main video area */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            circle ${glowRadius * 0.72}px at ${glowX}% ${glowY}%,
            color-mix(in srgb, ${resolved.accent_color} ${Math.round(glowAlpha * 100)}%, transparent) 0%,
            transparent 68%
          )`,
        }}
      />

      {/* Subtle world map silhouette */}
      <svg
        viewBox="0 0 1920 1080"
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ opacity: mapOpacity }}
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill={resolved.accent_color} fillOpacity={1}>
          {/* Simplified continent silhouettes — decorative only */}
          <path d="M310 250c40-18 92-22 130-8 28 10 48 34 42 62-8 36-46 48-78 58-40 12-86 8-118-14-26-18-34-48-20-74 10-18 28-20 44-24z" />
          <path d="M520 390c52-8 98 18 122 56 18 28 12 68-14 88-34 26-86 28-126 10-30-14-48-46-42-78 6-30 28-52 60-76z" />
          <path d="M780 220c70-20 150-10 210 28 48 30 78 78 70 132-10 66-72 104-136 118-70 16-148-4-196-52-42-42-48-110-10-158 24-30 40-48 62-68z" />
          <path d="M1080 360c88-12 170 24 210 90 28 46 18 108-28 142-56 42-140 46-206 18-54-22-88-74-80-130 8-52 44-96 104-120z" />
          <path d="M1320 250c60-30 140-26 200 8 46 26 74 74 66 126-10 62-68 98-128 108-66 12-140-10-180-58-34-40-36-100 0-140 18-22 26-30 42-44z" />
          <path d="M1540 470c48-8 96 14 118 52 16 28 8 66-18 86-34 26-86 24-120 2-28-18-42-52-34-84 8-30 28-48 54-56z" />
          <path d="M420 620c70-6 140 28 170 84 20 38 6 88-34 110-48 26-116 22-166-8-40-24-60-70-48-114 10-36 40-66 78-72z" />
          <path d="M980 640c90 0 170 40 196 110 16 44-10 96-56 116-58 26-138 18-196-16-46-28-70-80-54-128 14-42 52-78 110-82z" />
          <path d="M1480 680c56-4 108 30 126 78 12 34-6 74-40 90-42 20-100 12-140-18-32-24-46-66-30-100 14-30 44-46 84-50z" />
        </g>
        {/* Soft latitude/longitude hints */}
        <g
          fill="none"
          stroke={resolved.accent_color}
          strokeWidth={1}
          strokeOpacity={0.35}
        >
          <ellipse cx="960" cy="540" rx="620" ry="300" />
          <ellipse cx="960" cy="540" rx="420" ry="210" />
          <path d="M340 540h1240" />
          <path d="M960 240v600" />
        </g>
      </svg>

      {/* Very subtle diagonal grid / line texture */}
      {resolved.grid_visibility ? (
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.06,
            backgroundImage: `
              repeating-linear-gradient(
                135deg,
                ${resolved.accent_color} 0px,
                ${resolved.accent_color} 1px,
                transparent 1px,
                transparent 28px
              ),
              repeating-linear-gradient(
                45deg,
                ${resolved.secondary_color} 0px,
                ${resolved.secondary_color} 1px,
                transparent 1px,
                transparent 56px
              )
            `,
          }}
        />
      ) : null}

      {/* Gentle vignette for broadcast depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 42%,
            ${resolved.primary_color}cc 100%
          )`,
        }}
      />
    </div>
  );
}
