"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getEdgeSweepConfig,
  resolveCornerRadius,
  resolveEdgeSweepPathBox,
  resolveEdgeSweepSideMargins,
  roundedRectPerimeter,
} from "@/features/scene-composer/lib/edge-sweep";
import type { EdgeSweepConfig } from "@/features/scene-composer/lib/edge-sweep";
import { resolveObjectShapeOutline } from "@/features/scene-composer/lib/shape-composer";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

type EdgeSweepOverlayProps = {
  object: SceneObject;
  playheadMs?: number;
  isPlaying?: boolean;
  previewNonce?: number;
  hovered?: boolean;
};

function styleColor(config: EdgeSweepConfig): string {
  switch (config.style) {
    case "gold":
      return config.color || "#C6A15B";
    case "broadcast_blue":
      return config.color || "#5B8DEF";
    case "metallic":
      return config.color || "#94A3B8";
    default:
      return config.color;
  }
}

function dashPattern(config: EdgeSweepConfig, perimeter: number): string {
  const len = Math.max(
    24,
    perimeter * Math.min(0.9, Math.max(0.06, config.length)),
  );

  switch (config.style) {
    case "dual": {
      const seg = len * 0.7;
      const gap = Math.max(8, perimeter / 2 - seg);
      return `${seg} ${gap}`;
    }
    case "four_corner": {
      const seg = Math.max(16, len * 0.45);
      const gap = Math.max(8, perimeter / 4 - seg);
      return `${seg} ${gap}`;
    }
    case "dashed": {
      const seg = Math.max(10, len * 0.22);
      const gap = seg * 1.35;
      return `${seg} ${gap}`;
    }
    default: {
      const gap = Math.max(8, perimeter - len);
      return `${len} ${gap}`;
    }
  }
}

/**
 * GPU-friendly SVG perimeter sweep — follows Shape Composer outline when
 * the layer is a polygon/star/ellipse/etc.; otherwise a rounded rect.
 */
