"use client";

import { Scissors } from "lucide-react";
import { useEffect, useRef } from "react";

import { extractYouTubeVideoId } from "@/features/asset-clip-editor/lib/timecode";

type AssetClipPreviewProps = {
  sourceUrl: string | null;
  currentMs: number;
  playing: boolean;
  /** Incremented on user seek (scrub / jump) so the player re-syncs to playhead. */
  seekEpoch: number;
  inMs: number;
  outMs: number;
  loopSelection: boolean;
  onTimeUpdate: (ms: number) => void;
  onDuration: (ms: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onEndedSelection?: () => void;
};

function clampSeekSeconds(video: HTMLVideoElement, ms: number): number {
  const targetSec = Math.max(0, ms / 1000);
  if (Number.isFinite(video.duration) && video.duration > 0) {
    return Math.min(targetSec, Math.max(0, video.duration - 0.05));
  }
  return targetSec;
}

/** Wait until the element is at (or near) targetSec, then resolve. */
function seekAndWait(
  video: HTMLVideoElement,
  targetSec: number,
): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - targetSec) < 0.04) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", finish);
      window.clearTimeout(fallback);
      resolve();
    };

    video.addEventListener("seeked", finish);
    try {
      video.currentTime = targetSec;
    } catch {
      finish();
      return;
    }

    // Some CDNs don't fire seeked reliably — don't hang play forever.
    const fallback = window.setTimeout(finish, 400);
  });
}

/**
 * HTML5 preview with scrub-to-playhead and play-from-playhead.
 * YouTube uses a chrome-less embed keyed to playhead + play state.
 */
export function AssetClipPreview({
  sourceUrl,
  currentMs,
  playing,
  seekEpoch,
  inMs,
  outMs,
  loopSelection,
  onTimeUpdate,
  onDuration,
  onPlayingChange,
  onEndedSelection,
}: AssetClipPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeId = sourceUrl ? extractYouTubeVideoId(sourceUrl) : null;
  const suppressTimeUpdateRef = useRef(false);
  const currentMsRef = useRef(currentMs);
  const playingRef = useRef(playing);
  const playSessionRef = useRef(0);
  currentMsRef.current = currentMs;
  playingRef.current = playing;

  // User-initiated seek — update the displayed frame, and resume if already playing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || youtubeId || seekEpoch === 0) return;

    const session = ++playSessionRef.current;
    let cancelled = false;

    void (async () => {
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          video.addEventListener("loadedmetadata", () => resolve(), {
            once: true,
          });
        });
      }
      if (cancelled || session !== playSessionRef.current) return;

      const targetSec = clampSeekSeconds(video, currentMsRef.current);
      video.pause();
      suppressTimeUpdateRef.current = true;
      await seekAndWait(video, targetSec);
      if (cancelled || session !== playSessionRef.current) return;
      suppressTimeUpdateRef.current = false;

      if (playingRef.current) {
        try {
          await video.play();
        } catch {
          if (!cancelled && session === playSessionRef.current) {
            onPlayingChange(false);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seekEpoch, youtubeId, sourceUrl, onPlayingChange]);

  // Play / pause — always seek to the timeline playhead BEFORE starting.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || youtubeId) return;

    if (!playing) {
      video.pause();
      return;
    }

    const session = ++playSessionRef.current;
    let cancelled = false;

    void (async () => {
      // Ensure metadata exists so duration clamping works.
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          video.addEventListener("loadedmetadata", () => resolve(), {
            once: true,
          });
          try {
            video.load();
          } catch {
            resolve();
          }
        });
      }
      if (cancelled || session !== playSessionRef.current) return;

      const playheadMs = currentMsRef.current;
      const targetSec = clampSeekSeconds(video, playheadMs);

      video.pause();
      suppressTimeUpdateRef.current = true;
      await seekAndWait(video, targetSec);
      if (cancelled || session !== playSessionRef.current) return;

      // Re-assert once more if the element drifted (common with signed URLs).
      if (Math.abs(video.currentTime - targetSec) > 0.15) {
        await seekAndWait(video, targetSec);
      }
      if (cancelled || session !== playSessionRef.current) return;

      suppressTimeUpdateRef.current = false;
      try {
        await video.play();
      } catch {
        if (!cancelled && session === playSessionRef.current) {
          onPlayingChange(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playing, youtubeId, sourceUrl, onPlayingChange]);

  if (!sourceUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-zinc-950 text-zinc-400">
        <Scissors className="size-10 opacity-50" />
        <p className="text-sm">Select or import a video source to preview</p>
      </div>
    );
  }

  if (youtubeId) {
    const at = Math.max(0, Math.floor(currentMs / 1000));
    const end = Math.max(at + 1, Math.floor(outMs / 1000));
    // Chrome-less embed: no controls, related, annotations, fullscreen, or keyboard.
    const params = new URLSearchParams({
      start: String(at),
      end: String(end),
      controls: "0",
      modestbranding: "1",
      rel: "0",
      iv_load_policy: "3",
      fs: "0",
      disablekb: "1",
      playsinline: "1",
      cc_load_policy: "0",
      // Deprecated but still honored by some players — hides title bar.
      showinfo: "0",
    });
    if (playing) {
      params.set("autoplay", "1");
      params.set("mute", "0");
    }
    const embed = `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <iframe
          // Remount on playhead second / play state so scrub-while-playing
          // continues from the new point without requiring Play again.
          key={`${youtubeId}-${playing ? "p" : "s"}-${at}`}
          title="YouTube preview"
          src={embed}
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        key={sourceUrl}
        src={sourceUrl}
        className="h-full w-full object-contain"
        playsInline
        preload="auto"
        controls={false}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (Number.isFinite(el.duration) && el.duration > 0) {
            onDuration(Math.round(el.duration * 1000));
          }
          if (!playing) {
            suppressTimeUpdateRef.current = true;
            try {
              el.currentTime = clampSeekSeconds(el, currentMsRef.current);
            } catch {
              suppressTimeUpdateRef.current = false;
            }
          }
        }}
        onSeeked={() => {
          suppressTimeUpdateRef.current = false;
        }}
        onError={() => {
          onPlayingChange(false);
        }}
        onTimeUpdate={(e) => {
          if (suppressTimeUpdateRef.current || !playing) return;
          const el = e.currentTarget;
          const ms = Math.round(el.currentTime * 1000);

          if (ms >= outMs) {
            if (loopSelection) {
              suppressTimeUpdateRef.current = true;
              void seekAndWait(el, clampSeekSeconds(el, inMs)).then(() => {
                suppressTimeUpdateRef.current = false;
                onTimeUpdate(inMs);
                void el.play().catch(() => onPlayingChange(false));
              });
              return;
            }
            el.pause();
            onPlayingChange(false);
            onEndedSelection?.();
            onTimeUpdate(outMs);
            return;
          }

          onTimeUpdate(ms);
        }}
      />
    </div>
  );
}
