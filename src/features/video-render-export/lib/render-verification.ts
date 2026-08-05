/**
 * Client helpers for Render Verification Mode (debug frames + checklist logs).
 */

export async function saveRenderDebugFrame(input: {
  renderId: string;
  label: string;
  canvas: HTMLCanvasElement;
}): Promise<string | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    input.canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88);
  });
  if (!blob) return null;

  const form = new FormData();
  form.append("label", input.label);
  form.append("file", blob, `${input.label}.jpg`);
  const res = await fetch(
    `/api/video-renders/${input.renderId}/debug-frame`,
    { method: "POST", body: form },
  );
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { path?: string } | null;
  return body?.path ?? null;
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

/** 1-based frame indices to dump for visual QA. */
export function debugFrameLabels(
  frameIndex1Based: number,
  totalFrames: number,
): string | null {
  if (frameIndex1Based === 1) return "frame-001";
  if (frameIndex1Based === 30) return "frame-030";
  if (frameIndex1Based === 60) return "frame-060";
  if (frameIndex1Based === 120) return "frame-120";
  if (frameIndex1Based === totalFrames) return "frame-last";
  return null;
}
