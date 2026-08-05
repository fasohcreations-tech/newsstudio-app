import { NextResponse } from "next/server";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { cacheComposedStage } from "@/features/video-render-export/lib/local-render-cache";
import { getVideoRender } from "@/features/video-render-export/services/render-job.service";
import { createClient } from "@/shared/lib/supabase/server";

type RouteContext = {
  params: Promise<{ renderId: string }>;
};

/**
 * Accept browser-captured composed Motion Scene video for Local FFmpeg finalize.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { renderId } = await context.params;
    if (!renderId) {
      return NextResponse.json({ error: "Missing render id" }, { status: 400 });
    }

    const user = await requireAuth("/newsroom");
    const supabase = await createClient();
    const { profile } = await getCurrentProfile(supabase, user.id);
    const { membership, error } = await resolveActiveMembership(
      supabase,
      user.id,
      profile?.email ?? user.email ?? "",
      profile?.full_name,
    );
    if (!membership) {
      return NextResponse.json(
        { error: error ?? "Organization required" },
        { status: 401 },
      );
    }

    const job = await getVideoRender(
      supabase,
      membership.organization.id,
      renderId,
    );
    if (job.error || !job.data) {
      return NextResponse.json(
        { error: job.error ?? "Render not found" },
        { status: 404 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob) || file.size < 100) {
      return NextResponse.json(
        {
          error: `Composed video file missing or empty (got ${file instanceof Blob ? file.size : 0} bytes). If this was a large WebM, raise Next body size limits and restart the dev server.`,
        },
        { status: 400 },
      );
    }

    const mimeType = file.type || "video/webm";
    const extension = mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("quicktime")
        ? "mov"
        : "webm";
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawFrameCount = form.get("frameCount");
    const frameCount = Number(
      typeof rawFrameCount === "string" ? rawFrameCount : 0,
    );
    const cached = await cacheComposedStage({
      renderId,
      buffer,
      extension,
      mimeType,
      frameCount: Number.isFinite(frameCount) ? frameCount : 0,
    });

    return NextResponse.json({
      ok: true,
      byteLength: cached.byteLength,
      extension: cached.extension,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stage-composed]", message);
    return NextResponse.json(
      { error: `Stage composed failed: ${message}` },
      { status: 500 },
    );
  }
}
