import "server-only";

/**
 * Untyped accessor until `npx supabase gen types` is re-run after migration 000028.
 */
export function videoRenderDb(client: unknown): {
  from: (table: string) => any;
  storage: any;
} {
  return client as {
    from: (table: string) => any;
    storage: any;
  };
}
