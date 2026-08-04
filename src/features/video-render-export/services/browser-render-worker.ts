/**
 * Browser render worker — composites Timeline frames and encodes via MediaRecorder.
 * MP4/MOV: records WebM then remuxes/labels container; WebM is native.
 * Architecture allows swapping in HEVC / ProRes encoders later.
 */

import {
  captureThumbnailJpeg,
  drawTimelineFrame,
  preloadPlanMedia,
  type FrameDrawContext,
} from "@/features/video-render-export/lib/compositor";
import type {
  RenderPlan,
  VideoRenderStatus,
} from "@/features/video-render-export/types/render.types";

export type RenderWorkerCallbacks = {
  onStatus: (status: VideoRenderStatus, progress: number, etaMs?: number) => void;
  onLog?: (message: string) => void;
  shouldCancel: () => boolean;
};

export type RenderWorkerResult = {
  blob: Blob;
  mimeType: string;
  extension: string;
  thumbnailBlob: Blob | null;
  durationMs: number;
  codec: string;
};

function pickRecorderMime(format: RenderPlan["format"]): {
  mimeType: string;
  codec: string;
  extension: string;
} {
  if (format === "webm") {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const mimeType of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(mimeType)
      ) {
        return { mimeType, codec: "vp9", extension: "webm" };
      }
    }
    return { mimeType: "video/webm", codec: "vp9", extension: "webm" };
  }

  // Prefer MP4 when the browser can record it (Safari / some Chromium builds)
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

  // Fallback: WebM bitstream (still a publishable file; format preference noted)
  return {
    mimeType: "video/webm;codecs=vp9,opus",
    codec: "vp9",
    extension: format === "webm" ? "webm" : format === "mov" ? "mov" : "mp4",
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export { blobToBase64 };

/**
 * Run a full Timeline render in the browser (background-friendly via callbacks).
 */
export async function runBrowserTimelineRender(
  plan: RenderPlan,
  callbacks: RenderWorkerCallbacks,
): Promise<RenderWorkerResult> {
  const started = performance.now();
  callbacks.onStatus("preparing", 2);

  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const mediaCache = await preloadPlanMedia(plan, (pct) => {
    callbacks.onStatus("preparing", Math.min(12, 2 + pct * 0.1));
  });

  if (callbacks.shouldCancel()) throw new Error("Cancelled");

  const frameCtx: FrameDrawContext = { canvas, ctx, plan, mediaCache };
  const thumbBlob = await captureThumbnailJpeg(
    frameCtx,
    plan.clips[0]?.startMs ?? 0,
  ).catch(() => null);

  callbacks.onStatus("rendering", 15);

  const stream = canvas.captureStream(Math.min(60, Math.max(1, plan.frameRate)));

  // Mix voice onto the recording when available
  let audioCtx: AudioContext | null = null;
  let voiceEl: HTMLAudioElement | null = null;
  try {
    if (plan.voiceUrl) {
      audioCtx = new AudioContext();
      voiceEl = new Audio(plan.voiceUrl);
      voiceEl.crossOrigin = "anonymous";
      await voiceEl.play().catch(() => undefined);
      voiceEl.pause();
      voiceEl.currentTime = 0;
      const source = audioCtx.createMediaElementSource(voiceEl);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      for (const track of dest.stream.getAudioTracks()) {
        stream.addTrack(track);
      }
    }
  } catch {
    callbacks.onLog?.("Voice mix unavailable; exporting video only.");
  }

  const pick = pickRecorderMime(plan.format);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: pick.mimeType,
    videoBitsPerSecond: plan.bitrateKbps * 1000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(250);
  if (voiceEl) {
    void voiceEl.play().catch(() => undefined);
  }

  const frameDuration = 1000 / plan.frameRate;
  const totalFrames = Math.max(1, Math.ceil(plan.durationMs / frameDuration));

  for (let i = 0; i < totalFrames; i += 1) {
    if (callbacks.shouldCancel()) {
      recorder.stop();
      voiceEl?.pause();
      await stopped;
      throw new Error("Cancelled");
    }

    const timeMs = Math.min(plan.durationMs, i * frameDuration);
    drawTimelineFrame(frameCtx, timeMs);

    // Yield to the browser so captureStream encodes the frame
    await new Promise((r) => setTimeout(r, Math.max(1, frameDuration * 0.85)));

    const progress = 15 + (i / totalFrames) * 70;
    const elapsed = performance.now() - started;
    const rate = progress > 15 ? elapsed / (progress - 15) : 0;
    const eta = rate > 0 ? Math.round(rate * (100 - progress)) : undefined;
    if (i % 5 === 0) {
      callbacks.onStatus("rendering", Math.min(85, progress), eta);
    }
  }

  callbacks.onStatus("encoding", 88);
  recorder.stop();
  voiceEl?.pause();
  await stopped;
  audioCtx?.close().catch(() => undefined);

  const blob = new Blob(chunks, { type: pick.mimeType });
  if (blob.size < 100) {
    throw new Error("Encoder produced an empty file");
  }

  callbacks.onStatus("uploading", 92);
  return {
    blob,
    mimeType: pick.mimeType.split(";")[0] || "video/webm",
    extension: pick.extension,
    thumbnailBlob: thumbBlob,
    durationMs: plan.durationMs,
    codec: pick.codec,
  };
}
