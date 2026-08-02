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
  resolveRevealConfig,
  sampleShapeReveal,
  shapePreviewDurationMs,
} from "@/features/scene-composer/lib/shape-composer";
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

type EdgeSweepHoverContextValue = {
  setHoveredObjectId: (id: string | null) => void;
};

const EdgeSweepHoverContext = createContext<EdgeSweepHoverContextValue>({
  setHoveredObjectId: () => {},
});

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
  const [rafMs, setRafMs] = useState(() => (restAtEnd ? total : 0));
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

  // Keep resting pose at end when reveal is on (content visible while editing).
  useEffect(() => {
    if (!enabled || !needsClock) {
      startRef.current = null;
      setPreviewActive(false);
      setRafMs(0);
      return;
    }
    if (isPlaying) {
      startRef.current = null;
      setPreviewActive(false);
      return;
    }
    // Idle edit: show original layer (end of reveal) unless previewing.
    if (restAtEnd && !previewActive && !loopClock) {
      startRef.current = null;
      setRafMs(total);
      return;
    }
    // Looping behaviors (no reveal): keep running.
    if (!previewActive && !loopClock) {
      startRef.current = null;
      setRafMs(total);
      return;
    }

    startRef.current = null;
    let raf = 0;
    let stopped = false;
    const tick = (now: number) => {
      if (stopped) return;
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      if (loopClock && !restAtEnd) {
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
  const previewTotalMs = shapeConfig ? shapePreviewDurationMs(shapeConfig) : 0;
  const needsShapeClock = Boolean(
    shapeConfig?.enabled &&
      (revealCfg?.enabled || hasShapeBehaviors),
  );
  const shapeClockMs = useShapePreviewClock(
    object.id,
    Boolean(shapeOverlay && shapeConfig?.enabled),
    needsShapeClock,
    previewTotalMs,
    clock.isPlaying,
    clock.playheadMs,
    hasLoopingBehaviors && !revealCfg?.enabled,
    Boolean(revealCfg?.enabled),
  );
  const revealSample =
    shapeOverlay && shapeConfig
      ? sampleShapeReveal(shapeConfig, shapeClockMs, { overlay: true })
      : null;
  const isFrameOnly =
    shapeConfig != null &&
    (shapeConfig.fillMode === "none" ||
      shapeConfig.fill === "transparent" ||
      shapeConfig.kind === "video_frame");
  const revealDriving = Boolean(revealCfg?.enabled);
  const revealActive = Boolean(revealDriving && revealSample);
  const originalHidden =
    revealActive &&
    revealSample != null &&
    revealSample.phase !== "revealed";
  // Cover original fill while shape is intro/hold/exit.
  const shapeCovering = originalHidden && !isFrameOnly;
  // Original layer content only after shape fully exits (not during exit fade).
  const contentOpacity = isFrameOnly
    ? 1
    : revealActive
      ? revealSample?.phase === "revealed"
        ? 1
        : 0
      : 1;

  return (
    <div
      className={className}
      data-object-id={object.id}
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
        style={{
          opacity: contentOpacity,
          visibility: contentOpacity <= 0 ? "hidden" : "visible",
          pointerEvents: contentOpacity <= 0 ? "none" : undefined,
        }}
        aria-hidden={contentOpacity <= 0}
      >
        {children}
      </div>
      {shapeOverlay &&
      (revealSample == null ||
        revealSample.shapeVisible ||
        (!revealDriving && hasShapeBehaviors)) ? (
        <ShapeRenderer
          object={object}
          overlay
          clockMs={needsShapeClock ? shapeClockMs : clock.playheadMs}
          isPlaying={clock.isPlaying}
          useExternalClock={needsShapeClock}
          className={
            revealDriving &&
            revealSample &&
            revealSample.phase !== "revealed"
              ? "pointer-events-none absolute inset-0 z-[5]"
              : "pointer-events-none absolute inset-0 z-0"
          }
        />
      ) : null}
      <BroadcastEffectOverlays
        overlays={sampledEffects.overlays}
        clockMs={clock.playheadMs}
        isPlaying={clock.isPlaying}
        lightSweepCoverage={lightSweepCoverage}
      />
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

/** GPU-friendly motion overlay — translate/scale/opacity, no layout reflow. */
function withLayerMotion(
  style: React.CSSProperties,
  object: SceneObject,
  playheadMs: number,
  motionMode: "playback" | "edit" = "edit",
): React.CSSProperties {
  const motion = sampleLayerMotion(object, playheadMs, { mode: motionMode });
  const baseOpacity =
    typeof style.opacity === "number"
      ? style.opacity
      : object.transform.opacity;
  return {
    ...style,
    // Perspective + rotateX/Y/Z for true 3D idle; object.rotation remains base Z.
    transform: `perspective(700px) translate3d(${motion.translateX}px, ${motion.translateY}px, 0) scale(${object.transform.scale * motion.scale}) rotateX(${motion.rotateX}deg) rotateY(${motion.rotateY}deg) rotateZ(${object.transform.rotation + motion.rotateZ}deg)`,
    transformOrigin: motion.transformOrigin ?? "center center",
    transformStyle: "preserve-3d",
    opacity: baseOpacity * motion.opacity,
    clipPath: motion.clipPath ?? style.clipPath,
    filter: motion.filter ?? style.filter,
    visibility: motion.visible ? style.visibility : "hidden",
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

  useEffect(() => {
    setOptionalSlideIndex(manualSlideIndex);
  }, [manualSlideIndex, bindings.optional_info_image, object.id]);

  useEffect(() => {
    if (optionalSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setOptionalSlideIndex((index) => (index + 1) % optionalSlides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, optionalSlides]);

  useEffect(() => {
    if (!isOptionalInfoRegion || transitionMs <= 0) return;
    const el = optionalMediaRef.current;
    if (!el) return;
    if (transitionStyle === "fade") {
      el.animate(
        [
          { opacity: 0.15 },
          { opacity: 1 },
        ],
        { duration: transitionMs, easing: "ease-out" },
      );
    } else if (transitionStyle === "slide") {
      el.animate(
        [
          { opacity: 0.2, transform: "translateX(16px) scale(1.01)" },
          { opacity: 1, transform: "translateX(0) scale(1)" },
        ],
        { duration: transitionMs, easing: "ease-out" },
      );
    }
  }, [
    isOptionalInfoRegion,
    optionalSlideIndex,
    optionalSlides,
    transitionMs,
    transitionStyle,
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
              Math.max(0, optionalSlideIndex) % optionalSlides.length
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
      label && !label.startsWith("{{") && label.trim().length > 0
        ? label
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
  const primaryColor = bindings.primary_color ?? "#1D4ED8";
  const storyFontResolved = resolveStoryMalayalamFont(bindings);
  const fontFamily = storyMalayalamFontFamilyCss(storyFontResolved.family);
  const showPlaceholder = !hasResolvedContent(object, bindings, label);

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
          label
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

    const updateScale = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      setFitScale(Math.min(width / artboard.width, height / artboard.height));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [artboard.width, artboard.height, fillParent]);

  const clockValue = useMemo(
    () => ({ playheadMs, isPlaying }),
    [playheadMs, isPlaying],
  );

  const artboardContent = mounted ? (
    <PreviewClockContext.Provider value={clockValue}>
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
