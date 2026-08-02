import type { SupabaseClient } from "@supabase/supabase-js";

export function composerDb(client: SupabaseClient) {
  return client as SupabaseClient & {
    from: (table: string) => ReturnType<SupabaseClient["from"]>;
  };
}
