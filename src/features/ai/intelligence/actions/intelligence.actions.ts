"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { checkAIRateLimit } from "@/features/ai/lib/rate-limit";
import {
  STORY_INTELLIGENCE_CAPABILITIES,
} from "@/features/ai/intelligence/constants/intelligence.constants";
import {
  acceptRecommendation,
  listRecommendations,
  rejectRecommendation,
} from "@/features/ai/intelligence/services/recommendation.service";
import { runStoryIntelligence } from "@/features/ai/intelligence/services/story-intelligence.service";
import { recommendScenes } from "@/features/ai/intelligence/services/scene-intelligence.service";
import { generateTimelineDraft } from "@/features/ai/intelligence/services/timeline-intelligence.service";
import {
  applyTimelineDraft,
  type ApplyTimelineDraftResult,
} from "@/features/ai/intelligence/services/apply-timeline-draft.service";
import { analyzeAsset } from "@/features/ai/intelligence/services/asset-intelligence.service";
import { recommendGraphics } from "@/features/ai/intelligence/services/graphics-intelligence.service";
import {
  runVoiceIntelligence,
  type VoiceCapability,
} from "@/features/ai/intelligence/services/voice-intelligence.service";
import { assessBroadcastHealth } from "@/features/ai/intelligence/services/broadcast-intelligence.service";
import type { AIRecommendation } from "@/features/ai/intelligence/types/intelligence.types";
import { AI_INTELLIGENCE_DOMAINS } from "@/features/ai/intelligence/types/intelligence.types";

export type IntelligenceActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireIntelligenceContext(redirectTo = "/ai-center") {
  const user = await requireAuth(redirectTo);
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

function rateLimited(organizationId: string, userId: string): string | null {
  const result = checkAIRateLimit(`${organizationId}:${userId}`);
  if (result.allowed) return null;
  return `Rate limit exceeded. Retry in ${Math.ceil(result.retryAfterMs / 1000)}s.`;
}

export async function acceptIntelligenceRecommendationAction(
  recommendationId: string,
): Promise<IntelligenceActionResult<AIRecommendation>> {
  const parsed = z.string().uuid().safeParse(recommendationId);
  if (!parsed.success) return { success: false, error: "Invalid recommendation" };

  const { user, supabase, membership, error } = await requireIntelligenceContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const result = await acceptRecommendation(supabase, parsed.data, user.id);
  if (!result.data) return { success: false, error: result.error ?? "Accept failed" };

  revalidatePath("/ai-center");
  return { success: true, data: result.data };
}

const applyTimelineSchema = z.object({
  recommendationId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  timelineId: z.string().uuid().optional().nullable(),
});

/**
 * Accept a Timeline Intelligence draft and place editable beats on the project timeline.
 */
export async function applyTimelineDraftAction(
  raw: z.infer<typeof applyTimelineSchema>,
): Promise<IntelligenceActionResult<ApplyTimelineDraftResult>> {
  const parsed = applyTimelineSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { user, supabase, membership, error } = await requireIntelligenceContext(
    "/creative-studio",
  );
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const result = await applyTimelineDraft(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    recommendationId: parsed.data.recommendationId,
    projectId: parsed.data.projectId,
    timelineId: parsed.data.timelineId,
  });

  if (!result.data) {
    return { success: false, error: result.error ?? "Apply draft failed" };
  }

  revalidatePath("/ai-center");
  revalidatePath("/creative-studio");
  if (result.data.projectId) {
    revalidatePath(`/creative-studio/projects/${result.data.projectId}`);
  }

  return { success: true, data: result.data };
}

export async function rejectIntelligenceRecommendationAction(
  recommendationId: string,
  reason?: string,
): Promise<IntelligenceActionResult<AIRecommendation>> {
  const parsed = z.string().uuid().safeParse(recommendationId);
  if (!parsed.success) return { success: false, error: "Invalid recommendation" };

  const { user, supabase, membership, error } = await requireIntelligenceContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const result = await rejectRecommendation(
    supabase,
    parsed.data,
    user.id,
    reason,
  );
  if (!result.data) return { success: false, error: result.error ?? "Reject failed" };

  revalidatePath("/ai-center");
  return { success: true, data: result.data };
}

