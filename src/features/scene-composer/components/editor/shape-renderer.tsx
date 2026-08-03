"use client";

import { useEffect, useRef, useState } from "react";

import {
  buildShapePathD,
  cssTransformOriginFromAnchor,
  getShapeConfig,
  gradientCss,
  resolveAnchorPoint,
  resolvePlacement,
  resolveRadii,
  resolveRevealConfig,
  resolveRevealExit,
  sampleShapeBehaviors,
  sampleShapeReveal,
  shapeRevealTotalMs,
} from "@/features/scene-composer/lib/shape-composer";
import {
  shouldOverlayShape,
  shouldReplaceContentWithShape,
} from "@/features/scene-composer/lib/shape-composer/layer-policy";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export const SHAPE_BEHAVIOR_REPLAY_EVENT = "shape-behavior-replay";

type ShapeRendererProps = {
  object: SceneObject;
  className?: string;
  /**
   * Overlay mode sits above native layer content.
   * Fill still follows config (video frames use fillMode none).
   */
  overlay?: boolean;
  /** Absolute scene clock (ms). */
  clockMs?: number;
  isPlaying?: boolean;
  /**
   * Parent drives the clock (SelectableShell). Skip internal RAF.
   */
  useExternalClock?: boolean;
  showPathPoints?: boolean;
  selectedPointId?: string | null;
  onPointDrag?: (pointId: string, x: number, y: number) => void;
};

/**
 * SVG procedural shape renderer — fill, stroke, gradient, glass, glow + behaviors.
 */
