import { NextResponse } from "next/server";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { readCachedRenderOutput } from "@/features/video-render-export/lib/local-render-cache";
import { getVideoRender } from "@/features/video-render-export/services/render-job.service";
import { createClient } from "@/shared/lib/supabase/server";

type RouteContext = {
  params: Promise<{ renderId: string }>;
};

/**
 * Stream a locally cached FFmpeg output when Supabase Storage upload was skipped.
 */
export async function GET(request: Request, context: RouteContext) {
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

  const url = new URL(request.url);
  const extHint = url.searchParams.get("ext") ?? undefined;
  const cached = await readCachedRenderOutput(renderId, extHint ?? undefined);
  if (!cached) {
    return NextResponse.json(
      {
        error:
          "Local file is no longer on this machine. Re-run Export to encode again.",
      },
      { status: 404 },
    );
  }

  const mime =
    cached.extension === "webm"
      ? "video/webm"
      : cached.extension === "mov"
        ? "video/quicktime"
        : "video/mp4";
  const filename = `render-${renderId.slice(0, 8)}.${cached.extension}`;

  return new NextResponse(new Uint8Array(cached.buffer), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(cached.buffer.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
