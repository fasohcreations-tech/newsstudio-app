import "server-only";

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { RenderServerEnv } from "@/features/video-render-export/lib/render-env";
import {
  parseFfmpegProgress,
  runProcess,
} from "@/features/video-render-export/lib/ffmpeg-process";
import { findComposedStage } from "@/features/video-render-export/lib/local-render-cache";
import type { IRenderProvider } from "@/features/video-render-export/providers/irender-provider";
import type { RenderPlanClip } from "@/features/video-render-export/types/render.types";
import type {
  RenderProviderAvailability,
  RenderProviderCallbacks,
  RenderProviderJob,
  RenderProviderResult,
} from "@/features/video-render-export/types/render-provider.types";

type VideoEncoder = {
  codec: string;
  /** Extra args after -c:v (e.g. -preset, -cq) */
  args: string[];
  label: string;
};

/** Process-wide so each Export doesn't re-probe NVENC/QSV. */
let cachedH264Encoder: VideoEncoder | null = null;
let cachedAvailability: RenderProviderAvailability | null = null;

const SOFTWARE_H264: VideoEncoder = {
  codec: "libx264",
  args: ["-preset", "ultrafast"],
  label: "libx264",
};

function isHardwareH264(codec: string): boolean {
  return codec === "h264_nvenc" || codec === "h264_qsv" || codec === "h264_amf";
}

type PreparedClip = {
  clip: RenderPlanClip;
  localMedia: string | null;
  kind: "video" | "image" | "color";
};

