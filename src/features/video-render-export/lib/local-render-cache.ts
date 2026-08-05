import "server-only";

import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const CACHE_DIR = path.join(tmpdir(), "mediaos-render-cache");

export type CachedRenderFile = {
  renderId: string;
  absolutePath: string;
  filename: string;
  mimeType: string;
  extension: string;
  byteLength: number;
};

function safeId(renderId: string): string {
  return renderId.replace(/[^a-zA-Z0-9\-]/g, "");
}

function filePathFor(renderId: string, extension: string): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "") || "mp4";
  return path.join(CACHE_DIR, `${safeId(renderId)}.${safeExt}`);
}

function composedPathFor(renderId: string, extension = "webm"): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "") || "webm";
  return path.join(CACHE_DIR, `${safeId(renderId)}.composed.${safeExt}`);
}

function composedMetaPathFor(renderId: string): string {
  return path.join(CACHE_DIR, `${safeId(renderId)}.composed.json`);
}

export async function cacheRenderOutput(input: {
  renderId: string;
  buffer: Buffer;
  extension: string;
  mimeType: string;
  filename: string;
}): Promise<CachedRenderFile> {
  await mkdir(CACHE_DIR, { recursive: true });
  const absolutePath = filePathFor(input.renderId, input.extension);
  await writeFile(absolutePath, input.buffer);
  return {
    renderId: input.renderId,
    absolutePath,
    filename: input.filename,
    mimeType: input.mimeType,
    extension: input.extension,
    byteLength: input.buffer.byteLength,
  };
}

/** Stage browser-captured composed Motion Scene video for FFmpeg finalize. */
export async function cacheComposedStage(input: {
  renderId: string;
  buffer: Buffer;
  extension?: string;
  mimeType?: string;
  /** Frames pushed by the browser (0 when realtime capture was used). */
  frameCount?: number;
}): Promise<CachedRenderFile> {
  await mkdir(CACHE_DIR, { recursive: true });
  const extension = input.extension?.replace(/^\./, "") || "webm";
  const absolutePath = composedPathFor(input.renderId, extension);
  await writeFile(absolutePath, input.buffer);
  const metaPath = composedMetaPathFor(input.renderId);
  if (input.frameCount && input.frameCount > 0) {
    await writeFile(
      metaPath,
      JSON.stringify({ frameCount: input.frameCount }),
    ).catch(() => undefined);
  } else {
    // A realtime re-capture must not inherit the previous frame count.
    await rm(metaPath, { force: true }).catch(() => undefined);
  }
  return {
    renderId: input.renderId,
    absolutePath,
    filename: `composed-${input.renderId.slice(0, 8)}.${extension}`,
    mimeType: input.mimeType || "video/webm",
    extension,
    byteLength: input.buffer.byteLength,
  };
}

export async function findComposedStage(
  renderId: string,
): Promise<{
  absolutePath: string;
  extension: string;
  frameCount: number;
} | null> {
  for (const ext of ["webm", "mp4", "mov"]) {
    const absolutePath = composedPathFor(renderId, ext);
    try {
      await access(absolutePath);
      let frameCount = 0;
      try {
        const raw = await readFile(composedMetaPathFor(renderId), "utf8");
        const parsed = JSON.parse(raw) as { frameCount?: number };
        if (typeof parsed.frameCount === "number") {
          frameCount = parsed.frameCount;
        }
      } catch {
        /* realtime capture — no sidecar */
      }
      return { absolutePath, extension: ext, frameCount };
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function readCachedRenderOutput(
  renderId: string,
  extensionHint?: string,
): Promise<{ buffer: Buffer; absolutePath: string; extension: string } | null> {
  const candidates = extensionHint
    ? [extensionHint, "mp4", "webm", "mov"]
    : ["mp4", "webm", "mov"];
  const seen = new Set<string>();
  for (const ext of candidates) {
    if (seen.has(ext)) continue;
    seen.add(ext);
    const absolutePath = filePathFor(renderId, ext);
    try {
      const buffer = await readFile(absolutePath);
      if (buffer.byteLength > 0) {
        return { buffer, absolutePath, extension: ext };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function clearCachedRenderOutput(renderId: string): Promise<void> {
  for (const ext of ["mp4", "webm", "mov"]) {
    await rm(filePathFor(renderId, ext), { force: true }).catch(() => undefined);
    await rm(composedPathFor(renderId, ext), { force: true }).catch(
      () => undefined,
    );
  }
  await rm(composedMetaPathFor(renderId), { force: true }).catch(
    () => undefined,
  );
}

export async function clearCachedRenderOutputs(
  renderIds: string[],
): Promise<void> {
  await Promise.all(renderIds.map((id) => clearCachedRenderOutput(id)));
}
