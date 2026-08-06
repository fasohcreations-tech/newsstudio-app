"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import type {
  BroadcastEffectOverlay,
  EffectCoverageRect,
} from "@/features/scene-composer/lib/broadcast-effects";
import {
  lightSweepCssPosition,
  normalizeLightSweepParams,
  resolveLightSweepAngle,
} from "@/features/scene-composer/lib/broadcast-effects";
import {
  resolveObjectShapeOutline,
  shouldReplaceContentWithShape,
  type ShapeOutlineResolved,
} from "@/features/scene-composer/lib/shape-composer";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

type EffectOverlaysProps = {
  overlays: BroadcastEffectOverlay[];
  /** Absolute time ms for continuous GPU sweeps when playing. */
  clockMs?: number;
  isPlaying?: boolean;
  /**
   * Optional expanded draw rect for light sweep (relative to host).
   * Used so headline sweep can cover the full lower information panel.
   */
  lightSweepCoverage?: EffectCoverageRect;
  /** Host layer — used to clip light sweep to polygon/star outlines. */
  object?: SceneObject | null;
};

/**
 * GPU overlay layers — light sweep, glass, noise, particles.
 * Uses transform / opacity / filter only (no layout thrash).
 */
export function BroadcastEffectOverlays({
  overlays,
  clockMs = 0,
  isPlaying = false,
  lightSweepCoverage,
  object = null,
}: EffectOverlaysProps) {
  if (overlays.length === 0) return null;

  return (
    <>
      {overlays.map((overlay) => {
        switch (overlay.kind) {
          case "light_sweep":
            return (
              <LightSweepOverlay
                key={overlay.effectId}
                effectId={overlay.effectId}
                params={overlay.params}
                clockMs={clockMs}
                isPlaying={isPlaying}
                coverage={lightSweepCoverage}
                object={object}
              />
            );
          case "glass":
            return (
              <div
                key={overlay.effectId}
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${overlay.params.tint} 0%, transparent 55%, rgba(255,255,255,${overlay.params.reflection * 0.35}) 100%)`,
                  backdropFilter: `blur(${overlay.params.blur}px)`,
                  WebkitBackdropFilter: `blur(${overlay.params.blur}px)`,
                  opacity: overlay.params.opacity,
                  mixBlendMode: "soft-light",
                  transform: "translateZ(0)",
                  willChange: "opacity, transform",
                }}
              >
                {overlay.params.noise > 0 ? (
                  <div
                    className="absolute inset-0"
                    style={{
                      opacity: overlay.params.noise,
                      backgroundImage:
                        "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0 1px, transparent 1px 4px)",
                      mixBlendMode: "overlay",
                    }}
                  />
                ) : null}
              </div>
            );
          case "inner_glow":
            return (
              <div
                key={overlay.effectId}
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  boxShadow: `inset 0 0 ${overlay.params.radius * overlay.params.intensity}px ${overlay.params.color}`,
                  opacity: overlay.params.opacity,
                  mixBlendMode: overlay.params.blendMode,
                  transform: "translateZ(0)",
                }}
              />
            );
          case "inner_shadow": {
            const rad = (overlay.params.angle * Math.PI) / 180;
            const x = Math.cos(rad) * overlay.params.distance;
            const y = Math.sin(rad) * overlay.params.distance;
            return (
              <div
                key={overlay.effectId}
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  boxShadow: `inset ${x}px ${y}px ${overlay.params.blur}px ${overlay.params.color}`,
                  opacity: overlay.params.opacity,
                  transform: "translateZ(0)",
                }}
              />
            );
          }
          case "noise":
            return (
              <div
                key={overlay.effectId}
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  opacity: overlay.opacity,
                  backgroundImage:
                    "repeating-radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18) 0 0.5px, transparent 1px 4px)",
                  backgroundSize: `${12 * overlay.scale}px ${12 * overlay.scale}px`,
                  mixBlendMode: "overlay",
                  transform: "translateZ(0)",
                }}
              />
            );
          case "particle_dust":
            return (
              <ParticleDustOverlay
                key={overlay.effectId}
                opacity={overlay.opacity}
                density={overlay.density}
                speed={overlay.speed}
                color={overlay.color}
                clockMs={clockMs}
                isPlaying={isPlaying}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}

function lightSweepProgress(
  params: Extract<BroadcastEffectOverlay, { kind: "light_sweep" }>["params"],
  timeMs: number,
) {
  const p = normalizeLightSweepParams(params);
  const cycleMs = Math.max(400, 1000 / Math.max(0.05, p.speed));
  const total = cycleMs + Math.max(0, p.repeatDelayMs);
  const local = p.loop ? timeMs % total : Math.min(timeMs % total, cycleMs);
  const inCycle = local <= cycleMs;
  const raw = inCycle ? local / cycleMs : 1;
  const progress =
    p.direction === "reverse" ? (inCycle ? 1 - raw : 0) : raw;
  return { progress, opacity: inCycle ? p.opacity : 0, params: p };
}

/** Apply moving full-bleed gradient position for light sweep. */
function applyLightSweepFrame(
  el: HTMLDivElement,
  params: Extract<BroadcastEffectOverlay, { kind: "light_sweep" }>["params"],
  timeMs: number,
) {
  const { progress, opacity, params: p } = lightSweepProgress(params, timeMs);
  const pos = lightSweepCssPosition(progress, p.start, p.end);
  el.style.backgroundPosition = `${pos}% ${pos}%`;
  el.style.opacity = String(opacity);
}

function LightSweepOverlay({
  effectId,
  params,
  clockMs,
  isPlaying,
  coverage,
  object = null,
}: {
  effectId: string;
  params: Extract<BroadcastEffectOverlay, { kind: "light_sweep" }>["params"];
  clockMs: number;
  isPlaying: boolean;
  coverage?: EffectCoverageRect;
  object?: SceneObject | null;
}) {
  const outline = useMemo(
    () => (object ? resolveObjectShapeOutline(object) : null),
    [object],
  );
  // Layers-panel shapes paint via ShapeRenderer (SVG). CSS mask/clip-path on a
  // sibling HTML band often blanks the effect — use an SVG sweep clipped to the
  // real outline instead (Effects Light Sweep, not Shape behavior attribute).
  const useSvgShapeSweep =
    Boolean(outline) &&
    !coverage &&
    Boolean(object && shouldReplaceContentWithShape(object));

  if (useSvgShapeSweep && outline) {
    return (
      <SvgShapeLightSweep
        effectId={effectId}
        params={params}
        clockMs={clockMs}
        isPlaying={isPlaying}
        outline={outline}
      />
    );
  }

  return (
    <CssLightSweepOverlay
      params={params}
      clockMs={clockMs}
      isPlaying={isPlaying}
      coverage={coverage}
    />
  );
}

/**
 * Light Sweep for pure shape layers — SVG fill clipped to geometry so the
 * band stays visible on triangle / star / ellipse / rect ShapeRenderer hosts.
 */
function SvgShapeLightSweep({
  effectId,
  params,
  clockMs,
  isPlaying,
  outline,
}: {
  effectId: string;
  params: Extract<BroadcastEffectOverlay, { kind: "light_sweep" }>["params"];
  clockMs: number;
  isPlaying: boolean;
  outline: ShapeOutlineResolved;
}) {
  const bandRef = useRef<SVGRectElement>(null);
  const stopEdgeLo = useRef<SVGStopElement>(null);
  const stopPeakLo = useRef<SVGStopElement>(null);
  const stopPeakHi = useRef<SVGStopElement>(null);
  const stopEdgeHi = useRef<SVGStopElement>(null);
  const safeId = effectId.replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `ls-clip-${safeId}`;
  const gradId = `ls-grad-${safeId}`;

  const soft = Math.min(0.9, Math.max(0.05, params.softness));
  const half = Math.min(42, Math.max(4, params.width) / 2);
  const softEdge = half * (0.55 + soft * 0.9);
  const sweep = normalizeLightSweepParams(params);
  const angle = resolveLightSweepAngle(sweep);
  const rad = (angle * Math.PI) / 180;
  const cx = outline.layerWidth / 2;
  const cy = outline.layerHeight / 2;
  const len = Math.hypot(outline.layerWidth, outline.layerHeight) * 1.25;
  const dx = Math.cos(rad) * len;
  const dy = Math.sin(rad) * len;

  const applyFrame = (timeMs: number) => {
    const band = bandRef.current;
    if (!band) return;
    const { progress, opacity, params: p } = lightSweepProgress(params, timeMs);
    // Same travel % as the CSS overlay (start→end along the oversized axis).
    const pos = lightSweepCssPosition(progress, p.start, p.end);
    const edgeLo = Math.max(-20, pos - softEdge);
    const peakLo = Math.max(-20, pos - half * 0.35);
    const peakHi = Math.min(120, pos + half * 0.35);
    const edgeHi = Math.min(120, pos + softEdge);
    stopEdgeLo.current?.setAttribute("offset", `${edgeLo}%`);
    stopPeakLo.current?.setAttribute("offset", `${peakLo}%`);
    stopPeakHi.current?.setAttribute("offset", `${peakHi}%`);
    stopEdgeHi.current?.setAttribute("offset", `${edgeHi}%`);
    band.setAttribute("opacity", String(opacity));
  };

  useEffect(() => {
    const t = isPlaying ? clockMs : performance.now();
    applyFrame(t);
  }, [clockMs, isPlaying, params, softEdge, half]);

  useEffect(() => {
    if (isPlaying || !params.loop || !params.enabled) return;
    let raf = 0;
    const tick = () => {
      applyFrame(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, params, softEdge, half]);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
      viewBox={`0 0 ${outline.layerWidth} ${outline.layerHeight}`}
      preserveAspectRatio="none"
      style={{
        mixBlendMode: params.blendMode,
        overflow: "hidden",
        transform: "translateZ(0)",
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <path
            d={outline.localD}
            transform={`translate(${outline.offsetX} ${outline.offsetY})`}
          />
        </clipPath>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={cx - dx / 2}
          y1={cy - dy / 2}
          x2={cx + dx / 2}
          y2={cy + dy / 2}
        >
          <stop offset="-20%" stopColor={params.color} stopOpacity={0} />
          <stop
            ref={stopEdgeLo}
            offset="0%"
            stopColor={params.color}
            stopOpacity={0}
          />
          <stop
            ref={stopPeakLo}
            offset="50%"
            stopColor={params.color}
            stopOpacity={1}
          />
          <stop
            ref={stopPeakHi}
            offset="50%"
            stopColor={params.color}
            stopOpacity={1}
          />
          <stop
            ref={stopEdgeHi}
            offset="100%"
            stopColor={params.color}
            stopOpacity={0}
          />
          <stop offset="120%" stopColor={params.color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect
        ref={bandRef}
        x={0}
        y={0}
        width={outline.layerWidth}
        height={outline.layerHeight}
        fill={`url(#${gradId})`}
        clipPath={`url(#${clipId})`}
        opacity={params.opacity}
        style={
          soft > 0.08 ? { filter: `blur(${soft * 10}px)` } : undefined
        }
      />
    </svg>
  );
}

/** HTML/CSS light sweep for text, media, and coverage-expanded hosts. */
function CssLightSweepOverlay({
  params,
  clockMs,
  isPlaying,
  coverage,
}: {
  params: Extract<BroadcastEffectOverlay, { kind: "light_sweep" }>["params"];
  clockMs: number;
  isPlaying: boolean;
  coverage?: EffectCoverageRect;
}) {
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bandRef.current;
    if (!el) return;
    const t = isPlaying ? clockMs : performance.now();
    applyLightSweepFrame(el, params, t);
  }, [clockMs, isPlaying, params]);

  // Continuous RAF when not driven by playback clock (edit/rest still animate if loop).
  useEffect(() => {
    if (isPlaying || !params.loop || !params.enabled) return;
    let raf = 0;
    const tick = () => {
      const el = bandRef.current;
      if (el) applyLightSweepFrame(el, params, performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, params]);

  const soft = Math.min(0.9, Math.max(0.05, params.softness));
  // params.width = highlight peak thickness (% of gradient); layer itself is always full-bleed.
  const half = Math.min(42, Math.max(4, params.width) / 2);
  const softEdge = half * (0.55 + soft * 0.9);
  const sweep = normalizeLightSweepParams(params);
  const angle = resolveLightSweepAngle(sweep);
  const startPos = lightSweepCssPosition(0, sweep.start, sweep.end);
  const boxStyle: CSSProperties = coverage
    ? {
        position: "absolute",
        left: coverage.left,
        top: coverage.top,
        width: coverage.width,
        height: coverage.height,
        overflow: "hidden",
        mixBlendMode: params.blendMode,
        transform: "translateZ(0)",
      }
    : {
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        mixBlendMode: params.blendMode,
        transform: "translateZ(0)",
      };

  return (
    <div aria-hidden className="pointer-events-none" style={boxStyle}>
      <div
        ref={bandRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          // Full item coverage — angle + oversized gradient travel along start→end.
          backgroundImage: `linear-gradient(${angle}deg,
            transparent 0%,
            transparent ${Math.max(0, 50 - softEdge)}%,
            ${params.color} ${Math.max(0, 50 - half * 0.35)}%,
            ${params.color} ${Math.min(100, 50 + half * 0.35)}%,
            transparent ${Math.min(100, 50 + softEdge)}%,
            transparent 100%)`,
          backgroundSize: "220% 220%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: `${startPos}% ${startPos}%`,
          filter: soft > 0.08 ? `blur(${soft * 10}px)` : undefined,
          opacity: params.opacity,
          willChange: "background-position, opacity",
          backfaceVisibility: "hidden",
        }}
      />
    </div>
  );
}

function ParticleDustOverlay({
  opacity,
  density,
  speed,
  color,
  clockMs,
  isPlaying,
}: {
  opacity: number;
  density: number;
  speed: number;
  color: string;
  clockMs: number;
  isPlaying: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Playback / render samples the timeline clock, matching the light sweep.
    if (isPlaying) {
      const t = (clockMs / 1000) * speed;
      el.style.transform = `translate3d(0, ${Math.sin(t) * 6}px, 0)`;
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) / 1000) * speed * 0.6;
      el.style.transform = `translate3d(0, ${Math.sin(t) * 6}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, speed, clockMs]);

  const dots = Math.max(4, Math.round(density * 16));

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        backgroundImage: Array.from({ length: dots })
          .map((_, i) => {
            const x = ((i * 37) % 100);
            const y = ((i * 53) % 100);
            return `radial-gradient(circle at ${x}% ${y}%, ${color} 0 1px, transparent 2px)`;
          })
          .join(","),
        willChange: "transform",
        transform: "translateZ(0)",
      }}
    />
  );
}
