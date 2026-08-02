"use server";

import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { upsertEditorDraft } from "@/features/smart-editor/services/editor-draft.service";
import { NEWSROOM_FORMATS } from "@/features/smart-editor/types/editor.types";

export type DraftActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const saveDraftSchema = z.object({
  storyId: z.string().uuid(),
  contentObjectId: z.string().uuid().optional(),
  title: z.string().trim().max(240).optional(),
  bodyHtml: z.string().max(500_000),
  bodyPlain: z.string().max(500_000),
  language: z.enum(["ml", "en", "manglish"]),
  revision: z.number().int().min(1),
  lastCursorPosition: z.number().int().nullable().optional(),
  newsroomFormat: z.enum(NEWSROOM_FORMATS),
  wordCount: z.number().int().min(0),
  characterCount: z.number().int().min(0),
});

export async function saveSmartEditorDraftAction(
  raw: z.infer<typeof saveDraftSchema>,
): Promise<DraftActionResult<{ contentObjectId: string; revision: number }>> {
  const parsed = saveDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid draft",
    };
  }

  const user = await requireAuth("/ai-center/smart-editor");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const result = await upsertEditorDraft(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    ...parsed.data,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Failed to save draft" };
  }

  return {
    success: true,
    data: {
      contentObjectId: result.data.id,
      revision: result.data.version,
    },
  };
}
