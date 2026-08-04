"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  assetClipCreateSchema,
  assetClipUpdateSchema,
  youtubeImportSchema,
} from "@/features/asset-clip-editor/schemas/clip.schemas";
import {
  captureClipPoster,
  createAssetClip,
  duplicateAssetClip,
  getAssetClipById,
  importYoutubeAsAsset,
  listAssetClips,
  markClipOperation,
  softDeleteAssetClip,
  updateAssetClip,
} from "@/features/asset-clip-editor/services/clip.service";
import type { MediaAssetClipWithParent } from "@/features/asset-clip-editor/types/clip.types";
import { requireAuth } from "@/features/auth/guards/require-auth";
import {
  createSignedAssetUrl,
  listMediaAssets,
} from "@/features/media/services/media.service";
import type { MediaAssetWithMeta } from "@/features/media/types/media.types";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { createClient } from "@/shared/lib/supabase/server";

export type ClipActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireOrgContext(redirectTo = "/media-library/clip-editor") {
  const user = await requireAuth(redirectTo);
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  if (!membership) {
    return {
      user,
      supabase,
      membership: null as null,
      error: error ?? "Organization required",
    };
  }
  return { user, supabase, membership, error: null as string | null };
}

export async function listVideoAssetsForClipEditorAction(): Promise<
  ClipActionResult<MediaAssetWithMeta[]>
> {
  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await listMediaAssets(ctx.supabase, {
    organizationId: ctx.membership.organization.id,
    fileType: "video",
    includeAllFolders: true,
    page: 1,
    pageSize: 100,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Failed to list videos" };
  }
  return { success: true, data: result.data.assets };
}

export async function listAssetClipsAction(
  parentAssetId?: string,
): Promise<ClipActionResult<MediaAssetClipWithParent[]>> {
  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }
  const result = await listAssetClips(
    ctx.supabase,
    ctx.membership.organization.id,
    parentAssetId,
  );
  if (result.error) return { success: false, error: result.error };
  return { success: true, data: result.clips };
}

export async function getAssetClipAction(
  clipId: string,
): Promise<ClipActionResult<MediaAssetClipWithParent>> {
  const parsed = z.string().uuid().safeParse(clipId);
  if (!parsed.success) return { success: false, error: "Invalid clip id" };

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await getAssetClipById(
    ctx.supabase,
    ctx.membership.organization.id,
    parsed.data,
  );
  if (result.error || !result.clip) {
    return { success: false, error: result.error ?? "Not found" };
  }
  return { success: true, data: result.clip };
}

export async function createAssetClipAction(
  raw: unknown,
): Promise<ClipActionResult<MediaAssetClipWithParent>> {
  const parsed = assetClipCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid clip",
    };
  }

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await createAssetClip(
    ctx.supabase,
    ctx.membership.organization.id,
    ctx.user.id,
    parsed.data,
  );
  if (result.error || !result.clip) {
    return { success: false, error: result.error ?? "Create failed" };
  }

  revalidatePath("/media-library");
  revalidatePath("/media-library/clips");
  revalidatePath("/media-library/clip-editor");
  return { success: true, data: result.clip };
}

export async function updateAssetClipAction(
  clipId: string,
  raw: unknown,
): Promise<ClipActionResult<MediaAssetClipWithParent>> {
  const id = z.string().uuid().safeParse(clipId);
  const parsed = assetClipUpdateSchema.safeParse(raw);
  if (!id.success || !parsed.success) {
    return { success: false, error: "Invalid update" };
  }

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await updateAssetClip(
    ctx.supabase,
    ctx.membership.organization.id,
    ctx.user.id,
    id.data,
    parsed.data,
  );
  if (result.error || !result.clip) {
    return { success: false, error: result.error ?? "Update failed" };
  }

  revalidatePath("/media-library/clips");
  revalidatePath("/media-library/clip-editor");
  return { success: true, data: result.clip };
}

export async function duplicateAssetClipAction(
  clipId: string,
): Promise<ClipActionResult<MediaAssetClipWithParent>> {
  const id = z.string().uuid().safeParse(clipId);
  if (!id.success) return { success: false, error: "Invalid clip id" };

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await duplicateAssetClip(
    ctx.supabase,
    ctx.membership.organization.id,
    ctx.user.id,
    id.data,
  );
  if (result.error || !result.clip) {
    return { success: false, error: result.error ?? "Duplicate failed" };
  }
  revalidatePath("/media-library/clips");
  return { success: true, data: result.clip };
}