function extensionFor(format: RenderProviderJob["format"]): {
  extension: string;
  mimeType: string;
  codec: string;
} {
  if (format === "webm") {
    return { extension: "webm", mimeType: "video/webm", codec: "vp9" };
  }
  if (format === "mov") {
    return { extension: "mov", mimeType: "video/quicktime", codec: "h264" };
  }
  return { extension: "mp4", mimeType: "video/mp4", codec: "h264" };
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download media (${res.status}): ${url.slice(0, 80)}`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
}

/**
 * LocalFFmpegProvider — single-pass encode with parallel media fetch.
 */
export class LocalFFmpegProvider implements IRenderProvider {
  readonly id = "local" as const;
  readonly displayName = "Local FFmpeg";

  constructor(private readonly env: RenderServerEnv) {}

  async isAvailable(): Promise<RenderProviderAvailability> {
    if (cachedAvailability) return cachedAvailability;
    try {
      const ffmpeg = await runProcess({
        bin: this.env.FFMPEG_PATH,
        args: ["-hide_banner", "-version"],
      });
      if (ffmpeg.code !== 0) {
        cachedAvailability = {
          ok: false,
          message: `FFmpeg at FFMPEG_PATH ("${this.env.FFMPEG_PATH}") failed (-version).`,
        };
        return cachedAvailability;
      }
      const ffprobe = await runProcess({
        bin: this.env.FFPROBE_PATH,
        args: ["-hide_banner", "-version"],
      });
      if (ffprobe.code !== 0) {
        cachedAvailability = {
          ok: false,
          message: `FFprobe at FFPROBE_PATH ("${this.env.FFPROBE_PATH}") failed (-version).`,
        };
        return cachedAvailability;
      }
      cachedAvailability = {
        ok: true,
        message: `Local FFmpeg ready (${this.env.FFMPEG_PATH})`,
      };
      return cachedAvailability;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      cachedAvailability = {
        ok: false,
        message: `Local FFmpeg is not available. Set FFMPEG_PATH / FFPROBE_PATH. ${detail}`,
      };
      return cachedAvailability;
    }
  }

  async render(
    job: RenderProviderJob,
    callbacks: RenderProviderCallbacks,
  ): Promise<RenderProviderResult> {
    const avail = await this.isAvailable();
    if (!avail.ok) throw new Error(avail.message);

    const started = Date.now();
    const { plan } = job;
    const pack = extensionFor(job.format);
    const workDir = await mkdtemp(path.join(tmpdir(), "mediaos-render-"));

    try {
      // Prefer browser-staged composed Motion Scene video (assembled timeline look).
      const composed = await findComposedStage(job.renderId);
      if (composed) {
        await callbacks.onProgress({
          status: "preparing",
          progress: 10,
          message: "Using composed scene capture — FFmpeg finalize",
        });

        let voicePath: string | null = null;
        if (plan.voiceUrl) {
          voicePath = path.join(workDir, "voice-input");
          await downloadToFile(plan.voiceUrl, voicePath);
        }

        const outputPath = path.join(workDir, `output.${pack.extension}`);
        await this.encodeComposedWithVoice({
          composedPath: composed.absolutePath,
          composedFrameCount: composed.frameCount,
          voicePath,
          outputPath,
          job,
          pack,
          callbacks,
          started,
        });

        const outputBuffer = await readFile(outputPath);
        if (outputBuffer.byteLength < 100) {
          throw new Error("FFmpeg produced an empty file");
        }
        const thumbnailBuffer = await this.makeThumbnail(outputPath, workDir);
        const durationMs = await this.probeDuration(outputPath, plan.durationMs);
        return {
          mimeType: pack.mimeType,
          extension: pack.extension,
          durationMs,
          fileSizeBytes: outputBuffer.byteLength,
          codec:
            pack.codec === "vp9" ? "vp9" : cachedH264Encoder?.label || "h264",
          outputBuffer,
          thumbnailBuffer,
        };
      }

      await callbacks.onProgress({
        status: "preparing",
        progress: 4,
        message:
          "No composed capture staged — falling back to asset concat (not assembled scenes)",
      });

      if (await callbacks.shouldCancel()) throw new Error("Cancelled");

      const clips = plan.clips;
      if (clips.length === 0) {
        throw new Error("Render plan has no scene clips");
      }

      const prepared = await this.downloadAllMedia(clips, plan.voiceUrl, workDir);
      if (await callbacks.shouldCancel()) throw new Error("Cancelled");

      await callbacks.onProgress({
        status: "preparing",
        progress: 18,
        message: "Building single-pass FFmpeg graph",
      });

      const outputPath = path.join(workDir, `output.${pack.extension}`);
      await this.encodeSinglePass({
        prepared: prepared.clips,
        voicePath: prepared.voicePath,
        outputPath,
        job,
        pack,
        callbacks,
        started,
      });

      if (await callbacks.shouldCancel()) throw new Error("Cancelled");

      await callbacks.onProgress({
        status: "encoding",
        progress: 92,
        message: "Finalizing output",
      });

      const outputBuffer = await readFile(outputPath);
      if (outputBuffer.byteLength < 100) {
        throw new Error("FFmpeg produced an empty file");
      }

      const thumbnailBuffer = await this.makeThumbnail(outputPath, workDir);
      const durationMs = await this.probeDuration(outputPath, plan.durationMs);

      return {
        mimeType: pack.mimeType,
        extension: pack.extension,
        durationMs,
        fileSizeBytes: outputBuffer.byteLength,
        codec: pack.codec === "vp9" ? "vp9" : cachedH264Encoder?.label || "h264",
        outputBuffer,
        thumbnailBuffer,
      };
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Fast path: remux/transcode browser-captured composed scenes + mux voiceover.
   * Always software-encode H.264 — QSV/NVENC often fail on MediaRecorder WebM
   * (VP8/VP9) even when a lavfi probe succeeds.
   */
  private async encodeComposedWithVoice(input: {
    composedPath: string;
    /** Browser frame count — 0 when the capture was realtime. */
    composedFrameCount?: number;
    voicePath: string | null;
    outputPath: string;
    job: RenderProviderJob;
    pack: { extension: string; mimeType: string; codec: string };
    callbacks: RenderProviderCallbacks;
    started: number;
  }): Promise<void> {
    const { job, pack, callbacks } = input;
    const durationMs = Math.max(1, job.plan.durationMs);
    const durationSec = (durationMs / 1000).toFixed(3);
    const bitrate = `${Math.max(1000, job.plan.bitrateKbps)}k`;
    const width = Math.max(2, Math.round(job.plan.width / 2) * 2);
    const height = Math.max(2, Math.round(job.plan.height / 2) * 2);
    const fps = Math.max(12, Math.round(job.plan.frameRate) || 24);

    // Soft H.264 for WebM→MP4; scale/fps normalize odd MediaRecorder streams.
    const encoder =
      pack.codec === "vp9"
        ? null
        : SOFTWARE_H264;
    if (encoder) {
      cachedH264Encoder = encoder;
      callbacks.onLog?.(
        `Using video encoder: ${encoder.label} (composed WebM finalize)`,
      );
    }

    const args: string[] = [
      "-y",
      "-hide_banner",
      "-i",
      input.composedPath,
    ];
    if (input.voicePath) {
      args.push("-i", input.voicePath);
    } else {
      args.push(
        "-f",
        "lavfi",
        "-t",
        durationSec,
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=48000",
      );
    }

    // MediaRecorder stamps frames with wall-clock time, so a slow capture
    // produced a long WebM that -t then truncated (only scene 1 survived).
    // When the browser reports its frame count, re-time by frame index so the
    // captured timeline always spans exactly the plan duration.
    const frameCount = Math.max(0, Math.round(input.composedFrameCount ?? 0));
    const retimeFps =
      frameCount > 1 ? frameCount / Math.max(0.2, durationMs / 1000) : 0;
    const retimeFilter =
      retimeFps > 0 ? `setpts=N/(${retimeFps.toFixed(6)}*TB),` : "";
    if (retimeFps > 0) {
      callbacks.onLog?.(
        `Re-timing composed capture: ${frameCount} frames → ${durationSec}s (${retimeFps.toFixed(2)} src fps)`,
      );
    }

    args.push(
      "-vf",
      retimeFilter +
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
        `fps=${fps},setsar=1,format=yuv420p`,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0?",
    );

    if (pack.codec === "vp9") {
      args.push(
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        bitrate,
        "-row-mt",
        "1",
        "-cpu-used",
        "8",
        "-c:a",
        "libopus",
        "-b:a",
        "128k",
      );
    } else {
      args.push(
        "-c:v",
        SOFTWARE_H264.codec,
        ...SOFTWARE_H264.args,
        "-b:v",
        bitrate,
        "-maxrate",
        bitrate,
        "-bufsize",
        `${Math.max(2000, job.plan.bitrateKbps * 2)}k`,
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-b:a",
        "128k",
      );
    }

    args.push(
      "-t",
      durationSec,
      // No -shortest: a short voice track must not truncate the scene timeline.
      "-movflags",
      "+faststart",
      "-progress",
      "pipe:1",
      "-nostats",
      input.outputPath,
    );

    await callbacks.onProgress({
      status: "rendering",
      progress: 55,
      message: "FFmpeg finalize composed scenes + voice",
    });

    let lastProgressEmit = 0;
    const result = await runProcess({
      bin: this.env.FFMPEG_PATH,
      args,
      shouldCancel: callbacks.shouldCancel,
      onStdout: (chunk) => {
        const parsed = parseFfmpegProgress(chunk);
        if (parsed.outTimeMs == null) return;
        const now = Date.now();
        if (now - lastProgressEmit < 400 && !parsed.ended) return;
        lastProgressEmit = now;
        const ratio = Math.min(1, parsed.outTimeMs / durationMs);
        const progress = 55 + ratio * 35;
        const elapsed = now - input.started;
        const eta =
          ratio > 0.02 ? Math.round(elapsed / ratio - elapsed) : undefined;
        void callbacks.onProgress({
          status: "rendering",
          progress: Math.min(90, progress),
          etaMs: eta ?? null,
        });
      },
    });

    if (result.code !== 0) {
      throw new Error(
        `FFmpeg composed finalize failed: ${result.stderr.slice(-900)}`,
      );
    }
  }

  private async downloadAllMedia(
    clips: RenderPlanClip[],
    voiceUrl: string | null,
    workDir: string,
  ): Promise<{ clips: PreparedClip[]; voicePath: string | null }> {
    const tasks: Array<Promise<void>> = [];
    const prepared: PreparedClip[] = clips.map((clip, i) => {
      const sourceUrl = clip.videoUrl || clip.imageUrl;
      if (!sourceUrl) {
        return { clip, localMedia: null, kind: "color" as const };
      }
      const kind = clip.videoUrl ? ("video" as const) : ("image" as const);
      const ext = kind === "video" ? "src.bin" : "src.jpg";
      const localMedia = path.join(
        workDir,
        `clip-${String(i).padStart(3, "0")}-${ext}`,
      );
      tasks.push(downloadToFile(sourceUrl, localMedia));
      return { clip, localMedia, kind };
    });

    let voicePath: string | null = null;
    if (voiceUrl) {
      voicePath = path.join(workDir, "voice-input");
      tasks.push(downloadToFile(voiceUrl, voicePath));
    }

    await Promise.all(tasks);
    return { clips: prepared, voicePath };
  }

  private async resolveH264Encoder(): Promise<VideoEncoder> {
    // Drop QSV if an older build cached it — probes OK, real encodes often fail.
    if (cachedH264Encoder?.codec === "h264_qsv") {
      cachedH264Encoder = null;
    }
    if (cachedH264Encoder) return cachedH264Encoder;

    // Prefer NVENC/AMF when a short probe works. Skip QSV — it often probes OK
    // on lavfi but fails on real inputs ("Function not implemented" / -40).
    const candidates: VideoEncoder[] = [
      {
        codec: "h264_nvenc",
        args: ["-preset", "p4", "-rc", "vbr", "-cq", "23"],
        label: "h264_nvenc",
      },
      {
        codec: "h264_amf",
        args: ["-quality", "speed", "-rc", "vbr_latency"],
        label: "h264_amf",
      },
      SOFTWARE_H264,
    ];

    for (const candidate of candidates) {
      if (candidate.codec === "libx264") {
        cachedH264Encoder = candidate;
        return candidate;
      }
      const probe = await runProcess({
        bin: this.env.FFMPEG_PATH,
        args: [
          "-hide_banner",
          "-f",
          "lavfi",
          "-i",
          "color=c=black:s=64x64:d=0.1",
          "-frames:v",
          "1",
          "-c:v",
          candidate.codec,
          ...candidate.args,
          "-pix_fmt",
          "yuv420p",
          "-f",
          "null",
          "-",
        ],
      });
      if (probe.code === 0) {
        cachedH264Encoder = candidate;
        return candidate;
      }
    }

    cachedH264Encoder = SOFTWARE_H264;
    return cachedH264Encoder;
  }

  /** Drop a bad HW encoder cache entry so the next job uses software. */
  private invalidateHardwareEncoderCache(): void {
    if (cachedH264Encoder && isHardwareH264(cachedH264Encoder.codec)) {
      cachedH264Encoder = SOFTWARE_H264;
    }
  }

  private async encodeSinglePass(input: {
    prepared: PreparedClip[];
    voicePath: string | null;
    outputPath: string;
    job: RenderProviderJob;
    pack: { extension: string; mimeType: string; codec: string };
    callbacks: RenderProviderCallbacks;
    started: number;
  }): Promise<void> {
    const { job, pack, callbacks, prepared } = input;
    const { width, height, frameRate, durationMs, bitrateKbps } = job.plan;
    const fps = Math.max(12, Math.round(frameRate) || 30);
    const bitrate = `${Math.max(1000, bitrateKbps)}k`;
    const durationSec = Math.max(0.2, durationMs / 1000);

    const args: string[] = ["-y", "-hide_banner"];
    const filterParts: string[] = [];
    const concatLabels: string[] = [];

    for (let i = 0; i < prepared.length; i += 1) {
      const item = prepared[i]!;
      const dur = Math.max(0.2, item.clip.durationMs / 1000);

      if (item.kind === "video" && item.localMedia) {
        args.push(
          "-ss",
          String((item.clip.trimInMs ?? 0) / 1000),
          "-t",
          dur.toFixed(3),
          "-i",
          item.localMedia,
        );
      } else if (item.kind === "image" && item.localMedia) {
        args.push("-loop", "1", "-t", dur.toFixed(3), "-i", item.localMedia);
      } else {
        args.push(
          "-f",
          "lavfi",
          "-t",
          dur.toFixed(3),
          "-i",
          `color=c=0x071225:s=${width}x${height}:r=${fps}`,
        );
      }

      const label = `v${i}`;
      filterParts.push(
        `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x071225,` +
          `fps=${fps},setsar=1,format=yuv420p,setpts=PTS-STARTPTS[${label}]`,
      );
      concatLabels.push(`[${label}]`);
    }

    const voiceInputIndex = prepared.length;
    if (input.voicePath) {
      args.push("-i", input.voicePath);
    } else {
      args.push(
        "-f",
        "lavfi",
        "-t",
        durationSec.toFixed(3),
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=48000",
      );
    }

    filterParts.push(
      `${concatLabels.join("")}concat=n=${prepared.length}:v=1:a=0[vout]`,
    );

    args.push("-filter_complex", filterParts.join(";"));
    args.push("-map", "[vout]", "-map", `${voiceInputIndex}:a:0?`);

    if (pack.codec === "vp9") {
      args.push(
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        bitrate,
        "-row-mt",
        "1",
        "-cpu-used",
        "8",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "libopus",
        "-b:a",
        "128k",
      );
    } else {
      const encoder = await this.resolveH264Encoder();
      callbacks.onLog?.(`Using video encoder: ${encoder.label}`);
      args.push("-c:v", encoder.codec, ...encoder.args, "-b:v", bitrate);
      if (encoder.codec === "libx264") {
        args.push(
          "-maxrate",
          bitrate,
          "-bufsize",
          `${Math.max(2000, bitrateKbps * 2)}k`,
        );
      }
      args.push(
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-b:a",
        "128k",
      );
    }

    args.push(
      "-t",
      durationSec.toFixed(3),
      "-movflags",
      "+faststart",
      "-progress",
      "pipe:1",
      "-nostats",
      input.outputPath,
    );

    await callbacks.onProgress({
      status: "rendering",
      progress: 22,
      message: "Encoding (single-pass)",
    });

    const runEncode = async (encodeArgs: string[]) => {
      let lastProgressEmit = 0;
      return runProcess({
        bin: this.env.FFMPEG_PATH,
        args: encodeArgs,
        shouldCancel: callbacks.shouldCancel,
        onStdout: (chunk) => {
          const parsed = parseFfmpegProgress(chunk);
          if (parsed.outTimeMs == null) return;
          const now = Date.now();
          if (now - lastProgressEmit < 400 && !parsed.ended) return;
          lastProgressEmit = now;
          const ratio = Math.min(1, parsed.outTimeMs / Math.max(1, durationMs));
          const progress = 22 + ratio * 68;
          const elapsed = now - input.started;
          const eta =
            ratio > 0.02 ? Math.round(elapsed / ratio - elapsed) : undefined;
          void callbacks.onProgress({
            status: "rendering",
            progress: Math.min(90, progress),
            etaMs: eta ?? null,
          });
        },
      });
    };

    let result = await runEncode(args);
    if (result.code !== 0 && pack.codec !== "vp9") {
      const usedHw =
        args.includes("h264_nvenc") ||
        args.includes("h264_amf") ||
        args.includes("h264_qsv");
      if (usedHw) {
        this.invalidateHardwareEncoderCache();
        callbacks.onLog?.(
          "Hardware encode failed — retrying with libx264…",
        );
        const mapIdx = args.indexOf("-filter_complex");
        const head =
          mapIdx >= 0
            ? args.slice(0, mapIdx + 2)
            : ["-y", "-hide_banner"];
        const softArgs = [
          ...head,
          "-map",
          "[vout]",
          "-map",
          `${voiceInputIndex}:a:0?`,
          "-c:v",
          SOFTWARE_H264.codec,
          ...SOFTWARE_H264.args,
          "-b:v",
          bitrate,
          "-maxrate",
          bitrate,
          "-bufsize",
          `${Math.max(2000, bitrateKbps * 2)}k`,
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-ar",
          "48000",
          "-ac",
          "2",
          "-b:a",
          "128k",
          "-t",
          durationSec.toFixed(3),
          "-movflags",
          "+faststart",
          "-progress",
          "pipe:1",
          "-nostats",
          input.outputPath,
        ];
        result = await runEncode(softArgs);
      }
    }

    if (result.code !== 0) {
      throw new Error(`FFmpeg encode failed: ${result.stderr.slice(-900)}`);
    }
  }

  private async makeThumbnail(
    outputPath: string,
    workDir: string,
  ): Promise<Buffer | null> {
    try {
      const thumbPath = path.join(workDir, "thumb.jpg");
      const thumb = await runProcess({
        bin: this.env.FFMPEG_PATH,
        args: [
          "-y",
          "-hide_banner",
          "-ss",
          "0.2",
          "-i",
          outputPath,
          "-frames:v",
          "1",
          "-q:v",
          "5",
          thumbPath,
        ],
      });
      if (thumb.code === 0) return readFile(thumbPath);
    } catch {
      /* optional */
    }
    return null;
  }

  private async probeDuration(
    outputPath: string,
    fallbackMs: number,
  ): Promise<number> {
    try {
      const probe = await runProcess({
        bin: this.env.FFPROBE_PATH,
        args: [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          outputPath,
        ],
      });
      const seconds = Number(probe.stdout.trim());
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.round(seconds * 1000);
      }
    } catch {
      /* keep plan duration */
    }
    return fallbackMs;
  }
}
