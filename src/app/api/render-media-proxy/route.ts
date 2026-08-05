import { NextResponse } from "next/server";

/**
 * Same-origin proxy for render capture media.
 * Drawing remote Storage URLs onto a canvas taints it (breaks captureStream).
 * Fetching via this route yields same-origin responses the canvas can use cleanly
 * after the client materializes them as blob: URLs.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")?.trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      redirect: "follow",
      headers: {
        Accept: "*/*",
      },
      // Fail fast instead of leaving the capture loop hanging on a dead upstream.
      signal: AbortSignal.timeout(60_000),
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    // Buffer rather than pipe the upstream stream through: a streamed response
    // that drops mid-flight surfaces to the browser as an opaque
    // "Failed to fetch", which is exactly what stalled the render capture.
    const buffer = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy failed";
    console.error("[render-media-proxy]", target.toString().slice(0, 120), message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
