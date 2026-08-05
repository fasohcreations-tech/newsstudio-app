/**
 * FFmpeg Encoder Interface — Render Engine produces frames; FFmpeg only encodes.
 * No Browser Capture. No MediaRecorder in the target architecture.
 *
 * Phase 1 (this module): defines the contract + a browser staging helper that
 * still packs frames into a WebM via canvas.captureStream for the existing
 * Local FFmpeg mux path.
 * Phase 2: pipe RawFramePacket RGBA → ffmpeg rawvideo stdin on the server.
 */

import type { RawFramePacket, RenderEngineLog } from "../types";

export type EncoderAudioTracks = {
  voiceUrl?: string | null;
  musicUrl?: string | null;
};

export type EncodeJobSpec = {
  width: number;
  height: number;
  frameRate: number;
  durationMs: number;
  bitrateKbps: number;
  format: "mp4" | "mov" | "webm";
  audio: EncoderAudioTracks;
};

export type EncodeProgress = {
  ratio: number;
  message?: string;
};

/**
 * Contract every encoder backend must satisfy.
 * Implementations live in the app (Local FFmpeg) or cloud (RenderOS).
 */
export interface FfmpegEncoderInterface {
  readonly id: string;
  encodeFromRawFrames(
    frames: AsyncIterable<RawFramePacket>,
    spec: EncodeJobSpec,
    onProgress?: (p: EncodeProgress) => void,
  ): Promise<{ outputPath?: string; outputBuffer?: ArrayBuffer; frameCount: number }>;
}

/**
 * Browser-side interim: push painted canvases into MediaRecorder.
 * Used only until the server rawvideo pipe is wired. Animation state still
 * comes exclusively from the Frame Scheduler / playheadMs.
 */
export function createCanvasStreamRecorder(opts: {
  canvas: HTMLCanvasElement;
  fps: number;
  onLog?: RenderEngineLog;
}): {
  start: () => void;
  requestFrame: () => void;
  stop: () => Promise<Blob>;
  mimeType: string;
} {
  const stream =
    typeof (opts.canvas as HTMLCanvasElement & {
      captureStream?: (fps: number) => MediaStream;
    }).captureStream === "function"
      ? opts.canvas.captureStream(0)
      : opts.canvas.captureStream(opts.fps);

  const track = stream.getVideoTracks()[0] as
    | (MediaStreamTrack & { requestFrame?: () => void })
    | undefined;

  let mimeType = "video/webm;codecs=vp9";
  if (
    typeof MediaRecorder !== "undefined" &&
    !MediaRecorder.isTypeSupported(mimeType)
  ) {
    mimeType = "video/webm";
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return {
    mimeType,
    start: () => {
      chunks.length = 0;
      recorder.start(250);
      opts.onLog?.(
        track?.requestFrame
          ? "captureStream OK (frame-accurate requestFrame)"
          : `captureStream @ ${opts.fps}fps`,
      );
    },
    requestFrame: () => {
      track?.requestFrame?.();
    },
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
        recorder.onerror = () => reject(new Error("MediaRecorder failed"));
        try {
          recorder.stop();
        } catch (err) {
          reject(err);
        }
      }),
  };
}
