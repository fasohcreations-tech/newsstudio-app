"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import {
  looksLikeMediaImageUrl,
  type MediaContainerConfig,
  type MediaContainerFit,
} from "@/features/scene-composer/lib/media-container";

type MediaSlideContainerViewProps = {
  width: number;
  height: number;
  slides: string[];
  controls: Omit<MediaContainerConfig, "slides">;
  clockMs?: number;
  isPlaying?: boolean;
  className?: string;
  /** Decorative base under empty/media (Background navy). */
  base?: ReactNode;
  emptyLabel?: string;
  onBrowseMedia?: () => void;
  dataLayer?: string;
};

function SlideMedia({
  url,
  fit,
}: {
  url: string;
  fit: MediaContainerFit;
}) {
  const [forceImage, setForceImage] = useState<boolean | null>(null);
  const asImage = forceImage ?? looksLikeMediaImageUrl(url);
  // contain/cover keep aspect ratio; fill stretches to the box.
  const objectFit: CSSProperties["objectFit"] =
    fit === "fill" ? "fill" : fit === "contain" ? "contain" : "cover";

  if (asImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="pointer-events-none absolute inset-0 size-full"
        style={{ objectFit, objectPosition: "center" }}
        onError={() => setForceImage(false)}
      />
    );
  }

  return (
    <video
      key={url}
      src={url}
      className="pointer-events-none absolute inset-0 size-full"
      style={{ objectFit, objectPosition: "center" }}
      autoPlay
      muted
      loop
      playsInline
      onError={() => setForceImage(true)}
    />
  );
}

/**
 * Shared media slide container — Background and Smart Container.
 */
export function MediaSlideContainerView({
  width,
  height,
  slides,
  controls,
  clockMs = 0,
  isPlaying = false,
  className,
  base = null,
  emptyLabel = "Media Container",
  onBrowseMedia,
  dataLayer = "media_slide_container",
}: MediaSlideContainerViewProps) {
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const [editIndex, setEditIndex] = useState(controls.slideIndex);

  useEffect(() => {
    setEditIndex(controls.slideIndex);
  }, [controls.slideIndex, slides.join("|")]);

  useEffect(() => {
    if (isPlaying) return;
    if (!controls.autoplay || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setEditIndex((index) => (index + 1) % slides.length);
    }, controls.intervalMs);
    return () => window.clearInterval(timer);
  }, [controls.autoplay, controls.intervalMs, isPlaying, slides.length]);

  const activeIndex =
    isPlaying && slides.length > 1
      ? Math.floor(Math.max(0, clockMs) / controls.intervalMs) % slides.length
      : Math.min(editIndex, Math.max(0, slides.length - 1));

  const activeUrl = slides[activeIndex] ?? null;

  useEffect(() => {
    if (!activeUrl || controls.transitionMs <= 0) return;
    const el = mediaRef.current;
    if (!el) return;

    const keyframes: Keyframe[] | null =
      controls.transitionStyle === "fade"
        ? [{ opacity: 0.12 }, { opacity: 1 }]
        : controls.transitionStyle === "slide"
          ? [
              { opacity: 0.35, transform: "translateX(28px)" },
              { opacity: 1, transform: "translateX(0)" },
            ]
          : null;

    if (!keyframes) return;
    const animation = el.animate(keyframes, {
      duration: controls.transitionMs,
      easing: "ease-out",
      fill: "both",
    });
    return () => animation.cancel();
  }, [activeIndex, activeUrl, controls.transitionMs, controls.transitionStyle]);

  return (
    <div
      className={className ?? "absolute inset-0 overflow-hidden"}
      data-layer={dataLayer}
      data-slide-count={slides.length}
      data-slide-index={activeIndex}
      style={{ width, height }}
      aria-hidden={!onBrowseMedia}
    >
      {base}

      {activeUrl ? (
        <div ref={mediaRef} className="pointer-events-none absolute inset-0">
          <SlideMedia url={activeUrl} fit={controls.fit} />
        </div>
      ) : null}

      {!activeUrl && onBrowseMedia ? (
        <div className="absolute inset-0 z-[4] flex flex-col items-center justify-center gap-2 bg-black/25">
          <p className="text-[13px] font-medium tracking-wide text-white/70">
            {emptyLabel}
          </p>
          <button
            type="button"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/45 px-4 py-2 text-[14px] font-medium text-white/90 backdrop-blur-sm hover:bg-black/60"
            onClick={(event) => {
              event.stopPropagation();
              onBrowseMedia();
            }}
          >
            Add Image or Video
          </button>
        </div>
      ) : null}

      {activeUrl && slides.length > 1 ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[5] flex -translate-x-1/2 gap-1.5">
          {slides.map((_, index) => (
            <span
              key={index}
              className="size-1.5 rounded-full"
              style={{
                background:
                  index === activeIndex
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
