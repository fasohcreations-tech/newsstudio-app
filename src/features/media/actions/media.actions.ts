"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/shared/lib/supabase/server";
import { requireAuth } from "@/features/auth/guards/require-auth";
import {
  mediaFolderCreateSchema,
  mediaMoveSchema,
  mediaRenameSchema,
  storyMediaAttachSchema,
} from "@/features/media/schemas/media.schemas";
import {
  attachAssetToStory,
  createMediaFolder,
  detachAssetFromStory,
  moveMediaAsset,
  renameMediaAsset,
  restoreMediaAsset,
  softDeleteMediaAsset,
  softDeleteMediaFolder,
} from "@/features/media/services/media.service";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function revalidateMediaPaths(storyId?: string) {
  revalidatePath("/media-library");
  revalidatePath("/dashboard");
  if (storyId) {
revalidatePath(`/newsroom/stories/${storyId}`);
  revalidatePath(`/newsroom/${storyId}`);
}
}

export async function createMediaFolderAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();
  const parsed = mediaFolderCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid folder data.",
    };
  }

  const supabase = await createClient();
  const { folder, error } = await createMediaFolder(
    supabase,
    user.id,
    parsed.data,
  );

  if (error || !folder) {
    return { success: false, error: error ?? "Unable to create folder." };
  }

  revalidateMediaPaths();
  return { success: true, data: { id: folder.id } };
}

export async function renameMediaAssetAction(
  assetId: string,
  raw: unknown,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = mediaRenameSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid name.",
    };
  }

  const supabase = await createClient();
  const { error } = await renameMediaAsset(
    supabase,
    assetId,
    user.id,
    parsed.data,
  );

  if (error) return { success: false, error };
  revalidateMediaPaths();
  return { success: true, data: undefined };
}

export async function moveMediaAssetAction(
  assetId: string,
  raw: unknown,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = mediaMoveSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid folder.",
    };
  }

  const supabase = await createClient();
  const { error } = await moveMediaAsset(
    supabase,
    assetId,
    user.id,
    parsed.data,
  );

  if (error) return { success: false, error };
  revalidateMediaPaths();
  return { success: true, data: undefined };
}

export async function deleteMediaAssetAction(
  assetId: string,
): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { error } = await softDeleteMediaAsset(supabase, assetId, user.id);
  if (error) return { success: false, error };
  revalidateMediaPaths();
  return { success: true, data: undefined };
}

export async function restoreMediaAssetAction(
  assetId: string,
): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { error } = await restoreMediaAsset(supabase, assetId, user.id);
  if (error) return { success: false, error };
  revalidateMediaPaths();
  return { success: true, data: undefined };
}

export async function deleteMediaFolderAction(
  folderId: string,
): Promise<ActionResult> {
  await requireAuth();
  const supabase = await createClient();
  const { error } = await softDeleteMediaFolder(supabase, folderId);
  if (error) return { success: false, error };
  revalidateMediaPaths();
  return { success: true, data: undefined };
}

export async function attachStoryMediaAction(
  raw: unknown,
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = storyMediaAttachSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid attachment.",
    };
  }

  const supabase = await createClient();
  const { error } = await attachAssetToStory(supabase, user.id, parsed.data);
  if (error) return { success: false, error };
  revalidateMediaPaths(parsed.data.storyId);
  return { success: true, data: undefined };
}

export async function detachStoryMediaAction(
  storyMediaId: string,
  storyId: string,
): Promise<ActionResult> {
  await requireAuth();
  const supabase = await createClient();
  const { error } = await detachAssetFromStory(supabase, storyMediaId);
  if (error) return { success: false, error };
  revalidateMediaPaths(storyId);
  return { success: true, data: undefined };
}
