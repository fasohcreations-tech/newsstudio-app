"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  CornerAccentSet,
  EmptyState,
  VideoBottomBar,
  VideoFrame,
  VideoMask,
  VideoOverlay,
  VideoTopBar,
} from "@/features/scene-composer/components/main-video";
import {
  GNN_001_VIDEO_STATE_ACCENTS,
  resolveGnn001MainVideoProps,
  type Gnn001MainVideoContainerProps,
  type Gnn001VideoFit,
} from "@/features/scene-composer/lib/gnn-001-main-video.constants";

type Gnn001MainVideoContainerPropsInput = {
  width: number;
  height: number;
  content?: Record<string, unknown>;
  bindings?: Record<string, string>;
  props?: Partial<Gnn001MainVideoContainerProps>;
  selected?: boolean;
  onSelect?: () => void;
  onBrowseMedia?: () => void;
  /**
   * When Shape Composer is active, drop the built-in metallic frame so the
   * shape rim / mask owns the look (otherwise video chrome hides shape work).
   */
  suppressFrameChrome?: boolean;
  /** Timeline clock — drives the slideshow during playback / render. */
  clockMs?: number;
  isPlaying?: boolean;
};

const SLIDESHOW_INTERVAL_MS = 4000;

function normalizeFit(fit: Gnn001VideoFit | string): Gnn001VideoFit {
  if (fit === "cover") return "fill";
  if (fit === "contain") return "fit";
  if (["fit", "fill", "crop", "center", "zoom"].includes(fit)) {
    return fit as Gnn001VideoFit;
  }
  return "fill";
}

function fitObjectFit(fit: Gnn001VideoFit): CSSProperties["objectFit"] {
  switch (fit) {
    case "fit":
      return "contain";
    case "center":
      return "none";
    case "fill":
    case "crop":
    case "zoom":
    default:
      return "cover";
  }
}

