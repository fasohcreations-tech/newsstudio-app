import type { SupabaseClient } from "@supabase/supabase-js";

/** Untyped accessor for Module 6.0 tables until database.types is regenerated. */
export function intelligenceDb(client: SupabaseClient) {
  return client as SupabaseClient & {
    from: (table: string) => ReturnType<SupabaseClient["from"]>;
  };
}

export const AI_RECOMMENDATION_SELECT = `
  id, organization_id, domain, recommendation_type, status, title, summary,
  payload, confidence, model_version, prompt_id, prompt_version, ai_job_id,
  story_id, project_id, scene_id, media_asset_id, timeline_id,
  source_recommendation_id, origin, metadata,
  accepted_at, accepted_by, rejected_at, rejected_by, rejection_reason,
  created_by, updated_by, created_at, updated_at, deleted_at
`;
