import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import type { ProfileUpdateInput } from "@/features/profile/schemas/profile.schemas";
import type { Profile } from "@/features/profile/types/profile.types";

type Client = SupabaseClient<Database>;

export async function getCurrentProfile(
  client: Client,
  userId: string,
): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data, error: null };
}

export async function updateCurrentProfile(
  client: Client,
  userId: string,
  input: ProfileUpdateInput,
): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await client
    .from("profiles")
    .update({
      full_name: input.full_name,
      preferred_locale: input.preferred_locale,
      timezone: input.timezone,
    })
    .eq("id", userId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data, error: null };
}
