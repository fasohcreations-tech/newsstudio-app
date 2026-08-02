"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/shared/lib/supabase/server";
import { requireAuth } from "@/features/auth/guards/require-auth";
import {
  storyCreateSchema,
  storyUpdateSchema,
} from "@/features/newsroom/schemas/story.schemas";
import {
  createStory,
  restoreStory,
  softDeleteStory,
  updateStory,
} from "@/features/newsroom/services/story.service";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function revalidateStoryPaths(storyId?: string) {
  revalidatePath("/newsroom");
  revalidatePath("/dashboard");
  if (storyId) {
revalidatePath(`/newsroom/stories/${storyId}`);
  revalidatePath(`/newsroom/${storyId}`);
  revalidatePath(`/newsroom/${storyId}/edit`);
  }
}

export async function createStoryAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();
  const parsed = storyCreateSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid story data.",
    };
  }

  const supabase = await createClient();
  const { story, error } = await createStory(supabase, user.id, parsed.data);

  if (error || !story) {
    return { success: false, error: error ?? "Unable to create story." };
  }

  revalidateStoryPaths(story.id);
  return { success: true, data: { id: story.id } };
}

export async function updateStoryAction(
  storyId: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();
  const parsed = storyUpdateSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid story data.",
    };
  }

  const supabase = await createClient();
  const { story, error } = await updateStory(
    supabase,
    storyId,
    user.id,
    parsed.data,
  );

  if (error || !story) {
    return { success: false, error: error ?? "Unable to update story." };
  }

  revalidateStoryPaths(story.id);
  return { success: true, data: { id: story.id } };
}

export async function deleteStoryAction(
  storyId: string,
): Promise<ActionResult> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { error } = await softDeleteStory(supabase, storyId, user.id);

  if (error) {
    return { success: false, error };
  }

  revalidateStoryPaths(storyId);
  return { success: true, data: undefined };
}

export async function restoreStoryAction(
  storyId: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuth();
  const supabase = await createClient();
  const { story, error } = await restoreStory(supabase, storyId, user.id);

  if (error || !story) {
    return { success: false, error: error ?? "Unable to restore story." };
  }

  revalidateStoryPaths(story.id);
  return { success: true, data: { id: story.id } };
}
