"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { buildDefaultBindings } from "@/features/motion-scene-engine/lib/variable-binding";
import {
  ReadablePlaceholder,
  placeholderKindForObject,
} from "@/features/scene-composer/components/editor/readable-placeholder";
import { Gnn001BroadcastBackground } from "@/features/scene-composer/components/gnn-001-broadcast-background";
import { Gnn001BroadcastFrame } from "@/features/scene-composer/components/gnn-001-broadcast-frame";
import { Gnn001MainVideoContainer } from "@/features/scene-composer/components/gnn-001-main-video-container";
import { GNN_001_BACKGROUND_COMPONENT_SLUG } from "@/features/scene-composer/lib/gnn-001-background.constants";
import { GNN_001_FRAME_DEFINITIONS } from "@/features/scene-composer/lib/gnn-001-frame.constants";
import { createGnn001FrameObjects } from "@/features/scene-composer/lib/gnn-001-frame.factory";
import {
  patchGnn001LeftRailObjects,
} from "@/features/scene-composer/lib/gnn-001-left-rail.layout";
import {
  GNN_001_LOWER_PANEL_BORDER,
  GNN_001_LOWER_PANEL_FILL,
  GNN_001_LOWER_PANEL_TEXT_COLOR,
  gnn001LowerPanelFrameContent,
  patchGnn001LowerPanelObjects,
} from "@/features/scene-composer/lib/gnn-001-lower-panel.styles";
import {
  buildMetaInfoLine,
  GNN_001_META_INFO_BAR,
  isLegacyMetaPartObject,
  isMetaInfoBarObject,
} from "@/features/scene-composer/lib/gnn-001-meta-info-bar";
import { GNN_001_MAIN_VIDEO_CONTAINER_SLUG } from "@/features/scene-composer/lib/gnn-001-main-video.constants";
import { createGnn001MainVideoContainerObject } from "@/features/scene-composer/lib/gnn-001-main-video.factory";
import { BroadcastEffectOverlays } from "@/features/scene-composer/components/editor/broadcast-effect-overlays";
import { EdgeSweepOverlay } from "@/features/scene-composer/components/editor/edge-sweep-overlay";
import {
  ShapeRenderer,
  shouldRenderAsShape,
  shouldShowShapeOverlay,
} from "@/features/scene-composer/components/editor/shape-renderer";
import { sampleLayerMotion } from "@/features/scene-composer/lib/motion-animation";
import {
  findLowerInfoPanelObject,
  getObjectEffectStack,
  mergeSampledEffectsIntoStyle,
  resolveHeadlineLightSweepCoverage,
  sampleBroadcastEffects,
  type EffectCoverageRect,
} from "@/features/scene-composer/lib/broadcast-effects";
import {
  getEdgeSweepConfig,
  patchGnn001EdgeSweepDemos,
} from "@/features/scene-composer/lib/edge-sweep";
import {
  getShapeConfig,
  resolveRadii,
  resolveRevealConfig,
  sampleShapeBehaviors,
  sampleShapeReveal,
  shapePreviewDurationMs,
  shapeRevealTotalMs,
} from "@/features/scene-composer/lib/shape-composer";
import type { ShapeComposerConfig } from "@/features/scene-composer/lib/shape-composer";
import { SHAPE_BEHAVIOR_REPLAY_EVENT } from "@/features/scene-composer/components/editor/shape-renderer";
import type {
  ComposerScene,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import {
  filterVisibleObjects,
  isTextLikeObject,
  resolveObjectDisplayText,
  resolveObjectMediaUrl,
} from "@/features/story-production/services/story-preview.service";
import { resolveVariableTokens } from "@/features/motion-scene-engine/lib/variable-binding";
import { isLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import {
  resolveStoryMalayalamFont,
  storyMalayalamFontFamilyCss,
} from "@/features/story-production/constants/story-font-options";
import type { StoryPreviewAspect } from "@/features/story-production/types/story-data.types";

const ASPECT_DIMENSIONS: Record<
  StoryPreviewAspect,
  { width: number; height: number }
> = {
  "1920x1080": { width: 1920, height: 1080 },
  "1080x1920": { width: 1080, height: 1920 },
  "1080x1080": { width: 1080, height: 1080 },
  "3840x2160": { width: 3840, height: 2160 },
};

type StoryLivePreviewProps = {
  scene: ComposerScene;
  resolvedBindings?: Record<string, string>;
  playheadMs?: number;
  /** `edit` shows resting pose (default); `playback` applies entrance/idle/exit. */
  motionMode?: "playback" | "edit";
  isPlaying?: boolean;
  aspect?: StoryPreviewAspect;
  readOnly?: boolean;
  className?: string;
  selectedObjectId?: string | null;
  onSelectObject?: (objectId: string | null) => void;
  /** When true, objects are clickable for selection. */
  interactive?: boolean;
  /** Fill parent artboard without internal fit-to-window scaling. */
  fillParent?: boolean;
  /** Open media browser for a canvas object / placeholder. */
  onBrowseMedia?: (object: SceneObject) => void;
};

function isSkeletonObject(object: SceneObject) {
  return object.metadata?.skeleton === true;
}

function isBackgroundObject(object: SceneObject) {
  return (
    object.metadata?.component_slug === GNN_001_BACKGROUND_COMPONENT_SLUG ||
    object.metadata?.layer === "background" ||
    object.name === "Background"
  );
}

function isFrameObject(object: SceneObject) {
  const slug = object.metadata?.component_slug;
  return (
    object.metadata?.layer === "frames" ||
    (typeof slug === "string" &&
      GNN_001_FRAME_DEFINITIONS.some((frame) => frame.slug === slug))
  );
}

function isMainVideoContainerObject(object: SceneObject) {
  return (
    object.metadata?.component_slug === GNN_001_MAIN_VIDEO_CONTAINER_SLUG ||
    object.metadata?.layer === "main_video_container" ||
    object.name === "Main Video Container"
  );
}

function isMainVideoSkeleton(object: SceneObject) {
  return (
    isSkeletonObject(object) &&
    (object.metadata?.region_key === "main-video" ||
      object.metadata?.component_slug === "gnn-001-main-video")
  );
}

function isMainVideoFrame(object: SceneObject) {
  return (
    isFrameObject(object) &&
    (object.metadata?.frame_kind === "main_video" ||
      object.metadata?.component_slug === "gnn-001-frame-main-video")
  );
}

function hasResolvedContent(
  object: SceneObject,
  bindings: Record<string, string>,
  label: string,
) {
  if (isTextLikeObject(object)) {
    const raw =
      typeof object.content.text === "string" ? object.content.text : "";
    if (raw.includes("{{")) {
      return Boolean(label) && !label.includes("{{") && label.trim().length > 0;
    }
    return Boolean(label.trim());
  }
  return Boolean(resolveObjectMediaUrl(object, bindings));
}

type PreviewClockContextValue = {
  playheadMs: number;
  isPlaying: boolean;
};

const PreviewClockContext = createContext<PreviewClockContextValue>({
  playheadMs: 0,
  isPlaying: false,
});

type ShapeIntroGateContextValue = {
  /** Absolute playhead ms when every shape intro in the scene has finished. */
  sceneIntroUntilMs: number;
  /** Peer layers hide content while a Shape panel Preview is running. */
  previewObjectId: string | null;
  previewActive: boolean;
};

const ShapeIntroGateContext = createContext<ShapeIntroGateContextValue>({
  sceneIntroUntilMs: 0,
  previewObjectId: null,
  previewActive: false,
});

/** Mirrored for withLayerMotion (plain fn, cannot useContext). */
const shapeIntroGateRef: { current: ShapeIntroGateContextValue } = {
  current: {
    sceneIntroUntilMs: 0,
    previewObjectId: null,
    previewActive: false,
  },
};

type EdgeSweepHoverContextValue = {
  setHoveredObjectId: (id: string | null) => void;
};

const EdgeSweepHoverContext = createContext<EdgeSweepHoverContextValue>({
  setHoveredObjectId: () => {},
});

/** CSS clip so media follows Shape Composer geometry (ellipse, rounded frame, etc.). */
function shapeGeometryClipPath(
  config: ShapeComposerConfig,
  width: number,
  height: number,
): string | undefined {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  switch (config.kind) {
    case "ellipse":
      return "ellipse(50% 50% at 50% 50%)";
    case "circle": {
      const pct = (Math.min(w, h) / Math.max(w, h)) * 50;
      return w >= h
        ? `ellipse(${pct}% 50% at 50% 50%)`
        : `ellipse(50% ${pct}% at 50% 50%)`;
    }
    case "video_frame":
    case "border_frame":
    case "rounded_rectangle":
    case "rectangle":
    case "glass_panel":
    case "image_mask":
    case "video_mask": {
      const r = resolveRadii(config, w, h).topLeft;
      return r > 0.5 ? `inset(0 round ${r}px)` : undefined;
    }
    default:
      return undefined;
  }
}

function useShapePreviewClock(
  objectId: string,
  enabled: boolean,
  /** Run local RAF for reveal and/or shape behaviors. */
  needsClock: boolean,
  previewTotalMs: number,
  isPlaying: boolean,
  playheadMs: number,
  /** When true, clock loops so repeating behaviors keep animating. */
  loopClock: boolean,
  /**
   * When true (reveal mode), edit resting state is the END of the timeline
   * so original layer content stays visible until Preview is pressed.
   */
  restAtEnd: boolean,
) {
  const total = Math.max(300, previewTotalMs);
  const [rafMs, setRafMs] = useState(0);
  const [replayNonce, setReplayNonce] = useState(0);
  const [previewActive, setPreviewActive] = useState(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const onReplay = (event: Event) => {
      const detail = (event as CustomEvent<{ objectId?: string }>).detail;
      if (detail?.objectId !== objectId) return;
      startRef.current = null;
      setRafMs(0);
      setPreviewActive(true);
      setReplayNonce((n) => n + 1);
    };
    window.addEventListener(SHAPE_BEHAVIOR_REPLAY_EVENT, onReplay);
    return () =>
      window.removeEventListener(SHAPE_BEHAVIOR_REPLAY_EVENT, onReplay);
  }, [objectId]);

  // RAF only while Preview is active, or for looping (no-reveal) behaviors.
  // Resting pose is derived during render — never setState on idle commits
  // (that used to re-enter across every shape layer → max update depth).
  useEffect(() => {
    if (!enabled || !needsClock || isPlaying) {
      startRef.current = null;
      setPreviewActive((active) => (active ? false : active));
      return;
    }

    const shouldLoop = loopClock && !restAtEnd;
    if (!previewActive && !shouldLoop) {
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
      if (shouldLoop) {
        setRafMs(elapsed % total);
        raf = requestAnimationFrame(tick);
        return;
      }
      if (elapsed >= total) {
        setRafMs(total);
        setPreviewActive(false);
        return;
      }
      setRafMs(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [
    enabled,
    isPlaying,
    loopClock,
    needsClock,
    objectId,
    previewActive,
    restAtEnd,
    replayNonce,
    total,
  ]);

  if (!enabled) return 0;
  if (isPlaying) return playheadMs;
  if (!needsClock) return playheadMs;
  // Idle edit: sit at end of reveal / one-shot timeline until Preview.
  if (!previewActive && (restAtEnd || !loopClock)) return total;
  return rafMs;
}

function SelectableShell({
  object,
  interactive,
  selected,
  onSelect,
  children,
  style,
  className,
  lightSweepCoverage,
}: {
  object: SceneObject;
  interactive?: boolean;
  selected: boolean;
  onSelect?: (id: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  lightSweepCoverage?: EffectCoverageRect;
}) {
  const clock = useContext(PreviewClockContext);
  const shapeGate = useContext(ShapeIntroGateContext);
  const edgeHover = useContext(EdgeSweepHoverContext);
  const sampledEffects = sampleBroadcastEffects(getObjectEffectStack(object));
  const mergedStyle = mergeSampledEffectsIntoStyle(style ?? {}, sampledEffects);
  const edgeEnabled = getEdgeSweepConfig(object).enabled;
  const expandLightSweep = Boolean(lightSweepCoverage);
  const shapeOverlay = shouldShowShapeOverlay(object);
  const shapeConfig = shapeOverlay ? getShapeConfig(object) : null;
  const revealCfg = shapeConfig ? resolveRevealConfig(shapeConfig) : null;
  const hasShapeBehaviors = Boolean(
    shapeConfig?.behaviors?.some((b) => b.enabled),
  );
  const hasLoopingBehaviors = Boolean(
    shapeConfig?.behaviors?.some((b) => b.enabled && b.loop),
  );
  const hasTravelBehavior = Boolean(
    shapeConfig?.behaviors?.some(
      (b) =>
        b.enabled &&
        (b.type === "travel_across" || b.type === "shape_cascade"),
    ),
  );
  const previewTotalMs = shapeConfig ? shapePreviewDurationMs(shapeConfig) : 0;
  const revealDriving = Boolean(
    shapeConfig?.enabled && revealCfg?.enabled && !hasTravelBehavior,
  );
  const selfGateMs = layerMotionGateMs(object);
  const needsShapeClock = Boolean(
    shapeConfig?.enabled &&
      (revealDriving || hasShapeBehaviors || hasTravelBehavior || selfGateMs > 0),
  );
  const shapeClockMs = useShapePreviewClock(
    object.id,
    Boolean(shapeOverlay && shapeConfig?.enabled),
    needsShapeClock,
    previewTotalMs,
    clock.isPlaying,
    Math.max(0, clock.playheadMs - object.start_ms),
    (hasLoopingBehaviors && !revealCfg?.enabled) || hasTravelBehavior,
    revealDriving || selfGateMs > 0,
  );
  const revealSample =
    shapeOverlay && shapeConfig && revealDriving
      ? sampleShapeReveal(shapeConfig, shapeClockMs, {
          overlay: true,
          width: Math.max(1, object.transform.width),
          height: Math.max(1, object.transform.height),
        })
      : null;
  const isFrameOnly =
    shapeConfig != null &&
    !revealDriving &&
    (shapeConfig.fillMode === "none" ||
      shapeConfig.fill === "transparent" ||
      shapeConfig.kind === "video_frame");
  const isMainVideoLayer =
    object.metadata?.layer === "main_video_container" ||
    object.metadata?.component_slug === "gnn-001-main-video-container" ||
    object.metadata?.region_key === "main-video" ||
    object.metadata?.component_slug === "gnn-001-main-video" ||
    object.name === "Main Video Container";
  const isMediaLayer =
    isMainVideoLayer ||
    object.object_type === "video" ||
    object.object_type === "image";
  // Rim-only mode keeps media visible under the stroke. Reveal mode hides
  // media until the cover shape fully exits (same as other layers).
  const keepMediaVisible = isFrameOnly || (isMediaLayer && !revealDriving);
  const revealActive = Boolean(revealDriving && revealSample);
  const localPlayheadMs = Math.max(0, clock.playheadMs - object.start_ms);
  const selfIntroActive =
    selfGateMs > 0 &&
    (clock.isPlaying
      ? localPlayheadMs < selfGateMs
      : needsShapeClock && shapeClockMs < selfGateMs);
  // Other layers' shape intros must not blank the video.
  const peerIntroActive =
    !isMediaLayer &&
    ((clock.isPlaying &&
      shapeGate.sceneIntroUntilMs > 0 &&
      clock.playheadMs < shapeGate.sceneIntroUntilMs) ||
      (shapeGate.previewActive &&
        shapeGate.previewObjectId != null &&
        shapeGate.previewObjectId !== object.id));
  // Hide content only while the cover is fully on (entrance/hold).
  // During exit, content is already underneath so the handoff is seamless.
  const hideForOwnReveal =
    revealActive &&
    revealSample != null &&
    (revealSample.phase === "entrance" || revealSample.phase === "hold");
  const originalHidden = revealDriving
    ? hideForOwnReveal
    : keepMediaVisible
      ? false
      : selfIntroActive || peerIntroActive;
  const shapeCovering = originalHidden && Boolean(shapeConfig);
  const contentOpacity = originalHidden
    ? 0
    : revealActive
      ? (revealSample?.contentOpacity ?? 1)
      : 1;
  const shapeIntroRunning =
    originalHidden ||
    (revealActive &&
      revealSample != null &&
      revealSample.phase !== "revealed") ||
    (!revealDriving && hasShapeBehaviors && selfIntroActive);
  const hasLightSweepBehavior = Boolean(
    shapeConfig?.behaviors?.some(
      (b) => b.enabled && b.type === "light_sweep",
    ),
  );
  // Cover shapes and frame rims stay above media while they run.
  const shapeAboveContent =
    keepMediaVisible ||
    shapeIntroRunning ||
    hasLightSweepBehavior ||
    Boolean(revealDriving);
  const showShapeOverlay =
    Boolean(shapeOverlay && shapeConfig?.enabled) &&
    (isFrameOnly ||
      keepMediaVisible ||
      revealSample == null ||
      Boolean(revealSample?.shapeVisible) ||
      (!revealDriving && hasShapeBehaviors) ||
      (revealDriving &&
        revealSample != null &&
        revealSample.phase !== "revealed"));

  const shapeClock =
    needsShapeClock ? shapeClockMs : Math.max(0, clock.playheadMs - object.start_ms);
  const behaviorSample =
    shapeOverlay && shapeConfig?.enabled
      ? sampleShapeBehaviors(shapeConfig, shapeClock, {
          width: Math.max(1, object.transform.width),
          height: Math.max(1, object.transform.height),
        })
      : null;

  // Drive the video/image itself with shape motion + geometry clip.
  // Otherwise Shape Composer only paints a faint stroke and "only shows video".
  const mediaShapeStyle: React.CSSProperties =
    keepMediaVisible && shapeConfig?.enabled && behaviorSample
      ? {
          transformOrigin: behaviorSample.transformOrigin || "center center",
          transform: behaviorSample.hideHostShape
            ? undefined
            : `translate3d(${
                (revealSample &&
                (revealSample.phase === "exit" ||
                  revealSample.phase === "revealed")
                  ? 0
                  : behaviorSample.translateX) +
                (revealSample?.shapeTranslateX ?? 0)
              }px, ${
                (revealSample &&
                (revealSample.phase === "exit" ||
                  revealSample.phase === "revealed")
                  ? 0
                  : behaviorSample.translateY) +
                (revealSample?.shapeTranslateY ?? 0)
              }px, 0) scale(${
                (revealSample &&
                (revealSample.phase === "exit" ||
                  revealSample.phase === "revealed")
                  ? 1
                  : behaviorSample.scaleX) *
                (revealSample?.shapeScaleX ?? 1)
              }, ${
                (revealSample &&
                (revealSample.phase === "exit" ||
                  revealSample.phase === "revealed")
                  ? 1
                  : behaviorSample.scaleY) *
                (revealSample?.shapeScaleY ?? 1)
              })`,
          clipPath:
            behaviorSample.clipPath ??
            shapeGeometryClipPath(
              shapeConfig,
              object.transform.width,
              object.transform.height,
            ),
          WebkitClipPath:
            behaviorSample.clipPath ??
            shapeGeometryClipPath(
              shapeConfig,
              object.transform.width,
              object.transform.height,
            ),
          opacity:
            contentOpacity *
            (behaviorSample.hideHostShape ? 0 : 1) *
            (originalHidden ? 0 : behaviorSample.opacity),
          overflow: "hidden",
          willChange: "transform, opacity, clip-path",
          visibility: originalHidden ? "hidden" : "visible",
          pointerEvents: originalHidden ? "none" : undefined,
        }
      : keepMediaVisible && shapeConfig?.enabled
        ? {
            clipPath: shapeGeometryClipPath(
              shapeConfig,
              object.transform.width,
              object.transform.height,
            ),
            WebkitClipPath: shapeGeometryClipPath(
              shapeConfig,
              object.transform.width,
              object.transform.height,
            ),
            overflow: "hidden",
            opacity: contentOpacity,
            visibility: contentOpacity <= 0 ? "hidden" : "visible",
            pointerEvents: contentOpacity <= 0 ? "none" : undefined,
          }
        : {
            opacity: contentOpacity,
            visibility: contentOpacity <= 0 ? "hidden" : "visible",
            pointerEvents: contentOpacity <= 0 ? "none" : undefined,
          };

  return (
    <div
      className={className}
      data-object-id={object.id}
      data-region-key={
        typeof object.metadata?.region_key === "string"
          ? object.metadata.region_key
          : undefined
      }
      data-selected={selected ? "true" : "false"}
      data-edge-sweep={edgeEnabled ? "true" : "false"}
      data-shape-reveal={revealSample?.phase}
      style={{
        ...mergedStyle,
        ...(shapeCovering
          ? {
              background: "transparent",
              border: "none",
              boxShadow: "none",
              // Keep original chrome clipped away while the shape is up.
              overflow: "hidden",
            }
          : null),
        // Expanded light sweep draws outside the text box.
        overflow: shapeCovering
          ? "hidden"
          : revealActive && revealSample?.phase === "exit"
            ? "visible"
            : expandLightSweep
              ? "visible"
              : mergedStyle.overflow,
        cursor: interactive ? "pointer" : undefined,
        outline: selected && interactive ? "2px solid transparent" : undefined,
        willChange: mergedStyle.willChange ?? "transform, opacity, filter",
      }}
      onMouseEnter={() => edgeHover.setHoveredObjectId(object.id)}
      onMouseLeave={() => edgeHover.setHoveredObjectId(null)}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onSelect?.(object.id);
            }
          : undefined
      }
    >
      <div
        className="relative z-[1] size-full min-h-0 min-w-0"
        style={mediaShapeStyle}
        aria-hidden={contentOpacity <= 0}
      >
        {/* Keep media mounted under the cover so reveal does not remount
            the video into a blank/loading frame after shape exit. */}
        {children}
      </div>
      {showShapeOverlay ? (
        <ShapeRenderer
          object={object}
          overlay
          clockMs={needsShapeClock ? shapeClockMs : clock.playheadMs}
          isPlaying={clock.isPlaying}
          useExternalClock={needsShapeClock}
          className={
            shapeAboveContent
              ? "pointer-events-none absolute inset-0 z-[5]"
              : "pointer-events-none absolute inset-0 z-0"
          }
        />
      ) : null}
      {!originalHidden ? (
        <div
          className={
            expandLightSweep
              ? "pointer-events-none absolute inset-0 z-[6] overflow-visible"
              : "pointer-events-none absolute inset-0 z-[6] overflow-hidden"
          }
        >
          <BroadcastEffectOverlays
            overlays={sampledEffects.overlays}
            clockMs={clock.playheadMs}
            isPlaying={clock.isPlaying}
            lightSweepCoverage={lightSweepCoverage}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Edge sweeps render above content/effects so panel rims stay visible. */
function PreviewEdgeSweepLayer({
  objects,
  playheadMs,
  motionMode,
  hoveredObjectId,
}: {
  objects: SceneObject[];
  playheadMs: number;
  motionMode: "playback" | "edit";
  hoveredObjectId: string | null;
}) {
  const clock = useContext(PreviewClockContext);

  return (
    <>
      {objects.map((object) => {
        if (!getEdgeSweepConfig(object).enabled) return null;
        return (
          <div
            key={`edge-sweep-${object.id}`}
            className="pointer-events-none absolute"
            style={withLayerMotion(
              {
                left: object.transform.x,
                top: object.transform.y,
                width: object.transform.width,
                height: object.transform.height,
                zIndex: 60,
              },
              object,
              playheadMs,
              motionMode,
            )}
          >
            <EdgeSweepOverlay
              object={object}
              playheadMs={clock.playheadMs}
              isPlaying={clock.isPlaying}
              hovered={hoveredObjectId === object.id}
            />
          </div>
        );
      })}
    </>
  );
}

/** ms to wait after layer start before layer motion entrance may begin. */
function layerMotionGateMs(object: SceneObject): number {
  const shape = getShapeConfig(object);
  if (!shape.enabled) return 0;
  if (
    shape.behaviors?.some(
      (b) =>
        b.enabled &&
        (b.type === "travel_across" || b.type === "shape_cascade"),
    )
  ) {
    return 0;
  }
  const reveal = resolveRevealConfig(shape);
  // Frame-rim mode (no reveal): don't stall the scene.
  if (
    !reveal.enabled &&
    (shape.kind === "video_frame" ||
      object.metadata?.layer === "main_video_container" ||
      object.metadata?.component_slug === "gnn-001-main-video-container" ||
      object.name === "Main Video Container")
  ) {
    return 0;
  }
  if (reveal.enabled) return shapeRevealTotalMs(shape);
  return (shape.behaviors ?? [])
    .filter((b) => b.enabled && !b.loop && b.type !== "reveal_exit")
    .reduce(
      (max, b) =>
        Math.max(max, b.delayMs + b.durationMs / Math.max(0.05, b.speed)),
      0,
    );
}

/** Absolute playhead time when all shape intros in the scene have finished. */
function sceneShapeIntroUntilMs(objects: SceneObject[]): number {
  return objects.reduce((max, object) => {
    const gate = layerMotionGateMs(object);
    if (gate <= 0) return max;
    return Math.max(max, object.start_ms + gate);
  }, 0);
}

/** GPU-friendly motion overlay — translate/scale/opacity, no layout reflow. */
function withLayerMotion(
  style: React.CSSProperties,
  object: SceneObject,
  playheadMs: number,
  motionMode: "playback" | "edit" = "edit",
): React.CSSProperties {
  const selfGate = layerMotionGateMs(object);
  const peerGate = Math.max(
    0,
    shapeIntroGateRef.current.sceneIntroUntilMs - object.start_ms,
  );
  const gateAfterMs = Math.max(selfGate, peerGate);
  const localMs = Math.max(0, playheadMs - object.start_ms);
  const gated = gateAfterMs > 0 && localMs < gateAfterMs;
  const motion = sampleLayerMotion(object, playheadMs, {
    mode: motionMode,
    gateAfterMs,
  });
  const baseOpacity =
    typeof style.opacity === "number"
      ? style.opacity
      : object.transform.opacity;
  return {
    ...style,
    transform: `perspective(700px) translate3d(${motion.translateX}px, ${motion.translateY}px, 0) scale(${object.transform.scale * motion.scale}) rotateX(${motion.rotateX}deg) rotateY(${motion.rotateY}deg) rotateZ(${object.transform.rotation + motion.rotateZ}deg)`,
    transformOrigin: motion.transformOrigin ?? "center center",
    transformStyle: "preserve-3d",
    // Shell stays visible so the shape can render; content is hidden in SelectableShell.
    opacity: gated ? baseOpacity : baseOpacity * motion.opacity,
    clipPath: gated ? style.clipPath : (motion.clipPath ?? style.clipPath),
    filter: gated ? style.filter : (motion.filter ?? style.filter),
    visibility: gated || motion.visible ? style.visibility : "hidden",
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
  };
}

function PreviewObject({
  object,
  bindings,
  artboard,
  hideMainVideoChrome,
  selectedObjectId,
  onSelectObject,
  interactive,
  onBrowseMedia,
  hasMetaInfoBar,
  playheadMs,
  motionMode,
  lowerInfoPanel,
}: {
  object: SceneObject;
  bindings: Record<string, string>;
  artboard: { width: number; height: number };
  hideMainVideoChrome: boolean;
  selectedObjectId?: string | null;
  onSelectObject?: (objectId: string | null) => void;
  interactive?: boolean;
  onBrowseMedia?: (object: SceneObject) => void;
  hasMetaInfoBar: boolean;
  playheadMs: number;
  motionMode: "playback" | "edit";
  lowerInfoPanel?: SceneObject | null;
}) {
  const selected = selectedObjectId === object.id;
  const select = onSelectObject
    ? (id: string) => onSelectObject(id)
    : undefined;
  const regionKey =
    typeof object.metadata?.region_key === "string"
      ? object.metadata.region_key
      : undefined;
  const isHeadlineRegion =
    regionKey === "headline" || /headline/i.test(object.name);
  const isSubheadlineRegion =
    regionKey === "subheadline" || /subheadline/i.test(object.name);
  const isLowerPanelText = isHeadlineRegion || isSubheadlineRegion;
  const isLowerInfoPanel = regionKey === "lower-info-panel";
  const storyFont = resolveStoryMalayalamFont(bindings);
  const storyFontFamily = storyMalayalamFontFamilyCss(storyFont.family);
  const lightSweepCoverage = resolveHeadlineLightSweepCoverage(
    object,
    lowerInfoPanel,
  );

  // Hooks must run unconditionally (before any early return).
  const isOptionalInfoRegion =
    regionKey === "optional-info" ||
    regionKey === "optional-info-1" ||
    regionKey === "optional-info-2";
  const optionalSlides = useMemo(() => {
    if (!isOptionalInfoRegion) return [] as string[];
    const source =
      (bindings.optional_info_image || "").trim().length > 0
        ? bindings.optional_info_image
        : (bindings.gallery_images ?? "");
    return source
      .split(",")
      .map((item) => item.trim())
      .filter(
        (item) =>
          Boolean(item) &&
          !item.startsWith("{{") &&
          !isLibraryMediaRef(item),
      );
  }, [bindings.gallery_images, bindings.optional_info_image, isOptionalInfoRegion]);
  const intervalMs = Math.max(
    1000,
    Number(bindings.optional_info_slide_interval_ms || "3500") || 3500,
  );
  const transitionMs = Math.max(
    0,
    Number(bindings.optional_info_transition_ms || "450") || 450,
  );
  const transitionStyle = (bindings.optional_info_transition_style || "fade").toLowerCase();
  const manualSlideIndex = Math.max(
    0,
    Number(bindings.optional_info_slide_index || "0") || 0,
  );
  const [optionalSlideIndex, setOptionalSlideIndex] = useState(manualSlideIndex);
  const optionalMediaRef = useRef<HTMLElement | null>(null);
  /** Playback / render: every subsystem derives state from playheadMs only. */
  const timelineDriven = motionMode === "playback";

  useEffect(() => {
    if (timelineDriven) return;
    if (optionalSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setOptionalSlideIndex((index) => (index + 1) % optionalSlides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, optionalSlides.length, timelineDriven]);

  useEffect(() => {
    setOptionalSlideIndex(manualSlideIndex);
  }, [manualSlideIndex, bindings.optional_info_image, object.id]);

  const activeOptionalSlideIndex =
    timelineDriven && optionalSlides.length > 1
      ? Math.floor(Math.max(0, playheadMs) / intervalMs) % optionalSlides.length
      : optionalSlideIndex;

  useEffect(() => {
    if (!isOptionalInfoRegion || transitionMs <= 0) return;
    const el = optionalMediaRef.current;
    if (!el) return;

    const keyframes: Keyframe[] | null =
      transitionStyle === "fade"
        ? [{ opacity: 0.15 }, { opacity: 1 }]
        : transitionStyle === "slide"
          ? [
              { opacity: 0.2, transform: "translateX(16px) scale(1.01)" },
              { opacity: 1, transform: "translateX(0) scale(1)" },
            ]
          : null;
    if (!keyframes) return;

    const animation = el.animate(keyframes, {
      duration: transitionMs,
      easing: "ease-out",
      fill: "both",
    });

    // Same keyframes either way — playback just seeks them from the timeline
    // instead of letting the browser run them on wall clock.
    if (timelineDriven) {
      animation.pause();
      animation.currentTime = Math.min(
        transitionMs,
        Math.max(0, playheadMs) % intervalMs,
      );
    }

    return () => animation.cancel();
  }, [
    isOptionalInfoRegion,
    activeOptionalSlideIndex,
    optionalSlides.length,
    transitionMs,
    transitionStyle,
    timelineDriven,
    playheadMs,
    intervalMs,
  ]);

  const subHeadlineSlides = useMemo(() => {
    if (!isSubheadlineRegion) return [] as string[];
    const fromSlots = [
      bindings.sub_headline_1,
      bindings.sub_headline_2,
      bindings.sub_headline_3,
      bindings.sub_headline_4,
    ]
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    if (fromSlots.length > 0) return fromSlots;
    return String(bindings.summary ?? "")
      .split(/\r?\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [
    bindings.sub_headline_1,
    bindings.sub_headline_2,
    bindings.sub_headline_3,
    bindings.sub_headline_4,
    bindings.summary,
    isSubheadlineRegion,
  ]);
  const [subHeadlineIndex, setSubHeadlineIndex] = useState(0);
  useEffect(() => {
    if (timelineDriven) return;
    if (subHeadlineSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSubHeadlineIndex((index) => (index + 1) % subHeadlineSlides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, subHeadlineSlides.length, timelineDriven]);
  const activeSubHeadlineIndex =
    timelineDriven && subHeadlineSlides.length > 1
      ? Math.floor(Math.max(0, playheadMs) / intervalMs) %
        subHeadlineSlides.length
      : subHeadlineIndex;
  useEffect(() => {
    setSubHeadlineIndex(0);
  }, [
    bindings.sub_headline_1,
    bindings.sub_headline_2,
    bindings.sub_headline_3,
    bindings.sub_headline_4,
    bindings.summary,
    object.id,
  ]);

  if (isLegacyMetaPartObject(object)) {
    if (hasMetaInfoBar) return null;
    if (regionKey !== "clock") return null;
  }

  // Shape Composer — when enabled, drive the live preview for this layer.
  if (shouldRenderAsShape(object)) {
    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute z-[4] box-border"
        style={withLayerMotion(
          {
            left: object.transform.x,
            top: object.transform.y,
            width: object.transform.width,
            height: object.transform.height,
            background: "transparent",
          },
          object,
          playheadMs,
          motionMode,
        )}
      >
        <ShapeRenderer
          object={object}
          className="size-full"
          clockMs={playheadMs}
          isPlaying={motionMode === "playback"}
        />
      </SelectableShell>
    );
  }

  if (
    isMetaInfoBarObject(object) ||
    (isLegacyMetaPartObject(object) && regionKey === "clock" && !hasMetaInfoBar)
  ) {
    const line = buildMetaInfoLine(bindings);
    const box = isMetaInfoBarObject(object)
      ? {
          x: object.transform.x,
          y: object.transform.y,
          width: object.transform.width,
          height: object.transform.height,
        }
      : GNN_001_META_INFO_BAR;
    const metaAlign =
      object.style.alignment === "left" || object.style.alignment === "center"
        ? object.style.alignment
        : "right";

    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute z-[6] box-border overflow-hidden"
        style={withLayerMotion(
          {
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          background: GNN_001_META_INFO_BAR.background,
          color: GNN_001_META_INFO_BAR.textColor,
          borderRadius: GNN_001_META_INFO_BAR.borderRadius,
          fontFamily: storyFontFamily,
          fontSize: 20,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent:
            metaAlign === "center"
              ? "center"
              : metaAlign === "left"
                ? "flex-start"
                : "flex-end",
          textAlign: metaAlign,
          padding: "0 16px",
          whiteSpace: "nowrap",
        },
          object,
          playheadMs,
        motionMode,
        )}
      >
        {line ? (
          <span className="min-w-0 w-full truncate" style={{ textAlign: metaAlign }}>
            {line}
          </span>
        ) : (
          <ReadablePlaceholder kind="clock" />
        )}
      </SelectableShell>
    );
  }

  if (hideMainVideoChrome && (isMainVideoSkeleton(object) || isMainVideoFrame(object))) {
    return null;
  }

  if (isBackgroundObject(object)) {
    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute inset-0 overflow-hidden"
        style={withLayerMotion(
          {
            left: object.transform.x,
            top: object.transform.y,
            width: object.transform.width || artboard.width,
            height: object.transform.height || artboard.height,
            zIndex: 0,
          },
          object,
          playheadMs,
        motionMode,
        )}
      >
        <Gnn001BroadcastBackground
          width={object.transform.width || artboard.width}
          height={object.transform.height || artboard.height}
          content={object.content}
          bindings={bindings}
        />
      </SelectableShell>
    );
  }

  if (isMainVideoContainerObject(object)) {
    const shapeActive = shouldShowShapeOverlay(object);
    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute z-[5] overflow-hidden"
        style={withLayerMotion(
          {
            left: object.transform.x,
            top: object.transform.y,
            width: object.transform.width,
            height: object.transform.height,
          },
          object,
          playheadMs,
          motionMode,
        )}
      >
        <Gnn001MainVideoContainer
          width={object.transform.width}
          height={object.transform.height}
          content={object.content}
          bindings={bindings}
          selected={selected}
          onSelect={select ? () => select(object.id) : undefined}
          onBrowseMedia={
            onBrowseMedia ? () => onBrowseMedia(object) : undefined
          }
          suppressFrameChrome={shapeActive}
          clockMs={playheadMs}
          isPlaying={motionMode === "playback"}
        />
      </SelectableShell>
    );
  }

  if (isFrameObject(object)) {
    const frameContent = gnn001LowerPanelFrameContent(object, object.content);
    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute z-[2]"
        style={withLayerMotion(
          {
            left: object.transform.x,
            top: object.transform.y,
            width: object.transform.width,
            height: object.transform.height,
          },
          object,
          playheadMs,
        motionMode,
        )}
      >
        <Gnn001BroadcastFrame
          width={object.transform.width}
          height={object.transform.height}
          content={frameContent}
          bindings={bindings}
        />
      </SelectableShell>
    );
  }

  if (isSkeletonObject(object)) {
    const kind = placeholderKindForObject({
      name: object.name,
      object_type: object.object_type,
      regionKey,
    });
    const label = resolveObjectDisplayText(object, bindings);
    const rotatingSubHeadline =
      isSubheadlineRegion && subHeadlineSlides.length > 0
        ? subHeadlineSlides[
            Math.max(0, activeSubHeadlineIndex) % subHeadlineSlides.length
          ] ?? null
        : null;
    const displayLabel = rotatingSubHeadline || label;
    const mediaFromSrc =
      typeof object.bindings.src === "string"
        ? resolveVariableTokens(object.bindings.src, bindings)
        : null;
    const mediaUrl =
      resolveObjectMediaUrl(object, bindings) ||
      (mediaFromSrc &&
      mediaFromSrc !== object.bindings.src &&
      !mediaFromSrc.startsWith("{{") &&
      !isLibraryMediaRef(mediaFromSrc)
        ? mediaFromSrc
        : null);

    // Story-driven media regions (reporter/logo, main-video, optional-info).
    if (
      object.object_type === "video" ||
      object.object_type === "image" ||
      object.object_type === "logo"
    ) {
      const isOptionalInfo = isOptionalInfoRegion;
      const slideMediaUrl =
        isOptionalInfoRegion && optionalSlides.length > 0
          ? optionalSlides[
              Math.max(0, activeOptionalSlideIndex) % optionalSlides.length
            ] ?? null
          : null;
      const displayMediaUrl = slideMediaUrl || mediaUrl;
      const optionalText =
        isOptionalInfo &&
        label &&
        !label.startsWith("{{") &&
        label.trim().length > 0
          ? label
          : null;

      return (
        <SelectableShell
          object={object}
          lightSweepCoverage={lightSweepCoverage}
          interactive={interactive}
          selected={selected}
          onSelect={select}
          className="absolute z-[4] box-border overflow-hidden"
          style={withLayerMotion(
            {
              left: object.transform.x,
              top: object.transform.y,
              width: object.transform.width,
              height: object.transform.height,
              border:
                displayMediaUrl || optionalText
                  ? "none"
                  : "1px solid rgba(255,255,255,0.55)",
              background:
                optionalText && !displayMediaUrl
                  ? "rgba(0,0,0,0.28)"
                  : undefined,
              color: "#fff",
              fontFamily: bindings.font_family ?? "Noto Sans Malayalam",
              fontSize: Number(object.style.font_size ?? 20),
              fontWeight: Number(object.style.font_weight ?? 600),
              display: optionalText && !displayMediaUrl ? "flex" : undefined,
              alignItems: "center",
              justifyContent: "center",
              padding: optionalText && !displayMediaUrl ? "16px" : undefined,
              textAlign: "center",
              whiteSpace: "pre-wrap",
            },
            object,
            playheadMs,
          motionMode,
          )}
        >
          {displayMediaUrl ? (
            object.object_type === "video" ? (
              <video
                src={displayMediaUrl}
                className="size-full object-cover"
                ref={
                  isOptionalInfo
                    ? (node) => {
                        optionalMediaRef.current = node;
                      }
                    : undefined
                }
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={displayMediaUrl}
                alt={object.name}
                className="size-full object-cover"
                ref={
                  isOptionalInfo
                    ? (node) => {
                        optionalMediaRef.current = node;
                      }
                    : undefined
                }
              />
            )
          ) : optionalText ? (
            <span className="line-clamp-8 w-full">{optionalText}</span>
          ) : (
            <ReadablePlaceholder
              kind={isOptionalInfo ? "optional" : kind}
              label={
                isOptionalInfo ? "Optional Info" : undefined
              }
              onBrowse={
                onBrowseMedia ? () => onBrowseMedia(object) : undefined
              }
            />
          )}
        </SelectableShell>
      );
    }

    // Text / ticker / clock / date — bind from Story; placeholder only if empty.
    const resolved =
      displayLabel &&
      !displayLabel.startsWith("{{") &&
      displayLabel.trim().length > 0
        ? displayLabel
        : null;
    const isTextish =
      isTextLikeObject(object) ||
      object.object_type === "ticker" ||
      object.object_type === "clock" ||
      object.object_type === "date";

    if (isTextish) {
      const defaultTextSize = isHeadlineRegion
        ? 48
        : isSubheadlineRegion
          ? 28
          : 22;
      const defaultTextWeight = isHeadlineRegion
        ? Math.max(storyFont.weight, 700)
        : isSubheadlineRegion
          ? storyFont.weight
          : storyFont.weight;
      const textColor = isLowerPanelText
        ? GNN_001_LOWER_PANEL_TEXT_COLOR
        : "#fff";
      return (
        <SelectableShell
          object={object}
          lightSweepCoverage={lightSweepCoverage}
          interactive={interactive}
          selected={selected}
          onSelect={select}
          className="absolute z-[4] box-border overflow-hidden"
          style={withLayerMotion(
            {
              left: object.transform.x,
              top: object.transform.y,
              width: object.transform.width,
              height: object.transform.height,
              border: resolved
                ? "none"
                : isLowerPanelText
                  ? "1px solid rgba(0,0,0,0.12)"
                  : "1px solid rgba(255,255,255,0.55)",
              background: resolved
                ? object.object_type === "ticker"
                  ? bindings.primary_color ?? "#1D4ED8"
                  : "transparent"
                : isLowerPanelText
                  ? "rgba(0,0,0,0.04)"
                  : "rgba(0,0,0,0.2)",
              color: textColor,
              fontFamily: storyFontFamily,
              fontSize: Number(object.style.font_size ?? defaultTextSize),
              fontWeight: Number(object.style.font_weight ?? defaultTextWeight),
              display: "flex",
              alignItems:
                object.style.vertical_alignment === "top"
                  ? "flex-start"
                  : object.style.vertical_alignment === "bottom"
                    ? "flex-end"
                    : "center",
              padding: "8px 12px",
              lineHeight: Number(object.style.line_height ?? 1.35),
              letterSpacing: Number(object.style.letter_spacing ?? 0),
              textAlign:
                (object.style.alignment as CanvasTextAlign) ??
                (isHeadlineRegion || isSubheadlineRegion ? "left" : "left"),
              whiteSpace:
                object.object_type === "ticker" ? "nowrap" : "pre-wrap",
            },
            object,
            playheadMs,
          motionMode,
          )}
        >
          {resolved ? (
            object.object_type === "ticker" ? (
              <span className="truncate">{resolved}</span>
            ) : (
              <span className="w-full break-words">{resolved}</span>
            )
          ) : (
            <ReadablePlaceholder kind={kind} />
          )}
        </SelectableShell>
      );
    }

    // Structural chrome regions — Shape Composer takes over when enabled.
    if (shouldRenderAsShape(object)) {
      return (
        <SelectableShell
          object={object}
          lightSweepCoverage={lightSweepCoverage}
          interactive={interactive}
          selected={selected}
          onSelect={select}
          className="absolute z-[3] box-border"
          style={withLayerMotion(
            {
              left: object.transform.x,
              top: object.transform.y,
              width: object.transform.width,
              height: object.transform.height,
              background: "transparent",
            },
            object,
            playheadMs,
            motionMode,
          )}
        >
          <ShapeRenderer
            object={object}
            clockMs={playheadMs}
            isPlaying={motionMode === "playback"}
          />
        </SelectableShell>
      );
    }

    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute z-[3] box-border"
        style={withLayerMotion(
          {
            left: object.transform.x,
            top: object.transform.y,
            width: object.transform.width,
            height: object.transform.height,
            background: isLowerInfoPanel
              ? GNN_001_LOWER_PANEL_FILL
              : undefined,
            border: isLowerInfoPanel
              ? `1px solid ${GNN_001_LOWER_PANEL_BORDER}`
              : "1px solid rgba(255,255,255,0.25)",
          },
          object,
          playheadMs,
        motionMode,
        )}
      >
        {null}
      </SelectableShell>
    );
  }

  const mediaUrl = resolveObjectMediaUrl(object, bindings);
  const isText = isTextLikeObject(object);
  const label = resolveObjectDisplayText(object, bindings);
  const rotatingSubHeadline =
    isSubheadlineRegion && subHeadlineSlides.length > 0
      ? subHeadlineSlides[
          Math.max(0, activeSubHeadlineIndex) % subHeadlineSlides.length
        ] ?? null
      : null;
  const displayLabel = rotatingSubHeadline || label;
  const primaryColor = bindings.primary_color ?? "#1D4ED8";
  const storyFontResolved = resolveStoryMalayalamFont(bindings);
  const fontFamily = storyMalayalamFontFamilyCss(storyFontResolved.family);
  const showPlaceholder = !hasResolvedContent(object, bindings, displayLabel);

  const baseStyle: React.CSSProperties = withLayerMotion(
    {
      left: object.transform.x,
      top: object.transform.y,
      width: object.transform.width,
      height: object.transform.height,
      opacity: object.transform.opacity,
      zIndex: 6,
    },
    object,
    playheadMs,
  motionMode,
  );

  if (object.object_type === "video") {
    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute overflow-hidden"
        style={baseStyle}
      >
        {showPlaceholder ? (
          <ReadablePlaceholder
            kind="video"
            onBrowse={onBrowseMedia ? () => onBrowseMedia(object) : undefined}
          />
        ) : (
          <video
            src={mediaUrl!}
            className="size-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        )}
      </SelectableShell>
    );
  }

  if (
    (object.object_type === "image" || object.object_type === "logo") &&
    (mediaUrl || showPlaceholder)
  ) {
    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute overflow-hidden"
        style={baseStyle}
      >
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={object.name}
            className="size-full object-cover"
          />
        ) : (
          <ReadablePlaceholder
            kind={object.object_type === "logo" ? "logo" : "image"}
            onBrowse={
              onBrowseMedia ? () => onBrowseMedia(object) : undefined
            }
          />
        )}
      </SelectableShell>
    );
  }

  if (object.object_type === "ticker") {
    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute overflow-hidden"
        style={{
          ...baseStyle,
          background: showPlaceholder ? "rgba(0,0,0,0.35)" : primaryColor,
          color: "#fff",
          fontFamily,
          fontSize: Number(object.style.font_size ?? 22),
          fontWeight: Number(object.style.font_weight ?? 600),
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
        }}
      >
        {showPlaceholder ? (
          <ReadablePlaceholder kind="ticker" />
        ) : (
          <span className="truncate">{label}</span>
        )}
      </SelectableShell>
    );
  }

  if (isText) {
    const kind = placeholderKindForObject({
      name: object.name,
      object_type: object.object_type,
    });
    const isLowerPanelHeadline =
      regionKey === "headline" || /headline/i.test(object.name);
    const isLowerPanelSubheadline =
      regionKey === "subheadline" || /subheadline/i.test(object.name);
    const isLowerPanelHeadlineText = isLowerPanelHeadline || isLowerPanelSubheadline;
    const defaultTextSize = isLowerPanelHeadline ? 48 : isLowerPanelSubheadline ? 28 : 24;
    const defaultTextWeight = isLowerPanelHeadline ? 800 : 600;
    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute overflow-hidden"
        style={{
          ...baseStyle,
          background: showPlaceholder
            ? isLowerPanelHeadlineText
              ? "rgba(0,0,0,0.04)"
              : "rgba(0,0,0,0.28)"
            : ((object.style.fill as string | undefined) ?? "transparent"),
          borderRadius: Number(object.style.corner_radius ?? 0),
          fontFamily,
          fontSize: Number(object.style.font_size ?? defaultTextSize),
          fontWeight: Number(object.style.font_weight ?? defaultTextWeight),
          color: isLowerPanelHeadlineText
            ? GNN_001_LOWER_PANEL_TEXT_COLOR
            : String(object.style.color ?? "#fff"),
          display: "flex",
          alignItems:
            object.style.vertical_alignment === "top"
              ? "flex-start"
              : object.style.vertical_alignment === "bottom"
                ? "flex-end"
                : "center",
          padding: "8px 12px",
          lineHeight: Number(object.style.line_height ?? 1.35),
          letterSpacing: Number(object.style.letter_spacing ?? 0),
          textAlign: (object.style.alignment as CanvasTextAlign) ?? "left",
          whiteSpace: object.style.wrap ? "pre-wrap" : "nowrap",
        }}
      >
        {showPlaceholder ? (
          <ReadablePlaceholder kind={kind} />
        ) : (
          displayLabel
        )}
      </SelectableShell>
    );
  }

  if (shouldRenderAsShape(object)) {
    return (
      <SelectableShell
        object={object}
        lightSweepCoverage={lightSweepCoverage}
        interactive={interactive}
        selected={selected}
        onSelect={select}
        className="absolute"
        style={{
          ...baseStyle,
          background: "transparent",
        }}
      >
        <ShapeRenderer
          object={object}
          clockMs={playheadMs}
          isPlaying={motionMode === "playback"}
        />
      </SelectableShell>
    );
  }

  return (
    <SelectableShell
      object={object}
      lightSweepCoverage={lightSweepCoverage}
      interactive={interactive}
      selected={selected}
      onSelect={select}
      className="absolute"
      style={{
        ...baseStyle,
        background:
          (object.style.fill as string | undefined) ??
          "rgba(99,102,241,0.35)",
        borderRadius: Number(object.style.corner_radius ?? 0),
      }}
    >
      {null}
    </SelectableShell>
  );
}

export function StoryLivePreview({
  scene,
  resolvedBindings = {},
  playheadMs = 0,
  motionMode = "edit",
  isPlaying = false,
  aspect = "1920x1080",
  className,
  selectedObjectId = null,
  onSelectObject,
  interactive = false,
  fillParent = false,
  onBrowseMedia,
}: StoryLivePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [mounted, setMounted] = useState(fillParent);
  const [hoveredEdgeObjectId, setHoveredEdgeObjectId] = useState<string | null>(
    null,
  );
  const edgeHoverValue = useMemo(
    () => ({ setHoveredObjectId: setHoveredEdgeObjectId }),
    [],
  );
  useEffect(() => {
    if (fillParent) {
      setMounted(true);
      return;
    }
    setMounted(true);
  }, [fillParent]);

  const artboard = ASPECT_DIMENSIONS[aspect];
  const packageCode = (scene.metadata as Record<string, unknown> | undefined)
    ?.package_code;
  const isGnn001 =
    packageCode === "GNN-001" ||
    scene.name.includes("GNN-001") ||
    scene.name.includes("Full News Story");
  const hasBackgroundLayer = scene.composer_document.objects.some(
    isBackgroundObject,
  );
  const hasFrameLayer = scene.composer_document.objects.some(isFrameObject);
  const hasMainVideoContainer = scene.composer_document.objects.some(
    isMainVideoContainerObject,
  );
  const isSkeletonScene =
    (scene.metadata as Record<string, unknown> | undefined)?.layout_mode ===
      "skeleton" ||
    scene.composer_document.objects.some(isSkeletonObject);

  const bindings = useMemo(
    () => ({ ...buildDefaultBindings(), ...resolvedBindings }),
    [resolvedBindings],
  );

  // Keep runtime patches identity-stable across playhead ticks so edge/motion
  // overlays don't remount every animation frame.
  const patchedObjects = useMemo(() => {
    let objects = scene.composer_document.objects;
    if (isGnn001) {
      objects = patchGnn001LowerPanelObjects(objects);
      objects = patchGnn001LeftRailObjects(objects);
      objects = patchGnn001EdgeSweepDemos(objects);
    }
    return objects;
  }, [isGnn001, scene.composer_document.objects]);

  const visibleObjects = useMemo(() => {
    return [...filterVisibleObjects(patchedObjects, playheadMs)].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
  }, [patchedObjects, playheadMs]);

  const hasMetaInfoBar = useMemo(
    () => visibleObjects.some(isMetaInfoBarObject),
    [visibleObjects],
  );
  const lowerInfoPanel = useMemo(
    () => findLowerInfoPanelObject(visibleObjects) ?? null,
    [visibleObjects],
  );

  const sceneIntroUntilMs = useMemo(
    () => sceneShapeIntroUntilMs(patchedObjects),
    [patchedObjects],
  );

  const [shapePreview, setShapePreview] = useState<{
    objectId: string;
    holdMs: number;
  } | null>(null);

  useEffect(() => {
    const onReplay = (event: Event) => {
      const objectId = (event as CustomEvent<{ objectId?: string }>).detail
        ?.objectId;
      if (!objectId) return;
      const target = patchedObjects.find((object) => object.id === objectId);
      if (!target) return;
      const shape = getShapeConfig(target);
      const holdMs = Math.max(
        layerMotionGateMs(target),
        shapePreviewDurationMs(shape),
        300,
      );
      setShapePreview({ objectId, holdMs });
    };
    window.addEventListener(SHAPE_BEHAVIOR_REPLAY_EVENT, onReplay);
    return () =>
      window.removeEventListener(SHAPE_BEHAVIOR_REPLAY_EVENT, onReplay);
  }, [patchedObjects]);

  useEffect(() => {
    if (!shapePreview) return;
    const timer = window.setTimeout(() => {
      setShapePreview(null);
    }, shapePreview.holdMs + 80);
    return () => window.clearTimeout(timer);
  }, [shapePreview]);

  const shapeIntroGateValue = useMemo<ShapeIntroGateContextValue>(
    () => ({
      sceneIntroUntilMs,
      previewObjectId: shapePreview?.objectId ?? null,
      previewActive: Boolean(shapePreview),
    }),
    [sceneIntroUntilMs, shapePreview],
  );

  shapeIntroGateRef.current = shapeIntroGateValue;

  const showBackgroundFallback = isGnn001 && !hasBackgroundLayer;
  const frameFallbackObjects = useMemo(
    () => (isGnn001 && !hasFrameLayer ? createGnn001FrameObjects() : []),
    [isGnn001, hasFrameLayer],
  );
  const mainVideoFallback = useMemo(
    () =>
      isGnn001 && !hasMainVideoContainer
        ? createGnn001MainVideoContainerObject()
        : null,
    [isGnn001, hasMainVideoContainer],
  );
  const hideMainVideoChrome = hasMainVideoContainer || Boolean(mainVideoFallback);

  useEffect(() => {
    if (fillParent) return;
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;
    const updateScale = () => {
      // Defer out of ResizeObserver — sync setState there can recurse into
      // "Maximum update depth exceeded" when layout oscillates.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { width, height } = container.getBoundingClientRect();
        if (width <= 0 || height <= 0) return;
        const next = Math.min(width / artboard.width, height / artboard.height);
        setFitScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
      });
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [artboard.width, artboard.height, fillParent]);

  const clockValue = useMemo(
    () => ({ playheadMs, isPlaying }),
    [playheadMs, isPlaying],
  );

  const artboardContent = mounted ? (
    <PreviewClockContext.Provider value={clockValue}>
    <ShapeIntroGateContext.Provider value={shapeIntroGateValue}>
    <EdgeSweepHoverContext.Provider value={edgeHoverValue}>
    <>
      {showBackgroundFallback ? (
        <Gnn001BroadcastBackground
          width={artboard.width}
          height={artboard.height}
          bindings={bindings}
        />
      ) : null}

      {frameFallbackObjects.map((object) => {
        if (hideMainVideoChrome && isMainVideoFrame(object)) return null;
        const frameContent = gnn001LowerPanelFrameContent(object, object.content);
        return (
          <SelectableShell
            key={object.id}
            object={object}
            interactive={interactive}
            selected={selectedObjectId === object.id}
            onSelect={onSelectObject ? (id) => onSelectObject(id) : undefined}
            className="absolute"
            style={{
              left: object.transform.x,
              top: object.transform.y,
              width: object.transform.width,
              height: object.transform.height,
            }}
          >
            <Gnn001BroadcastFrame
              width={object.transform.width}
              height={object.transform.height}
              content={frameContent}
              bindings={bindings}
            />
          </SelectableShell>
        );
      })}

      {mainVideoFallback ? (
        <div
          className="absolute"
          style={{
            left: mainVideoFallback.transform.x,
            top: mainVideoFallback.transform.y,
            width: mainVideoFallback.transform.width,
            height: mainVideoFallback.transform.height,
          }}
        >
          <Gnn001MainVideoContainer
            width={mainVideoFallback.transform.width}
            height={mainVideoFallback.transform.height}
            content={mainVideoFallback.content}
            bindings={bindings}
            selected={selectedObjectId === mainVideoFallback.id}
            onSelect={
              onSelectObject
                ? () => onSelectObject(mainVideoFallback.id)
                : undefined
            }
            onBrowseMedia={
              onBrowseMedia
                ? () => onBrowseMedia(mainVideoFallback)
                : undefined
            }
            clockMs={playheadMs}
            isPlaying={motionMode === "playback"}
          />
        </div>
      ) : null}

      {visibleObjects.map((object) => (
        <PreviewObject
          key={object.id}
          object={object}
          bindings={bindings}
          artboard={artboard}
          hideMainVideoChrome={hideMainVideoChrome}
          selectedObjectId={selectedObjectId}
          onSelectObject={onSelectObject}
          interactive={interactive}
          onBrowseMedia={onBrowseMedia}
          hasMetaInfoBar={hasMetaInfoBar}
          playheadMs={playheadMs}
          motionMode={motionMode}
          lowerInfoPanel={lowerInfoPanel}
        />
      ))}

      <PreviewEdgeSweepLayer
        objects={visibleObjects}
        playheadMs={playheadMs}
        motionMode={motionMode}
        hoveredObjectId={hoveredEdgeObjectId}
      />
    </>
    </EdgeSweepHoverContext.Provider>
    </ShapeIntroGateContext.Provider>
    </PreviewClockContext.Provider>
  ) : null;

  if (fillParent) {
    return (
      <div
        className={`absolute inset-0 overflow-hidden ${className ?? ""}`}
        style={{ width: artboard.width, height: artboard.height }}
        onClick={() => onSelectObject?.(null)}
      >
        {artboardContent}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full min-h-0 items-center justify-center overflow-hidden bg-[#0B1220] ${className ?? ""}`}
    >
      <div
        className="relative shrink-0 overflow-hidden shadow-2xl ring-1 ring-white/10"
        style={{
          width: artboard.width,
          height: artboard.height,
          transform: `scale(${fitScale})`,
          transformOrigin: "center center",
          background:
            hasBackgroundLayer || showBackgroundFallback
              ? "#071225"
              : isSkeletonScene
                ? "#111111"
                : scene.composer_settings.background,
        }}
      >
        {artboardContent}
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-[10px] text-white/80">
        {artboard.width}×{artboard.height} ·{" "}
        {isSkeletonScene ? "Skeleton" : "Live"}
      </div>
    </div>
  );
}
