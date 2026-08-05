/**
 * Browser Timeline render worker.
 * - Paints composed Scene Instances via capture host (StoryLivePreview)
 * - Mixes voice silently into the recording (never through speakers)
 * - Patches WebM duration so downloaded files can scrub
 */

import { ensureScrubbableVideoBlob } from "@/features/video-render-export/lib/ensure-scrubbable-blob";
import {
  debugFrameLabels,
  logVerify,
  saveRenderDebugFrame,
} from "@/features/video-render-export/lib/render-verification";
import type {
  RenderPlan,
  VideoRenderStatus,
} from "@/features/video-render-export/types/render.types";

export type RenderCaptureBridge = {
  warmUp: (plan: RenderPlan) => Promise<void>;
  paintFrame: (timeMs: number, dest: HTMLCanvasElement) => Promise<void>;
  /** Optional Stage-5 readiness gate (fonts, media, plan video). */
  verifyReadiness?: (plan: RenderPlan) => Promise<void>;
};

export type RenderWorkerCallbacks = {
  onStatus: (status: VideoRenderStatus, progress: number, etaMs?: number) => void;
  onLog?: (message: string) => void;
  shouldCancel: () => boolean;
  capture: RenderCaptureBridge;
  /**
   * When true, paint composed Motion Scenes only (no voice mix).
   * Used by Local FFmpeg hybrid: browser captures graphics, FFmpeg muxes VO.
   */
  videoOnly?: boolean;
  /** Render Verification Mode — dump sample frames to debug/render/{id}/ */
  verification?: {
    renderId: string;
    enabled?: boolean;
  };
};

export type RenderWorkerResult = {
  blob: Blob;
  mimeType: string;
  extension: string;
  thumbnailBlob: Blob | null;
  durationMs: number;
  codec: string;
  /**
   * Frames pushed into the recorder. MediaRecorder timestamps are wall-clock,
   * so FFmpeg re-times by frame index using this count.
   */
  frameCount: number;
};

/** Lean capture rate so progress keeps moving on heavy Motion Scenes. */
const BROWSER_CAPTURE_FPS_CAP = 6;

function pickRecorderMime(format: RenderPlan["format"]): {
  mimeType: string;
  codec: string;
  extension: string;
} {
  const webmCandidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const mimeType of webmCandidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(mimeType)
    ) {
      return { mimeType, codec: "vp9", extension: "webm" };
    }
  }

  if (format === "mp4" || format === "mov") {
    const mp4Candidates = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
    ];
    for (const mimeType of mp4Candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(mimeType)
      ) {
        return {
          mimeType,
          codec: "h264",
          extension: format === "mov" ? "mov" : "mp4",
        };
      }
    }
  }

  return { mimeType: "video/webm", codec: "vp9", extension: "webm" };
}

function pausePageMediaExcept(keep: HTMLMediaElement | null) {
  document.querySelectorAll("audio, video").forEach((node) => {
    const el = node as HTMLMediaElement;
    if (keep && el === keep) return;
    try {
      el.pause();
    } catch {
      /* ignore */
    }
  });
}

async function attachSilentVoiceMix(
  stream: MediaStream,
  voiceUrl: string,
  onLog?: (message: string) => void,
): Promise<{
  audioCtx: AudioContext;
  voiceEl: HTMLAudioElement;
} | null> {
  const audioCtx = new AudioContext();
  const voiceEl = new Audio();
  voiceEl.crossOrigin = "anonymous";
  voiceEl.preload = "auto";
  voiceEl.src = voiceUrl;
  voiceEl.muted = false;
  voiceEl.volume = 1;

  try {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error("Voice failed to load"));
      };
      const cleanup = () => {
        voiceEl.removeEventListener("canplaythrough", onReady);
        voiceEl.removeEventListener("error", onErr);
      };
      voiceEl.addEventListener("canplaythrough", onReady);
      voiceEl.addEventListener("error", onErr);
      voiceEl.load();
    });
  } catch {
    await audioCtx.close().catch(() => undefined);
    onLog?.("Voice mix unavailable; exporting video only.");
    return null;
  }

  const source = audioCtx.createMediaElementSource(voiceEl);
  const dest = audioCtx.createMediaStreamDestination();
  const gain = audioCtx.createGain();
  gain.gain.value = 1;
  source.connect(gain);
  gain.connect(dest);

  for (const track of dest.stream.getAudioTracks()) {
    stream.addTrack(track);
  }

  return { audioCtx, voiceEl };
}

/**
 * Run a full Timeline render in the browser.
 */