export function EdgeSweepOverlay({
  object,
  playheadMs = 0,
  isPlaying = false,
  previewNonce = 0,
  hovered = false,
}: EdgeSweepOverlayProps) {
  const config = getEdgeSweepConfig(object);
  const pathRef = useRef<SVGGeometryElement | null>(null);
  const trailRef = useRef<SVGGeometryElement | null>(null);
  const [onceDone, setOnceDone] = useState(false);
  const [sceneStarted, setSceneStarted] = useState(false);
  const [localPreviewNonce, setLocalPreviewNonce] = useState(0);
  const [measuredPerimeter, setMeasuredPerimeter] = useState(0);
  const activePreviewNonce = previewNonce || localPreviewNonce;

  const width = Math.max(1, object.transform.width);
  const height = Math.max(1, object.transform.height);
  const outline = useMemo(() => resolveObjectShapeOutline(object), [object]);
  const useShapePath = Boolean(outline && !outline.rectLike);

  const radius = resolveCornerRadius(object, config);
  const pathBox = resolveEdgeSweepPathBox(width, height, radius, config);
  const strokeColor = styleColor(config);

  const rectPerimeter = useMemo(
    () => roundedRectPerimeter(pathBox.width, pathBox.height, pathBox.rx),
    [pathBox.width, pathBox.height, pathBox.rx],
  );
  const perimeter = useShapePath
    ? Math.max(1, measuredPerimeter || rectPerimeter)
    : rectPerimeter;

  const dash = useMemo(
    () => dashPattern(config, perimeter),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
    [config.style, config.length, perimeter],
  );

  const margins = resolveEdgeSweepSideMargins(config);
  const avgMargin =
    (margins.top + margins.right + margins.bottom + margins.left) / 4;
  const shapeScale =
    useShapePath && outline
      ? Math.max(
          0.15,
          1 -
            (avgMargin * 2) /
              Math.min(outline.placementWidth, outline.placementHeight),
        )
      : 1;
  const shapeTransform =
    useShapePath && outline
      ? `translate(${outline.offsetX} ${outline.offsetY}) translate(${outline.placementWidth / 2} ${outline.placementHeight / 2}) scale(${shapeScale}) translate(${-outline.placementWidth / 2} ${-outline.placementHeight / 2})`
      : undefined;

  useEffect(() => {
    if (!useShapePath || !pathRef.current) return;
    try {
      const len = pathRef.current.getTotalLength();
      if (Number.isFinite(len) && len > 0) setMeasuredPerimeter(len);
    } catch {
      /* path not ready */
    }
  }, [
    useShapePath,
    outline?.localD,
    shapeScale,
    width,
    height,
    config.width,
  ]);

  useEffect(() => {
    if (isPlaying && playheadMs > 0) setSceneStarted(true);
  }, [isPlaying, playheadMs]);

  useEffect(() => {
    const onPreview = (event: Event) => {
      const detail = (event as CustomEvent<{ objectId?: string }>).detail;
      if (detail?.objectId === object.id) {
        setLocalPreviewNonce((n) => n + 1);
        setOnceDone(false);
      }
    };
    window.addEventListener("mediaos:edge-sweep-preview", onPreview);
    return () =>
      window.removeEventListener("mediaos:edge-sweep-preview", onPreview);
  }, [object.id]);

  useEffect(() => {
    if (activePreviewNonce > 0) setOnceDone(false);
  }, [activePreviewNonce]);

  const shouldAnimate = (() => {
    if (!config.enabled) return false;
    switch (config.loop) {
      case "continuous":
        return true;
      case "once":
        return !onceDone || activePreviewNonce > 0;
      case "on_hover":
        return hovered || activePreviewNonce > 0;
      case "on_scene_start":
        return sceneStarted || isPlaying || activePreviewNonce > 0;
      default:
        return true;
    }
  })();

  const sweepDurationMs = Math.max(400, 1000 / Math.max(0.05, config.speed));

  const applyProgress = useCallback(
    (progress: number) => {
      const path = pathRef.current;
      if (!path) return;
      const p =
        config.direction === "counterclockwise" ? 1 - progress : progress;
      const dir = config.direction === "clockwise" ? -1 : 1;
      const offset = perimeter * p;
      path.setAttribute("stroke-dashoffset", String(dir * offset));
      const trail = trailRef.current;
      if (trail) {
        trail.setAttribute(
          "stroke-dashoffset",
          String(dir * offset + perimeter * 0.03),
        );
      }
    },
    [config.direction, perimeter],
  );

  useEffect(() => {
    if (!isPlaying || !shouldAnimate) return;
    const localMs = Math.max(0, playheadMs - (object.start_ms ?? 0));
    const progress =
      config.loop === "once"
        ? Math.min(1, localMs / sweepDurationMs)
        : (localMs / sweepDurationMs) % 1;
    applyProgress(progress);
  }, [
    isPlaying,
    shouldAnimate,
    playheadMs,
    object.start_ms,
    config.loop,
    sweepDurationMs,
    applyProgress,
  ]);

  useEffect(() => {
    if (isPlaying || !shouldAnimate) return;
    if (!pathRef.current) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      let progress = (elapsed / sweepDurationMs) % 1;
      if (config.loop === "once" && elapsed >= sweepDurationMs) {
        progress = 1;
        setOnceDone(true);
      }
      applyProgress(progress);
      if (!(config.loop === "once" && elapsed >= sweepDurationMs)) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    isPlaying,
    shouldAnimate,
    sweepDurationMs,
    config.loop,
    applyProgress,
    activePreviewNonce,
  ]);

  if (!config.enabled) return null;

  const glow = Math.max(0, config.glowIntensity);
  const opacity = Math.min(
    1,
    Math.max(0.35, config.opacity) * Math.min(1.4, config.brightness),
  );
  const trailOpacity = opacity * Math.max(0.2, 1 - config.trailFade * 0.85);
  const filterId = `edge-glow-${object.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const strokeCommon = {
    fill: "none" as const,
    stroke: strokeColor,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: dash,
    strokeDashoffset: 0,
    filter: glow > 0.05 ? `url(#${filterId})` : undefined,
  };

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0"
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{
        zIndex: 40,
        overflow: "visible",
        mixBlendMode: config.blendMode === "screen" ? "normal" : config.blendMode,
        transform: "translateZ(0)",
        pointerEvents: "none",
      }}
    >
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={1 + glow * 2.5} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {useShapePath && outline ? (
        <g transform={shapeTransform}>
          {config.trailLength > 0.05 ? (
            <path
              ref={trailRef as React.RefObject<SVGPathElement>}
              d={outline.localD}
              strokeWidth={Math.max(1.5, config.width * 0.85)}
              opacity={trailOpacity * 0.55}
              {...strokeCommon}
            />
          ) : null}
          <path
            ref={pathRef as React.RefObject<SVGPathElement>}
            d={outline.localD}
            strokeWidth={Math.max(2, config.width)}
            opacity={opacity}
            {...strokeCommon}
          />
        </g>
      ) : (
        <>
          {config.trailLength > 0.05 ? (
            <rect
              ref={trailRef as React.RefObject<SVGRectElement>}
              x={pathBox.x}
              y={pathBox.y}
              width={pathBox.width}
              height={pathBox.height}
              rx={pathBox.rx}
              ry={pathBox.rx}
              strokeWidth={Math.max(1.5, config.width * 0.85)}
              opacity={trailOpacity * 0.55}
              {...strokeCommon}
            />
          ) : null}
          <rect
            ref={pathRef as React.RefObject<SVGRectElement>}
            x={pathBox.x}
            y={pathBox.y}
            width={pathBox.width}
            height={pathBox.height}
            rx={pathBox.rx}
            ry={pathBox.rx}
            strokeWidth={Math.max(2, config.width)}
            opacity={opacity}
            {...strokeCommon}
          />
        </>
      )}
    </svg>
  );
}
