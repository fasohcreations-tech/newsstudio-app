"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import type {
  BroadcastEffectOverlay,
  EffectCoverageRect,
} from "@/features/scene-composer/lib/broadcast-effects";

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
                params={overlay.params}
                clockMs={clockMs}
                isPlaying={isPlaying}
                coverage={lightSweepCoverage}
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
  const cycleMs = Math.max(400, 1000 / Math.max(0.05, params.speed));
  const total = cycleMs + Math.max(0, params.repeatDelayMs);
  const local = params.loop ? timeMs % total : Math.min(timeMs % total, cycleMs);
  const inCycle = local <= cycleMs;
  const raw = inCycle ? local / cycleMs : 1;
  const progress =
    params.direction === "reverse" ? (inCycle ? 1 - raw : 0) : raw;
  return { progress, opacity: inCycle ? params.opacity : 0 };
}

/** Apply moving full-bleed gradient position for light sweep. */
function applyLightSweepFrame(
  el: HTMLDivElement,
  params: Extract<BroadcastEffectOverlay, { kind: "light_sweep" }>["params"],
  timeMs: number,
) {
  const { progress, opacity } = lightSweepProgress(params, timeMs);
  // Gradient is oversized; shift so the highlight travels edge→edge across the item.
  const pos = -40 + progress * 180;
  el.style.backgroundPosition = `${pos}% ${pos}%`;
  el.style.opacity = String(opacity);
}

function LightSweepOverlay({
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
          // Full item coverage — angle + oversized gradient travel edge to edge.
          backgroundImage: `linear-gradient(${params.angle}deg,
            transparent 0%,
            transparent ${Math.max(0, 50 - softEdge)}%,
            ${params.color} ${Math.max(0, 50 - half * 0.35)}%,
            ${params.color} ${Math.min(100, 50 + half * 0.35)}%,
            transparent ${Math.min(100, 50 + softEdge)}%,
            transparent 100%)`,
          backgroundSize: "220% 220%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "-40% -40%",
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
  isPlaying,
}: {
  opacity: number;
  density: number;
  speed: number;
  color: string;
  isPlaying: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) / 1000) * speed * (isPlaying ? 1 : 0.6);
      el.style.transform = `translate3d(0, ${Math.sin(t) * 6}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, speed]);

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
