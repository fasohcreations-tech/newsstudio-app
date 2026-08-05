/**
 * Patch MediaRecorder WebM blobs so players can scrub (Duration / Length).
 * MediaRecorder omits Duration in the EBML header until the file is fixed.
 */

import fixWebmDuration from "webm-duration-fix";

export async function ensureScrubbableVideoBlob(
  blob: Blob,
  _durationMs?: number,
): Promise<Blob> {
  const type = blob.type || "video/webm";
  if (!type.includes("webm")) {
    return blob;
  }
  try {
    // Package API: fixWebmDuration(blob) → seekable WebM with Duration
    const fixed = await fixWebmDuration(blob);
    return fixed instanceof Blob ? fixed : blob;
  } catch {
    return blob;
  }
}
