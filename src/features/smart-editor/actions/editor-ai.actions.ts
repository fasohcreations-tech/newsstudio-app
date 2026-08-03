"use server";

import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { generateText } from "@/features/ai/services/ai-orchestrator";
import { checkAIRateLimit } from "@/features/ai/lib/rate-limit";
import { EDITOR_AI_ACTIONS } from "@/features/smart-editor/types/editor.types";
import { EDITOR_AI_ACTION_LABELS } from "@/features/smart-editor/constants/editor.constants";
import { buildEditorAIPromptVariables } from "@/features/smart-editor/lib/ai-prompts";

export type EditorActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const transformSchema = z.object({
  action: z.enum(EDITOR_AI_ACTIONS),
  text: z.string().trim().min(1).max(30_000),
  language: z.enum(["ml", "en", "manglish"]).default("ml"),
  storyId: z.string().uuid().optional(),
  contentObjectId: z.string().uuid().optional(),
  targetLanguage: z.enum(["ml", "en"]).optional(),
});

async function requireOrgContext() {
  const user = await requireAuth("/ai-center/smart-editor");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );
  return { user, supabase, membership, error };
}

/**
 * All Smart Editor AI tools go through the AI Orchestrator.
 */
export async function runEditorAIAction(
  raw: z.infer<typeof transformSchema>,
): Promise<EditorActionResult<{ text: string; jobId: string | null }>> {
  const parsed = transformSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { user, supabase, membership, error } = await requireOrgContext();
  if (!membership) {
    return { success: false, error: error ?? "Organization required" };
  }

  const orgId = membership.organization.id;
  const rate = checkAIRateLimit(`editor-ai:${orgId}:${user.id}`);
  if (!rate.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.`,
    };
  }

  const { action, text, language, storyId, contentObjectId, targetLanguage } =
    parsed.data;

  const promptVariables = buildEditorAIPromptVariables({
    action,
    text,
    language,
    targetLanguage,
  });

  try {
    const result = await generateText(supabase, {
      organizationId: orgId,
      userId: user.id,
      storyId,
      contentObjectId,
      jobType: `editor.${action}`,
      providerId: "gemini",
      locale: language === "en" ? "en" : "ml",
      promptId: "editor.transform",
      promptVariables,
      temperature: 0.4,
    });

    if (result.error || !result.data) {
      return { success: false, error: result.error ?? "Generation failed" };
    }

    return {
      success: true,
      data: {
        text: result.data.text.trim(),
        jobId: result.jobId,
      },
    };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error
          ? e.message
          : `Failed to run ${EDITOR_AI_ACTION_LABELS[action]}`,
    };
  }
}