export async function listIntelligenceRecommendationsAction(
  domain?: (typeof AI_INTELLIGENCE_DOMAINS)[number],
): Promise<IntelligenceActionResult<AIRecommendation[]>> {
  const { supabase, membership, error } = await requireIntelligenceContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const result = await listRecommendations(supabase, membership.organization.id, {
    domain,
    status: "pending",
    limit: 40,
  });
  if (!result.data) return { success: false, error: result.error ?? "List failed" };
  return { success: true, data: result.data };
}

const storySchema = z.object({
  capability: z.enum(STORY_INTELLIGENCE_CAPABILITIES),
  storyId: z.string().uuid().optional().nullable(),
  title: z.string().max(500).optional(),
  body: z.string().max(50_000).optional(),
  language: z.string().max(16).optional(),
  targetLanguage: z.string().max(16).optional(),
});

export async function runStoryIntelligenceAction(
  raw: z.infer<typeof storySchema>,
): Promise<IntelligenceActionResult<AIRecommendation>> {
  const parsed = storySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { user, supabase, membership, error } = await requireIntelligenceContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const limited = rateLimited(membership.organization.id, user.id);
  if (limited) return { success: false, error: limited };

  const result = await runStoryIntelligence(supabase, parsed.data.capability, {
    organizationId: membership.organization.id,
    userId: user.id,
    storyId: parsed.data.storyId,
    title: parsed.data.title,
    body: parsed.data.body,
    language: parsed.data.language,
    targetLanguage: parsed.data.targetLanguage,
  });
  if (!result.data) return { success: false, error: result.error ?? "Story AI failed" };
  revalidatePath("/ai-center");
  return { success: true, data: result.data };
}

const sceneSchema = z.object({
  storyId: z.string().uuid().optional().nullable(),
  storyType: z.string().max(80).optional(),
  language: z.string().max(16).optional(),
  availableAssetTypes: z.array(z.string()).optional(),
  preferences: z.array(z.string()).optional(),
});

export async function recommendScenesAction(
  raw: z.infer<typeof sceneSchema> = {},
): Promise<IntelligenceActionResult<AIRecommendation>> {
  const parsed = sceneSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { user, supabase, membership, error } = await requireIntelligenceContext(
    "/creative-studio/scenes",
  );
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const limited = rateLimited(membership.organization.id, user.id);
  if (limited) return { success: false, error: limited };

  const result = await recommendScenes(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    ...parsed.data,
  });
  if (!result.data) return { success: false, error: result.error ?? "Scene AI failed" };
  revalidatePath("/ai-center");
  revalidatePath("/creative-studio/scenes");
  return { success: true, data: result.data };
}

const timelineSchema = z.object({
  storyId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  timelineId: z.string().uuid().optional().nullable(),
  storyTitle: z.string().max(300).optional(),
  storyType: z.string().max(80).optional(),
  sceneIndex: z.number().int().min(0).optional(),
  sourceRecommendationId: z.string().uuid().optional().nullable(),
  regenerateAll: z.boolean().optional(),
});

export async function generateTimelineDraftAction(
  raw: z.infer<typeof timelineSchema> = {},
): Promise<IntelligenceActionResult<AIRecommendation>> {
  const parsed = timelineSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { user, supabase, membership, error } = await requireIntelligenceContext(
    "/creative-studio",
  );
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const limited = rateLimited(membership.organization.id, user.id);
  if (limited) return { success: false, error: limited };

  const result = await generateTimelineDraft(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    ...parsed.data,
  });
  if (!result.data) {
    return { success: false, error: result.error ?? "Timeline draft failed" };
  }
  revalidatePath("/ai-center");
  revalidatePath("/creative-studio");
  return { success: true, data: result.data };
}