export function ShapeRenderer({
  object,
  className,
  overlay = false,
  clockMs = 0,
  isPlaying = false,
  useExternalClock = false,
  showPathPoints = false,
  selectedPointId = null,
  onPointDrag,
}: ShapeRendererProps) {
  const config = getShapeConfig(object);
  const [rafMs, setRafMs] = useState(0);
  const [replayNonce, setReplayNonce] = useState(0);
  const [previewActive, setPreviewActive] = useState(false);
  const startRef = useRef<number | null>(null);

  const reveal = resolveRevealConfig(config);
  const revealExit = resolveRevealExit(config, reveal);
  const revealTotal = shapeRevealTotalMs(config);
  // String key — getShapeConfig() returns new refs every render; never put those
  // object/array identities in effect deps or we re-enter setState forever.
  const behaviorKey = [
    (config.behaviors ?? [])
      .map(
        (b) =>
          `${b.type}:${b.enabled ? 1 : 0}:${b.durationMs}:${b.delayMs}:${b.speed}:${b.loop ? 1 : 0}:${b.exitStyle ?? ""}:${b.exitDirection ?? ""}:${b.travelDirection ?? ""}:${b.travelCount ?? ""}:${b.travelSize ?? ""}:${b.travelSpread ?? ""}`,
      )
      .join("|"),
    `reveal:${reveal.enabled ? 1 : 0}:${reveal.entranceDurationMs}:${reveal.holdMs}:${reveal.exitDurationMs}:${revealExit.style}:${revealExit.direction}`,
  ].join("::");
  const hasAnyBehavior = (config.behaviors ?? []).some((b) => b.enabled);
  const hasLoopingBehavior = (config.behaviors ?? []).some(
    (b) => b.enabled && b.loop,
  );
  const hasTravelBehavior = (config.behaviors ?? []).some(
    (b) =>
      b.enabled &&
      (b.type === "travel_across" || b.type === "shape_cascade"),
  );
  const needsPreviewClock =
    config.enabled &&
    (reveal.enabled || hasAnyBehavior) &&
    !useExternalClock;

  useEffect(() => {
    const onReplay = (event: Event) => {
      const detail = (event as CustomEvent<{ objectId?: string }>).detail;
      if (detail?.objectId !== object.id) return;
      startRef.current = null;
      setRafMs(0);
      setPreviewActive(true);
      setReplayNonce((n) => n + 1);
    };
    window.addEventListener(SHAPE_BEHAVIOR_REPLAY_EVENT, onReplay);
    return () =>
      window.removeEventListener(SHAPE_BEHAVIOR_REPLAY_EVENT, onReplay);
  }, [object.id]);

  useEffect(() => {
    if (!needsPreviewClock || isPlaying) {
      startRef.current = null;
      setPreviewActive((active) => (active ? false : active));
      return;
    }

    // Idle / edit resting: derive clock during render — do not setState here.
    // Only run local RAF while Preview is active, or for looping behaviors
    // when Reveal is off.
    const keepLooping =
      !reveal.enabled && (hasLoopingBehavior || hasTravelBehavior);
    if (!previewActive && !keepLooping) {
      startRef.current = null;
      return;
    }

    startRef.current = null;
    let raf = 0;
    let stopped = false;
    const tick = (now: number) => {
      if (stopped) return;
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      if (keepLooping) {
        const windowMs = Math.max(revealTotal, 12_000);
        setRafMs(elapsed % windowMs);
        raf = requestAnimationFrame(tick);
        return;
      }
      setRafMs(elapsed);
      if (reveal.enabled && elapsed >= revealTotal) {
        setRafMs(revealTotal);
        setPreviewActive(false);
        return;
      }
      if (
        !hasLoopingBehavior &&
        !hasTravelBehavior &&
        !reveal.enabled &&
        hasAnyBehavior
      ) {
        const maxOneShot = (config.behaviors ?? [])
          .filter((b) => b.enabled)
          .reduce(
            (m, b) =>
              Math.max(m, b.delayMs + b.durationMs / Math.max(0.05, b.speed)),
            0,
          );
        if (elapsed >= maxOneShot) {
          setRafMs(maxOneShot);
          setPreviewActive(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [
    behaviorKey,
    config.enabled,
    hasAnyBehavior,
    hasLoopingBehavior,
    hasTravelBehavior,
    isPlaying,
    needsPreviewClock,
    object.id,
    previewActive,
    reveal.enabled,
    revealTotal,
    replayNonce,
  ]);

  if (!config.enabled || config.hidden) return null;

  const layerWidth = Math.max(1, object.transform.width);
  const layerHeight = Math.max(1, object.transform.height);
  const placement = resolvePlacement(config);
  const anchorPoint = resolveAnchorPoint(config);
  const width = Math.max(1, layerWidth * placement.width);
  const height = Math.max(1, layerHeight * placement.height);
  // Rest at end of reveal when idle so content stays visible while editing.
  const restMs =
    reveal.enabled && !previewActive && !isPlaying && !useExternalClock
      ? Math.max(revealTotal, 1)
      : rafMs;
  const timeMs = useExternalClock || isPlaying ? clockMs : restMs;
  const revealSample = sampleShapeReveal(config, timeMs, {
    overlay,
    width,
    height,
  });
  const motion = sampleShapeBehaviors(config, timeMs, { width, height });
  const persistFrame =
    !reveal.enabled &&
    (config.kind === "video_frame" ||
      config.fillMode === "none" ||
      config.fill === "transparent");
  // Travel convoys stay visible even when reveal resting phase hid the host.
  // Stroke-only frames also persist when Reveal is off.
  if (
    reveal.enabled &&
    !revealSample.shapeVisible &&
    !persistFrame &&
    !(motion.travelInstances && motion.travelInstances.length > 0)
  ) {
    return null;
  }

  const radii = resolveRadii(config, width, height);
  const inset = Math.max(0, config.borderPadding);
  const gradId = `shape-grad-${object.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const glowId = `shape-glow-${object.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const sweepId = `shape-sweep-${object.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // During reveal cover (entrance/hold/exit), never draw stroke-only — force a solid fill.
  const revealCover =
    overlay &&
    reveal.enabled &&
    revealSample.phase !== "revealed";
  const fillMode = revealCover ? "solid" : config.fillMode;
  const coverFillFallback = "#1D4ED8";
  const rawFill =
    revealCover
      ? config.fillMode === "gradient"
        ? `url(#${gradId})`
        : config.fill &&
            config.fill !== "transparent" &&
            config.fillMode !== "none"
          ? config.fill
          : coverFillFallback
      : fillMode === "none" || config.fill === "transparent"
        ? "none"
        : fillMode === "gradient"
          ? `url(#${gradId})`
          : config.fill;
  const fillElementOpacity =
    revealSample.phase === "exit" || revealSample.phase === "revealed"
      ? 1
      : Math.max(0.85, motion.fillOpacity ?? 1);
  const isLine =
    config.kind === "line" ||
    config.kind === "divider_line" ||
    (!revealCover &&
      rawFill === "none" &&
      ![
        "arrow",
        "star",
        "polygon",
        "triangle",
        "ribbon",
        "speech_bubble",
        "corner_accent",
        "video_frame",
        "border_frame",
        "rounded_rectangle",
        "rectangle",
        "ellipse",
        "circle",
        "image_mask",
        "video_mask",
      ].includes(config.kind));

  const dash =
    motion.strokeDasharray ??
    (config.strokeStyle === "dashed"
      ? "10 8"
      : config.strokeStyle === "dotted"
        ? "2 6"
        : undefined);

  const boxShadow =
    config.shadow.enabled && !overlay
      ? `${config.shadow.offsetX}px ${config.shadow.offsetY}px ${config.shadow.blur}px ${config.shadow.spread}px ${hexAlpha(config.shadow.color, config.shadow.opacity)}`
      : undefined;

  const useNativeRect = [
    "rectangle",
    "rounded_rectangle",
    "glass_panel",
    "gradient_panel",
    "border_frame",
    "ticker_bar",
    "headline_bar",
    "reporter_card",
    "video_frame",
    "image_mask",
    "video_mask",
  ].includes(config.kind);

  const d = useNativeRect ? "" : buildShapePathD(config, width, height);
  const stroke =
    config.strokeStyle === "none" ? "none" : config.strokeColor || "#FFFFFF";
  const strokeWidth = Math.max(0, config.strokeWidth);
  const sweepPos =
    motion.lightSweepProgress != null
      ? -40 + motion.lightSweepProgress * 180
      : -40;

  const scaleX =
    (revealSample.phase === "exit" ||
    revealSample.phase === "revealed" ||
    motion.hideHostShape
      ? 1
      : motion.scaleX) * revealSample.shapeScaleX;
  const scaleY =
    (revealSample.phase === "exit" ||
    revealSample.phase === "revealed" ||
    motion.hideHostShape
      ? 1
      : motion.scaleY) * revealSample.shapeScaleY;
  const opacity =
    config.opacity *
    (revealSample.phase === "exit" ||
    revealSample.phase === "revealed" ||
    motion.hideHostShape
      ? 1
      : motion.opacity) *
    revealSample.shapeOpacity;
  // Exit clip must win; don't let finished entrance clips mask wipe/slide.
  const clipPath =
    revealSample.shapeClipPath ??
    (revealSample.phase === "exit" || revealSample.phase === "revealed"
      ? undefined
      : motion.clipPath);
  const transformOrigin =
    revealSample.phase === "exit" || revealSample.phase === "entrance"
      ? revealSample.transformOrigin
      : cssTransformOriginFromAnchor(anchorPoint);

  return (
    <div
      className={className}
      data-shape-composer="true"
      data-shape-kind={config.kind}
      data-shape-overlay={overlay ? "true" : "false"}
      data-shape-reveal={revealSample.phase}
      data-shape-exit={
        reveal.enabled
          ? `${revealExit.style}:${revealExit.direction}`
          : undefined
      }
      data-shape-behaviors={motion.activeTypes.join(",") || undefined}
      style={{
        position: overlay ? "absolute" : "relative",
        inset: overlay ? 0 : undefined,
        width: "100%",
        height: "100%",
        pointerEvents: overlay ? "none" : undefined,
        overflow: "visible",
      }}
    >
      <div
        data-shape-placement="true"
        style={{
          position: "absolute",
          left: `${placement.x * 100}%`,
          top: `${placement.y * 100}%`,
          width: `${placement.width * 100}%`,
          height: `${placement.height * 100}%`,
          // Clip on its own layer — clip-path + transform on one node
          // collapses wipe/slide into a plain fade in some browsers.
          clipPath,
          WebkitClipPath: clipPath,
          overflow: clipPath ? "hidden" : "visible",
        }}
      >
      <div
        data-shape-motion="true"
        style={{
          width: "100%",
          height: "100%",
          opacity,
          boxShadow,
          transformOrigin,
          transform: `translate3d(${
            (revealSample.phase === "exit" || revealSample.phase === "revealed"
              ? 0
              : motion.translateX) + revealSample.shapeTranslateX
          }px, ${
            (revealSample.phase === "exit" || revealSample.phase === "revealed"
              ? 0
              : motion.translateY) + revealSample.shapeTranslateY
          }px, 0) scale(${scaleX}, ${scaleY})`,
          backdropFilter: config.glass.enabled
            ? `blur(${config.glass.blur}px)`
            : undefined,
          WebkitBackdropFilter: config.glass.enabled
            ? `blur(${config.glass.blur}px)`
            : undefined,
          background:
            !overlay && config.glass.enabled && fillMode !== "gradient"
              ? config.glass.tint
              : !overlay && fillMode === "gradient" && useNativeRect
                ? gradientCss(config)
                : undefined,
          willChange: "transform, opacity",
        }}
      >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="pointer-events-none block size-full"
        style={{ overflow: "visible" }}
      >
        <defs>
          {fillMode === "gradient" ? (
            <linearGradient
              id={gradId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
              gradientTransform={`rotate(${config.gradient.angle} 0.5 0.5)`}
            >
              {config.gradient.stops.map((stop, i) => (
                <stop
                  key={`${stop.offset}-${i}`}
                  offset={`${stop.offset * 100}%`}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          ) : null}
          {config.glow.enabled ? (
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur
                stdDeviation={1 + config.glow.radius * config.glow.intensity}
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ) : null}
          {motion.lightSweepProgress != null ? (
            <linearGradient
              id={sweepId}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0}
              x2={width}
              y2={height}
            >
              <stop offset="0%" stopColor="transparent" />
              <stop
                offset={`${Math.max(0, sweepPos - 8)}%`}
                stopColor="transparent"
              />
              <stop
                offset={`${sweepPos}%`}
                stopColor="rgba(255,255,255,0.85)"
              />
              <stop
                offset={`${Math.min(100, sweepPos + 8)}%`}
                stopColor="transparent"
              />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          ) : null}
        </defs>

        {motion.hideHostShape ? null : useNativeRect ? (
          <rect
            x={inset + strokeWidth / 2}
            y={inset + strokeWidth / 2}
            width={Math.max(1, width - inset * 2 - strokeWidth)}
            height={Math.max(1, height - inset * 2 - strokeWidth)}
            rx={radii.topLeft}
            ry={radii.topLeft}
            fill={isLine ? "none" : rawFill}
            fillOpacity={isLine ? undefined : fillElementOpacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dash}
            strokeDashoffset={motion.strokeDashoffset ?? 0}
            pathLength={motion.strokeDasharray ? 1000 : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={config.glow.enabled ? `url(#${glowId})` : undefined}
          />
        ) : (
          <path
            d={d}
            fill={isLine && config.kind !== "arrow" ? "none" : rawFill}
            fillOpacity={
              isLine && config.kind !== "arrow" ? undefined : fillElementOpacity
            }
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dash}
            strokeDashoffset={motion.strokeDashoffset ?? 0}
            pathLength={motion.strokeDasharray ? 1000 : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={config.glow.enabled ? `url(#${glowId})` : undefined}
          />
        )}

        {(motion.travelInstances ?? []).map((inst) => {
          const cx = inst.x + inst.width / 2;
          const cy = inst.y + inst.height / 2;
          const cloneRadii = resolveRadii(config, inst.width, inst.height);
          const cloneD = useNativeRect
            ? ""
            : buildShapePathD(config, inst.width, inst.height);
          return (
            <g
              key={inst.id}
              opacity={inst.opacity}
              transform={`translate(${cx} ${cy}) rotate(${inst.rotation}) scale(${inst.scale}) translate(${-inst.width / 2} ${-inst.height / 2})`}
            >
              {useNativeRect ? (
                <rect
                  x={strokeWidth / 2}
                  y={strokeWidth / 2}
                  width={Math.max(1, inst.width - strokeWidth)}
                  height={Math.max(1, inst.height - strokeWidth)}
                  rx={cloneRadii.topLeft}
                  ry={cloneRadii.topLeft}
                  fill={isLine ? "none" : rawFill}
                  stroke={stroke}
                  strokeWidth={Math.max(1, strokeWidth * 0.85)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={config.glow.enabled ? `url(#${glowId})` : undefined}
                />
              ) : (
                <path
                  d={cloneD}
                  fill={isLine && config.kind !== "arrow" ? "none" : rawFill}
                  stroke={stroke}
                  strokeWidth={Math.max(1, strokeWidth * 0.85)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={config.glow.enabled ? `url(#${glowId})` : undefined}
                />
              )}
            </g>
          );
        })}

        {motion.lightSweepProgress != null && !motion.hideHostShape ? (
          useNativeRect ? (
            <rect
              x={inset}
              y={inset}
              width={Math.max(1, width - inset * 2)}
              height={Math.max(1, height - inset * 2)}
              rx={radii.topLeft}
              ry={radii.topLeft}
              fill={`url(#${sweepId})`}
              opacity={motion.lightSweepOpacity ?? 0.5}
              style={{ mixBlendMode: "screen" }}
            />
          ) : (
            <path
              d={d}
              fill={`url(#${sweepId})`}
              opacity={motion.lightSweepOpacity ?? 0.5}
              style={{ mixBlendMode: "screen" }}
            />
          )
        ) : null}
      </svg>

      {showPathPoints &&
      (config.kind === "custom_path" || config.kind === "svg_path") ? (
        <div className="absolute inset-0">
          {config.path.points.map((pt) => (
            <button
              key={pt.id}
              type="button"
              aria-label="Path point"
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow"
              style={{
                left: `${pt.x * 100}%`,
                top: `${pt.y * 100}%`,
                background:
                  selectedPointId === pt.id ? "#5B8DEF" : "#F8FAFC",
                pointerEvents: "auto",
              }}
              onPointerDown={(event) => {
                if (!onPointDrag) return;
                event.stopPropagation();
                const parent = (event.target as HTMLElement).parentElement;
                if (!parent) return;
                const rect = parent.getBoundingClientRect();
                const move = (ev: PointerEvent) => {
                  const x = (ev.clientX - rect.left) / rect.width;
                  const y = (ev.clientY - rect.top) / rect.height;
                  onPointDrag(pt.id, x, y);
                };
                const up = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }}
            />
          ))}
        </div>
      ) : null}
      </div>
      </div>
    </div>
  );
}

export function shouldRenderAsShape(object: SceneObject): boolean {
  return shouldReplaceContentWithShape(object);
}

export function shouldShowShapeOverlay(object: SceneObject): boolean {
  return shouldOverlayShape(object);
}

function hexAlpha(color: string, opacity: number) {
  if (color.startsWith("rgba") || color.startsWith("rgb")) return color;
  const alpha = Math.min(1, Math.max(0, opacity));
  if (color.startsWith("#") && color.length === 7) {
    const r = Number.parseInt(color.slice(1, 3), 16);
    const g = Number.parseInt(color.slice(3, 5), 16);
    const b = Number.parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}
