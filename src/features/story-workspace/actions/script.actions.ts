"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/shared/lib/supabase/server";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { scriptSaveSchema } from "@/features/story-workspace/lib/script-utils";
import { saveCurrentStoryScript } from "@/features/story-workspace/services/script.service";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function saveStoryScriptAction(
  raw: unknown,
): Promise<ActionResult<{ updatedAt: string; version: number }>> {
  const user = await requireAuth();
  const parsed = scriptSaveSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid script payload.",
    };
  }

  const supabase = await createClient();
  const { script, error } = await saveCurrentStoryScript(
    supabase,
    user.id,
    parsed.data,
  );

  if (error || !script) {
    return { success: false, error: error ?? "Unable to save script." };
  }

  revalidatePath(`/newsroom/stories/${parsed.data.storyId}`);
  return {
    success: true,
    data: { updatedAt: script.updated_at, version: script.version },
  };
}