const assetSchema = z.object({
  mediaAssetId: z.string().uuid(),
  name: z.string().min(1).max(500),
  fileType: z.string().min(1).max(40),
  mimeType: z.string().min(1).max(120),
  storyId: z.string().uuid().optional().nullable(),
});

export async function analyzeAssetAction(
  raw: z.infer<typeof assetSchema>,
): Promise<IntelligenceActionResult<AIRecommendation>> {
  const parsed = assetSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { user, supabase, membership, error } = await requireIntelligenceContext(
    "/media-library",
  );
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const limited = rateLimited(membership.organization.id, user.id);
  if (limited) return { success: false, error: limited };

  const result = await analyzeAsset(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    ...parsed.data,
  });
  if (!result.data) return { success: false, error: result.error ?? "Asset AI failed" };
  revalidatePath("/ai-center");
  revalidatePath("/media-library");
  return { success: true, data: result.data };
}

const graphicsSchema = z.object({
  storyId: z.string().uuid().optional().nullable(),
  storyCategory: z.string().max(120).optional(),
  language: z.string().max(16).optional(),
});

export async function recommendGraphicsAction(
  raw: z.infer<typeof graphicsSchema> = {},
): Promise<IntelligenceActionResult<AIRecommendation>> {
  const parsed = graphicsSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { user, supabase, membership, error } = await requireIntelligenceContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const limited = rateLimited(membership.organization.id, user.id);
  if (limited) return { success: false, error: limited };

  const result = await recommendGraphics(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    ...parsed.data,
  });
  if (!result.data) {
    return { success: false, error: result.error ?? "Graphics AI failed" };
  }
  revalidatePath("/ai-center");
  return { success: true, data: result.data };
}

const voiceSchema = z.object({
  capability: z.enum([
    "voice_to_text",
    "text_to_speech",
    "pronunciation",
    "language_detection",
    "subtitles",
  ] as const),
  storyId: z.string().uuid().optional().nullable(),
  text: z.string().max(50_000).optional(),
  languageHint: z.string().max(16).optional(),
});

export async function runVoiceIntelligenceAction(
  raw: z.infer<typeof voiceSchema>,
): Promise<IntelligenceActionResult<AIRecommendation>> {
  const parsed = voiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { user, supabase, membership, error } = await requireIntelligenceContext();
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const limited = rateLimited(membership.organization.id, user.id);
  if (limited) return { success: false, error: limited };

  const result = await runVoiceIntelligence(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    capability: parsed.data.capability as VoiceCapability,
    storyId: parsed.data.storyId,
    text: parsed.data.text,
    languageHint: parsed.data.languageHint,
  });
  if (!result.data) return { success: false, error: result.error ?? "Voice AI failed" };
  revalidatePath("/ai-center");
  return { success: true, data: result.data };
}

const broadcastSchema = z.object({
  storyId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  targetBitrateKbps: z.number().int().min(500).max(50_000).optional(),
  hasSubtitles: z.boolean().optional(),
  resolution: z.string().max(40).optional(),
});

export async function assessBroadcastHealthAction(
  raw: z.infer<typeof broadcastSchema> = {},
): Promise<IntelligenceActionResult<AIRecommendation>> {
  const parsed = broadcastSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { user, supabase, membership, error } = await requireIntelligenceContext(
    "/broadcast",
  );
  if (!membership) return { success: false, error: error ?? "Organization required" };

  const limited = rateLimited(membership.organization.id, user.id);
  if (limited) return { success: false, error: limited };

  const result = await assessBroadcastHealth(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    ...parsed.data,
  });
  if (!result.data) {
    return { success: false, error: result.error ?? "Broadcast AI failed" };
  }
  revalidatePath("/ai-center");
  revalidatePath("/broadcast");
  return { success: true, data: result.data };
}