export async function deleteAssetClipAction(
  clipId: string,
): Promise<ClipActionResult<{ id: string }>> {
  const id = z.string().uuid().safeParse(clipId);
  if (!id.success) return { success: false, error: "Invalid clip id" };

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await softDeleteAssetClip(
    ctx.supabase,
    ctx.membership.organization.id,
    ctx.user.id,
    id.data,
  );
  if (result.error) return { success: false, error: result.error };
  revalidatePath("/media-library/clips");
  return { success: true, data: { id: id.data } };
}

export async function importYoutubeForClipEditorAction(
  raw: unknown,
): Promise<ClipActionResult<{ assetId: string }>> {
  const parsed = youtubeImportSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Enter a valid YouTube URL." };
  }

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const result = await importYoutubeAsAsset(
    ctx.supabase,
    ctx.membership.organization.id,
    ctx.user.id,
    parsed.data.url,
    parsed.data.name,
  );
  if (result.error || !result.assetId) {
    return { success: false, error: result.error ?? "Import failed" };
  }

  revalidatePath("/media-library");
  return { success: true, data: { assetId: result.assetId } };
}

export async function resolveClipPlaybackUrlAction(
  assetId: string,
): Promise<
  ClipActionResult<{
    url: string;
    external: boolean;
    durationSeconds: number | null;
    width: number | null;
    height: number | null;
    name: string;
  }>
> {
  const id = z.string().uuid().safeParse(assetId);
  if (!id.success) return { success: false, error: "Invalid asset id" };

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false, error: ctx.error ?? "Unauthorized" };
  }

  const { data: asset, error } = await ctx.supabase
    .from("media_assets")
    .select(
      "id, name, storage_bucket, storage_path, external_url, duration_seconds, width, height, file_type",
    )
    .eq("id", id.data)
    .eq("organization_id", ctx.membership.organization.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !asset) {
    return { success: false, error: error?.message ?? "Asset not found" };
  }

  if (asset.external_url) {
    return {
      success: true,
      data: {
        url: asset.external_url,
        external: true,
        durationSeconds: asset.duration_seconds
          ? Number(asset.duration_seconds)
          : null,
        width: asset.width,
        height: asset.height,
        name: asset.name,
      },
    };
  }

  const signed = await createSignedAssetUrl(
    ctx.supabase,
    asset.storage_bucket,
    asset.storage_path,
  );
  if (signed.error || !signed.url) {
    return { success: false, error: signed.error ?? "Could not sign URL" };
  }

  return {
    success: true,
    data: {
      url: signed.url,
      external: false,
      durationSeconds: asset.duration_seconds
        ? Number(asset.duration_seconds)
        : null,
      width: asset.width,
      height: asset.height,
      name: asset.name,
    },
  };
}

export async function captureClipPosterAction(raw: unknown) {
  const schema = z.object({
    clipId: z.string().uuid(),
    timecodeMs: z.number().int().min(0),
    publicUrl: z.string().url(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { success: false as const, error: "Invalid poster" };

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false as const, error: ctx.error ?? "Unauthorized" };
  }

  const result = await captureClipPoster(
    ctx.supabase,
    ctx.membership.organization.id,
    ctx.user.id,
    parsed.data.clipId,
    {
      timecodeMs: parsed.data.timecodeMs,
      publicUrl: parsed.data.publicUrl,
      setPrimary: true,
    },
  );
  if (result.error) return { success: false as const, error: result.error };
  return { success: true as const, data: { ok: true } };
}

export async function queueClipOperationAction(
  clipId: string,
  operation: "extract_audio" | "create_proxy" | "generate_poster",
) {
  const id = z.string().uuid().safeParse(clipId);
  if (!id.success) return { success: false as const, error: "Invalid clip" };

  const ctx = await requireOrgContext();
  if (!ctx.membership || ctx.error) {
    return { success: false as const, error: ctx.error ?? "Unauthorized" };
  }

  const result = await markClipOperation(
    ctx.supabase,
    ctx.membership.organization.id,
    ctx.user.id,
    id.data,
    operation,
  );
  if (result.error) return { success: false as const, error: result.error };
  return { success: true as const, data: { queued: operation } };
}
