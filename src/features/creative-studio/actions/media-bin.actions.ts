"use server";

import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { listMediaAssets } from "@/features/media/services/media.service";
import { mapMediaAssetToBinItem } from "@/features/creative-studio/lib/media-bin-mapper";
import type { StudioActionResult } from "@/features/creative-studio/actions/project.actions";
import type { CreativeClipKind } from "@/features/creative-studio/types/creative-studio.types";
import type { MediaFileType } from "@/shared/types/database.types";

export type MediaBinItem = {
  id: string;
  name: string;
  category: string;
  clipKind: CreativeClipKind;
  fileType: MediaFileType;
  durationMs: number | null;
  isStoryAsset: boolean;
};

const listSchema = z.object({
  organizationId: z.string().uuid(),
  storyId: z.string().uuid().optional().nullable(),
  category: z.string().optional(),
  search: z.string().optional(),
});

async function requireStudioContext() {
  const user = await requireAuth("/creative-studio");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  return { supabase, membership, error };
}

export async function listMediaBinAssetsAction(
  raw: z.infer<typeof listSchema>,
): Promise<StudioActionResult<MediaBinItem[]>> {
  const parsed = listSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, membership, error } = await requireStudioContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  if (parsed.data.organizationId !== membership.organization.id) {
    return { success: false, error: "Organization mismatch" };
  }

  const fileType =
    parsed.data.category &&
    ["image", "video", "audio", "pdf", "document"].includes(parsed.data.category)
      ? (parsed.data.category as MediaFileType)
      : undefined;

  const { data, error: listError } = await listMediaAssets(supabase, {
    organizationId: parsed.data.organizationId,
    storyId: parsed.data.category === "story" ? parsed.data.storyId : undefined,
    fileType: fileType ?? "all",
    search: parsed.data.search,
    includeAllFolders: true,
    page: 1,
    pageSize: 120,
  });

  if (!data) {
    return { success: false, error: listError ?? "Failed to load media" };
  }

  let items: MediaBinItem[] = data.assets.map((asset) =>
    mapMediaAssetToBinItem(asset, parsed.data.storyId),
  );

  if (parsed.data.category === "story" && parsed.data.storyId) {
    items = items.filter((item) => item.isStoryAsset);
  } else if (parsed.data.category === "graphic") {
    items = items.filter((item) => item.category === "graphic");
  } else if (parsed.data.category === "document") {
    items = items.filter((item) => item.category === "document");
  } else if (
    parsed.data.category &&
    parsed.data.category !== "all" &&
    parsed.data.category !== "favorites"
  ) {
    items = items.filter((item) => item.category === parsed.data.category);
  }

  return { success: true, data: items };
}
