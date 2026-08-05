/**
 * Client helpers for Render Verification Mode (debug frames + checklist logs).
 */

export async function saveRenderDebugFrame(input: {
  renderId: string;
  label: string;
  canvas: HTMLCanvasElement;
  /** Frame Debug mode writes lossless PNG into a `frames/` subfolder. */
  format?: "jpeg" | "png";
  subdir?: string;
}): Promise<string | null> {
  const png = input.format === "png";
  const blob = await new Promise<Blob | null>((resolve) => {
    if (png) {
      input.canvas.toBlob((b) => resolve(b), "image/png");
    } else {
      input.canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88);
    }
  });
  if (!blob) return null;

  const extension = png ? "png" : "jpg";
  const form = new FormData();
  form.append("label", input.label);
  form.append("extension", extension);
  if (input.subdir) form.append("subdir", input.subdir);
  form.append("file", blob, `${input.label}.${extension}`);
  const res = await fetch(
    `/api/video-renders/${input.renderId}/debug-frame`,
    { method: "POST", body: form },
  );
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { path?: string } | null;
  return body?.path ?? null;
}

/** Frame Debug mode filename — frame0001.png, frame0002.png, … */
export function frameDebugLabel(frameIndex1Based: number): string {
  return `frame${String(frameIndex1Based).padStart(4, "0")}`;
}

export function logVerify(
  onLog: ((message: string) => void) | undefined,
  ok: boolean,
  label: string,
  detail?: string,
) {
  const mark = ok ? "✓" : "✗";
  onLog?.(
    detail ? `${mark} ${label} — ${detail}` : `${mark} ${label}`,
  );
}

/**
 * 1-based frame indices to dump for visual QA. Samples are spread across the
 * whole Timeline — fixed low indices all landed inside the first scene once
 * capture ran at the export frame rate.
 */
export function debugFrameLabels(
  frameIndex1Based: number,
  totalFrames: number,
): string | null {
  if (frameIndex1Based === 1) return "frame-001";
  if (frameIndex1Based === totalFrames) return "frame-last";
  const marks = [0.1, 0.25, 0.5, 0.75, 0.9];
  for (const mark of marks) {
    const at = Math.max(2, Math.round(totalFrames * mark));
    if (frameIndex1Based === at) {
      return `frame-${String(Math.round(mark * 100)).padStart(3, "0")}pct`;
    }
  }
  return null;
}
