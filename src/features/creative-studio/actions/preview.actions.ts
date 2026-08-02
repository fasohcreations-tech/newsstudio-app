"use server";

import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createSignedAssetUrl } from "@/features/media/services/media.service";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import type { MediaFileType } from "@/shared/types/database.types";
import type { StudioActionResult } from "@/features/creative-studio/actions/project.actions";

export type PreviewMediaSource = {
  assetId: string;
  name: string;
  fileType: MediaFileType;
  mimeType: string;
  url: string;
};

const schema = z.object({
  assetIds: z.array(z.string().uuid()).max(64),
});

export async function getPreviewMediaUrlsAction(
  raw: z.infer<typeof schema>,
): Promise<StudioActionResult<PreviewMediaSource[]>> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  if (parsed.data.assetIds.length === 0) {
    return { success: true, data: [] };
  }

  const user = await requireAuth("/creative-studio");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const { data: assets, error: fetchError } = await supabase
    .from("media_assets")
    .select(
      "id, name, file_type, mime_type, storage_bucket, storage_path, organization_id",
    )
    .in("id", parsed.data.assetIds)
    .is("deleted_at", null);

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const sources: PreviewMediaSource[] = [];

  for (const asset of assets ?? []) {
    if (asset.organization_id !== membership.organization.id) continue;

    const { url, error: signError } = await createSignedAssetUrl(
      supabase,
      asset.storage_bucket,
      asset.storage_path,
      3600,
    );

    if (!url || signError) continue;

    sources.push({
      assetId: asset.id,
      name: asset.name,
      fileType: asset.file_type,
      mimeType: asset.mime_type,
      url,
    });
  }

  return { success: true, data: sources };
}
