/**
 * Untyped Supabase accessor for Story Scene Builder tables
 * until database.types is fully regenerated.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export function storySceneBuilderDb(client: SupabaseClient) {
  return client as SupabaseClient & {
    from: (table: string) => ReturnType<SupabaseClient["from"]>;
  };
}
