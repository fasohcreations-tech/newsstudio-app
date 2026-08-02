import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import type { StoryScript } from "@/features/story-workspace/types/workspace.types";
import type { ScriptSaveInput } from "@/features/story-workspace/lib/script-utils";

type Client = SupabaseClient<Database>;

export async function getCurrentStoryScript(
  client: Client,
  storyId: string,
): Promise<{ script: StoryScript | null; error: string | null }> {
  const { data, error } = await client
    .from("story_scripts")
    .select("*")
    .eq("story_id", storyId)
    .eq("is_current", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { script: null, error: error.message };
  return { script: data, error: null };
}

export async function ensureCurrentStoryScript(
  client: Client,
  args: {
    storyId: string;
    organizationId: string;
    userId: string;
  },
): Promise<{ script: StoryScript | null; error: string | null }> {
  const existing = await getCurrentStoryScript(client, args.storyId);
  if (existing.error) return existing;
  if (existing.script) return existing;

  const { data, error } = await client
    .from("story_scripts")
    .insert({
      story_id: args.storyId,
      organization_id: args.organizationId,
      created_by: args.userId,
      updated_by: args.userId,
      content_html: "",
      content_plain: "",
      word_count: 0,
      character_count: 0,
      version: 1,
      is_current: true,
    })
    .select("*")
    .single();

  if (error) {
    // Concurrent create — fetch again
    const retry = await getCurrentStoryScript(client, args.storyId);
    if (retry.script) return retry;
    return { script: null, error: error.message };
  }

  return { script: data, error: null };
}

export async function saveCurrentStoryScript(
  client: Client,
  userId: string,
  input: ScriptSaveInput,
): Promise<{ script: StoryScript | null; error: string | null }> {
  const current = await getCurrentStoryScript(client, input.storyId);
  if (current.error) return { script: null, error: current.error };
  if (!current.script) {
    return { script: null, error: "Script document was not found." };
  }

  const { data, error } = await client
    .from("story_scripts")
    .update({
      content_html: input.contentHtml,
      content_plain: input.contentPlain,
      word_count: input.wordCount,
      character_count: input.characterCount,
      updated_by: userId,
      // Keep same version for autosave; History feature will bump versions later
    })
    .eq("id", current.script.id)
    .eq("is_current", true)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) return { script: null, error: error.message };
  return { script: data, error: null };
}
