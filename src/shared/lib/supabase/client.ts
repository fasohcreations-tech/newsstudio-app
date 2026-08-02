import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/shared/types/database.types";
import { env } from "@/shared/lib/env";

/**
 * Browser Supabase client (Client Components).
 * Uses the anon key; all data access is enforced by RLS.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
