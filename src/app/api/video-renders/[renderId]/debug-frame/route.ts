import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { getVideoRender } from "@/features/video-render-export/services/render-job.service";
import { createClient } from "@/shared/lib/supabase/server";

type RouteContext = {
  params: Promise<{ renderId: string }>;
};

/**
 * Render Verification Mode — save sample capture frames for visual QA.
 * Writes under debug/render/{renderId}/ (gitignored).
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
    const label = String(form.get("label") || "frame").replace(
      /[^a-zA-Z0-9_\-]/g,
      "",
    );
    const extension =
      String(form.get("extension") || "jpg").replace(/[^a-z0-9]/gi, "") === "png"
        ? "png"
        : "jpg";
    const subdir = String(form.get("subdir") || "").replace(
      /[^a-zA-Z0-9_\-]/g,
      "",
    );
    const file = form.get("file");
    if (!(file instanceof Blob) || file.size < 32) {
      return NextResponse.json({ error: "Frame file missing" }, { status: 400 });
    }

    const segments = ["debug", "render", renderId];
    if (subdir) segments.push(subdir);
    const dir = path.join(process.cwd(), ...segments);
    await mkdir(dir, { recursive: true });
    const filename = `${label}.${extension}`;
    const absolutePath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);

    return NextResponse.json({
      ok: true,
      path: `${segments.join("/")}/${filename}`,
      byteLength: buffer.byteLength,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[debug-frame]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
