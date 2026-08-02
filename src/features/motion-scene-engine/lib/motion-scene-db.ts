import type { SupabaseClient } from "@supabase/supabase-js";

/** Untyped Supabase accessor until database.types includes motion scene tables. */
export function motionSceneDb(client: SupabaseClient) {
  return client as SupabaseClient & {
    from: (table: string) => ReturnType<SupabaseClient["from"]>;
  };
}