export async function runBrowserTimelineRender(
  plan: RenderPlan,
  callbacks: RenderWorkerCallbacks,
): Promise<RenderWorkerResult> {
  const started = performance.now();
  callbacks.onStatus("preparing", 2);

  pausePageMediaExcept(null);

  callbacks.onLog?.("── Stage 5–6: Media sync + Browser Capture");
  await callbacks.capture.warmUp(plan);
  if (callbacks.shouldCancel()) throw new Error("Cancelled");

  if (callbacks.capture.verifyReadiness) {
    await callbacks.capture.verifyReadiness(plan);
  } else {
    logVerify(callbacks.onLog, true, "Readiness gate", "warm-up only (no verifyReadiness)");
  }

  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
      logVerify(callbacks.onLog, true, "Fonts Loaded");
    } catch {
      logVerify(callbacks.onLog, false, "Fonts Loaded", "document.fonts.ready failed");
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D unavailable");

  callbacks.onStatus("preparing", 8);
  await callbacks.capture.paintFrame(plan.clips[0]?.startMs ?? 0, canvas);

  try {
    ctx.getImageData(0, 0, 1, 1);
    logVerify(callbacks.onLog, true, "Capture canvas origin-clean");
  } catch {
    throw new Error(
      "Canvas is not origin-clean after first paint. Cross-origin media must be rematerialized via /api/render-media-proxy.",
    );
  }

  let thumbnailBlob: Blob | null = null;
  try {
    thumbnailBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
    });
  } catch {
    thumbnailBlob = null;
  }

  callbacks.onStatus("rendering", 12);
  logVerify(callbacks.onLog, true, "Capture Started");

  const verificationOn = Boolean(callbacks.verification?.enabled !== false);
  const renderId = callbacks.verification?.renderId;

  const requestedFps = Math.round(plan.frameRate) || 30;
  const fps = Math.min(
    BROWSER_CAPTURE_FPS_CAP,
    Math.max(6, Math.min(requestedFps, BROWSER_CAPTURE_FPS_CAP)),
  );
  if (fps < requestedFps) {
    callbacks.onLog?.(
      `Composed capture uses ${fps}fps (requested ${requestedFps}) for speed.`,
    );
  }

  // Manual frame clocking: captureStream(0) emits exactly one frame per
  // requestFrame(), so slow painting cannot stretch or drop scene time.
  let stream: MediaStream;
  let manualTrack: CanvasCaptureMediaStreamTrack | null = null;
  try {
    stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as
      | CanvasCaptureMediaStreamTrack
      | undefined;
    // Voice mixing needs a realtime stream; the hybrid path is videoOnly.
    if (
      callbacks.videoOnly &&
      track &&
      typeof track.requestFrame === "function"
    ) {
      manualTrack = track;
    } else {
      stream.getTracks().forEach((t) => t.stop());
      stream = canvas.captureStream(fps);
    }
  } catch {
    try {
      stream = canvas.captureStream(fps);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      callbacks.onLog?.(`captureStream failed: ${detail}`);
      throw new Error(
        `Canvas captureStream failed (usually CORS / origin-clean): ${detail}`,
      );
    }
  }
  callbacks.onLog?.(
    manualTrack
      ? "captureStream OK (frame-accurate requestFrame) — MediaRecorder starting."
      : "captureStream OK (realtime fallback) — MediaRecorder starting.",
  );

  let audioCtx: AudioContext | null = null;
  let voiceEl: HTMLAudioElement | null = null;

  const videoOnly = Boolean(callbacks.videoOnly);
  if (!videoOnly && plan.voiceUrl) {
    const mix = await attachSilentVoiceMix(
      stream,
      plan.voiceUrl,
      callbacks.onLog,
    );
    if (mix) {
      audioCtx = mix.audioCtx;
      voiceEl = mix.voiceEl;
    }
  } else if (videoOnly) {
    callbacks.onLog?.(
      "Capturing composed scenes (video only) — voice will be mixed by FFmpeg.",
    );
  }

  const pick = pickRecorderMime(plan.format);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: pick.mimeType,
    videoBitsPerSecond: plan.bitrateKbps * 1000,
    audioBitsPerSecond: voiceEl ? 128_000 : undefined,
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);

  if (voiceEl && audioCtx) {
    try {
      if (audioCtx.state === "suspended") await audioCtx.resume();
      voiceEl.currentTime = 0;
      await voiceEl.play();
    } catch {
      callbacks.onLog?.("Voice play() blocked; continuing video-only.");
    }
  }

  const frameDuration = 1000 / fps;
  const totalFrames = Math.max(1, Math.ceil(plan.durationMs / frameDuration));
  let emittedFrames = 0;
  callbacks.onLog?.(
    `Encoding ${totalFrames} frames (~${(plan.durationMs / 1000).toFixed(1)}s @ ${fps}fps)…`,
  );

  for (let i = 0; i < totalFrames; i += 1) {
    if (callbacks.shouldCancel()) {
      recorder.stop();
      voiceEl?.pause();
      await stopped;
      throw new Error("Cancelled");
    }

    // Heartbeat, then yield so React can paint progress before heavy work.
    const preProgress = 12 + (i / totalFrames) * 72;
    callbacks.onStatus("rendering", Math.min(84, preProgress));
    await new Promise((r) => setTimeout(r, 0));

    const frameStarted = performance.now();
    const timeMs = Math.min(plan.durationMs - 1, Math.round(i * frameDuration));
    await callbacks.capture.paintFrame(timeMs, canvas);

    if (manualTrack) {
      manualTrack.requestFrame();
      emittedFrames += 1;
    }

    if (verificationOn && renderId) {
      const label = debugFrameLabels(i + 1, totalFrames);
      if (label) {
        const saved = await saveRenderDebugFrame({
          renderId,
          label,
          canvas,
        });
        logVerify(
          callbacks.onLog,
          Boolean(saved),
          `Debug frame ${label}`,
          saved ?? "save failed",
        );
      }
    }

    if (voiceEl && Number.isFinite(voiceEl.duration) && voiceEl.duration > 0) {
      const target = Math.min(timeMs / 1000, Math.max(0, voiceEl.duration - 0.05));
      if (Math.abs(voiceEl.currentTime - target) > 0.4) {
        try {
          voiceEl.currentTime = target;
        } catch {
          /* ignore seek race */
        }
      }
      if (voiceEl.paused) {
        void voiceEl.play().catch(() => undefined);
      }
    }

    if (manualTrack) {
      // Frame-indexed output — no need to burn wall-clock matching realtime.
      await new Promise((r) => setTimeout(r, 0));
    } else {
      // Only pace if paint was faster than the frame slot — never add extra lag.
      const paintedMs = performance.now() - frameStarted;
      const remain = frameDuration - paintedMs;
      if (remain > 4) {
        await new Promise((r) => setTimeout(r, Math.min(remain, frameDuration)));
      } else {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // Progress every frame so the UI does not look stuck near 12–13%.
    const progress = 12 + ((i + 1) / totalFrames) * 72;
    const elapsed = performance.now() - started;
    const framesDone = i + 1;
    const msPerFrame = elapsed / Math.max(1, framesDone);
    const eta = Math.round(msPerFrame * (totalFrames - framesDone));
    callbacks.onStatus("rendering", Math.min(84, progress), eta);
  }

  callbacks.onStatus("encoding", 88);
  if (voiceEl) {
    voiceEl.pause();
  }
  recorder.stop();
  await stopped;
  await audioCtx?.close().catch(() => undefined);
  logVerify(
    callbacks.onLog,
    true,
    "Animation Completed",
    "all capture frames driven from timeline playhead",
  );
  logVerify(
    callbacks.onLog,
    true,
    "Capture Completed",
    manualTrack
      ? `${emittedFrames} frame(s) — FFmpeg re-times to ${(plan.durationMs / 1000).toFixed(1)}s`
      : "realtime capture",
  );

  const recordedType = recorder.mimeType || pick.mimeType;
  let blob = new Blob(chunks, {
    type: recordedType.includes("webm") ? "video/webm" : recordedType,
  });
  if (blob.size < 100) {
    throw new Error("Encoder produced an empty file");
  }

  if (blob.type.includes("webm") || recordedType.includes("webm")) {
    blob = await ensureScrubbableVideoBlob(blob, plan.durationMs);
    if (!blob.type.includes("webm")) {
      blob = new Blob([blob], { type: "video/webm" });
    }
  }

  const extension =
    blob.type.includes("webm") || recordedType.includes("webm")
      ? "webm"
      : pick.extension;

  callbacks.onStatus("encoding", 90);
  return {
    blob,
    mimeType: blob.type.split(";")[0] || "video/webm",
    extension,
    thumbnailBlob,
    durationMs: plan.durationMs,
    codec: extension === "webm" ? "vp9" : pick.codec,
    frameCount: manualTrack ? emittedFrames : 0,
  };
}