function resolveMediaUrl(
  mode: Gnn001MainVideoContainerProps["media_mode"],
  bindings: Record<string, string>,
  slideshowIndex: number,
): string | null {
  if (mode === "image") {
    return bindings.main_image || bindings.image || null;
  }
  if (mode === "slideshow") {
    const gallery = (bindings.gallery_images || bindings.main_image || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (gallery.length === 0) return bindings.main_image || null;
    return gallery[slideshowIndex % gallery.length] ?? null;
  }
  if (mode === "live_feed") {
    return bindings.live_feed || bindings.main_video || bindings.video || null;
  }
  if (mode === "ai_video") {
    return (
      bindings.ai_video ||
      bindings.main_video ||
      bindings.video ||
      null
    );
  }
  return bindings.main_video || bindings.video || null;
}

function isImageMode(mode: Gnn001MainVideoContainerProps["media_mode"]) {
  return mode === "image" || mode === "slideshow";
}

/**
 * Layer 3 — premium Main Video Container.
 * Hierarchy: VideoFrame → VideoMask → media | EmptyState
 *            + CornerAccentSet + VideoOverlay (TopBar / BottomBar)
 * Geometry locked to Main Video region. Other layers untouched.
 */
export function Gnn001MainVideoContainer({
  width,
  height,
  content = {},
  bindings = {},
  props,
  selected = false,
  onSelect,
  onBrowseMedia,
  suppressFrameChrome = false,
  clockMs = 0,
  isPlaying = false,
}: Gnn001MainVideoContainerPropsInput) {
  const resolved = {
    ...resolveGnn001MainVideoProps(content, bindings),
    ...props,
  };

  const fit = normalizeFit(resolved.fit);
  const stateAccent =
    GNN_001_VIDEO_STATE_ACCENTS[resolved.container_state] ??
    resolved.accent_color;
  const accent =
    resolved.container_state === "normal"
      ? resolved.accent_color || stateAccent
      : stateAccent;

  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const galleryLength = useMemo(() => {
    return (bindings.gallery_images || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean).length;
  }, [bindings.gallery_images]);

  useEffect(() => {
    // Playback / render derives the slide from the timeline instead, so a slow
    // capture cannot advance the gallery at wall-clock speed.
    if (isPlaying) return;
    if (resolved.media_mode !== "slideshow" || galleryLength <= 1) return;
    const timer = window.setInterval(() => {
      setSlideshowIndex((index) => (index + 1) % galleryLength);
    }, SLIDESHOW_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [resolved.media_mode, galleryLength, isPlaying]);

  const activeSlideIndex =
    isPlaying && galleryLength > 1
      ? Math.floor(Math.max(0, clockMs) / SLIDESHOW_INTERVAL_MS) % galleryLength
      : slideshowIndex;

  const mediaUrl = resolveMediaUrl(
    resolved.media_mode,
    bindings,
    activeSlideIndex,
  );

  const isFullscreen = resolved.container_state === "fullscreen";
  const padding = isFullscreen
    ? Math.max(2, resolved.padding * 0.35)
    : resolved.padding;
  const safe = resolved.safe_area;
  const radius = resolved.corner_radius;

  const sceneTitle =
    bindings.scene_title ||
    bindings.headline ||
    bindings.video_title ||
    "{{scene_title}}";
  const caption =
    bindings.video_caption || bindings.caption || "{{video_caption}}";
  const camera = bindings.camera || bindings.camera_name || "";
  const credit = bindings.credit || bindings.video_credit || "";

  const mediaStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: fitObjectFit(fit),
    objectPosition: "center",
    display: "block",
  };

  return (
    <div
      data-layer="main_video_container"
      data-animation-preset={resolved.animation_preset}
      data-selected={selected ? "true" : "false"}
      className="absolute box-border"
      style={{
        width,
        height,
        cursor: onSelect ? "pointer" : "default",
        boxShadow: selected
          ? "0 0 0 1px rgba(56, 189, 248, 0.55)"
          : "none",
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
    >
      <VideoFrame
        borderWidth={suppressFrameChrome ? 0 : resolved.border_width}
        borderColor={
          suppressFrameChrome ? "transparent" : resolved.border_color
        }
        cornerRadius={suppressFrameChrome ? 0 : radius}
        frameOpacity={suppressFrameChrome ? 1 : resolved.frame_opacity}
        glassOpacity={suppressFrameChrome ? 0 : resolved.glass_opacity}
        innerShadow={suppressFrameChrome ? 0 : resolved.inner_shadow}
        style={
          suppressFrameChrome
            ? {
                background: "transparent",
                border: "none",
                boxShadow: "none",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {/* Padded media viewport */}
        <div
          style={{
            position: "absolute",
            inset: padding,
            borderRadius: Math.max(0, radius - padding),
            overflow: "hidden",
            background: "#050B16",
          }}
        >
          <VideoMask
            fit={fit}
            scale={resolved.video_scale}
            positionX={resolved.video_position_x}
            positionY={resolved.video_position_y}
            rotation={resolved.video_rotation}
            opacity={resolved.video_opacity}
            crop={resolved.crop}
            cornerRadius={Math.max(0, radius - padding)}
            style={{ inset: safe }}
          >
            {mediaUrl ? (
              isImageMode(resolved.media_mode) ? (
                <img src={mediaUrl} alt="" style={mediaStyle} />
              ) : (
                <video
                  src={mediaUrl}
                  style={mediaStyle}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              )
            ) : null}
          </VideoMask>

          {!mediaUrl && resolved.show_empty_state ? (
            <EmptyState visible label="drop" onBrowse={onBrowseMedia} />
          ) : null}

          <VideoOverlay>
            <VideoTopBar
              visible={resolved.top_bar_visible && !isFullscreen}
              height={resolved.top_bar_height}
              color={resolved.top_bar_color}
              opacity={resolved.top_bar_opacity}
              title={sceneTitle}
              safeArea={4}
            />
            <VideoBottomBar
              visible={resolved.bottom_bar_visible && !isFullscreen}
              height={resolved.bottom_bar_height}
              color={resolved.bottom_bar_color}
              opacity={resolved.bottom_bar_opacity}
              caption={caption}
              camera={camera}
              credit={credit}
              safeArea={4}
            />
          </VideoOverlay>
        </div>

        {/* Corner accents — state changes color only */}
        {!isFullscreen && !suppressFrameChrome ? (
          <CornerAccentSet
            color={accent}
            thickness={resolved.accent_thickness}
            length={36}
            inset={6}
          />
        ) : null}
      </VideoFrame>
    </div>
  );
}
