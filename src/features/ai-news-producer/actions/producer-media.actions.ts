"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getStoryById } from "@/features/newsroom/services/story.service";
import { checkAIRateLimit } from "@/features/ai/lib/rate-limit";
import {
  estimateCost,
  generateImage,
} from "@/features/ai/services/ai-orchestrator";
import {
  attachAssetToStory,
  registerUploadedAsset,
} from "@/features/media/services/media.service";
import {
  buildOrganizationStoragePath,
  defaultBucketForUpload,
} from "@/features/media/lib/media-utils";

export type ProducerMediaActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const generateSchema = z.object({
  storyId: z.string().uuid(),
  kind: z.enum(["image", "video"]),
  /** User brief for media.image_generate (default catalog prompt). */
  prompt: z.string().trim().min(8).max(2000).optional(),
  /** Override catalog prompt (must be registered in Prompt Manager). */
  promptId: z.string().trim().min(3).max(120).optional(),
  promptVariables: z.record(z.string(), z.string()).optional(),
  locale: z.enum(["en", "ml"]).optional(),
}).superRefine((value, ctx) => {
  if (!value.promptId && !value.prompt) {
    ctx.addIssue({
      code: "custom",
      message: "Provide a prompt brief or a Prompt Manager promptId.",
      path: ["prompt"],
    });
  }
});

async function requireOrg() {
  const user = await requireAuth();
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

export async function estimateProducerMediaCostAction(raw: {
  prompt: string;
  kind: "image" | "video";
}): Promise<
  ProducerMediaActionResult<{
    estimatedCost: number;
    currency: "USD";
    breakdown: string;
    estimatedTokens: number;
  }>
> {
  await requireAuth();
  const prompt = raw.prompt?.trim() ?? "";
  const estimatedTokens =
    raw.kind === "video"
      ? Math.max(4000, Math.ceil(prompt.length / 4) + 3500)
      : Math.max(1200, Math.ceil(prompt.length / 4) + 1000);

  try {
    const cost = await estimateCost("gemini", {
      model:
        raw.kind === "video"
          ? "veo-2.0-generate-001"
          : process.env.DEFAULT_GEMINI_IMAGE_MODEL?.trim() ||
            "gemini-2.5-flash-image",
      inputTokens: Math.ceil(prompt.length / 4),
      outputTokens: raw.kind === "video" ? 3500 : 1000,
      modality: "image",
    });
    return {
      success: true,
      data: {
        estimatedCost: cost.estimatedCost,
        currency: "USD",
        breakdown: cost.breakdown ?? "Token estimate for AI media generation",
        estimatedTokens,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to estimate cost.",
    };
  }
}

export async function generateProducerMediaAction(
  raw: unknown,
): Promise<
  ProducerMediaActionResult<{
    assetId: string;
    name: string;
    tokensUsed: number;
    estimatedCost: number;
    jobId: string | null;
    kind: "image" | "video";
    previewNote?: string;
  }>
> {
  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid media generate payload.",
    };
  }

  const { user, supabase, membership, error } = await requireOrg();
  if (!membership) {
    return { success: false, error: error ?? "Organization required." };
  }

  const rate = checkAIRateLimit(`producer-media:${user.id}`, {
    limit: 6,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return {
      success: false,
      error: `Rate limit reached. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.`,
    };
  }

  const { story, error: storyError } = await getStoryById(
    supabase,
    parsed.data.storyId,
  );
  if (storyError || !story) {
    return { success: false, error: storyError ?? "Story not found." };
  }
  if (story.organization_id !== membership.organization.id) {
    return { success: false, error: "Story is outside your organization." };
  }

  if (parsed.data.kind === "video") {
    // Veo / video generation is token-metered; full async pipeline ships next.
    const briefLength =
      parsed.data.prompt?.length ??
      JSON.stringify(parsed.data.promptVariables ?? {}).length;
    const cost = await estimateCost("gemini", {
      model: "veo-2.0-generate-001",
      inputTokens: Math.ceil(briefLength / 4),
      outputTokens: 3500,
      modality: "image",
    });
    return {
      success: false,
      error: `AI video generation uses ~${Math.max(4000, Math.ceil(briefLength / 4) + 3500)} tokens (est. $${cost.estimatedCost.toFixed(4)}). Veo pipeline is not enabled on this workspace yet — use Generate Image for now, or upload a video.`,
    };
  }

  const promptId = parsed.data.promptId ?? "media.image_generate";
  const promptVariables =
    parsed.data.promptVariables ??
    (parsed.data.prompt ? { user_brief: parsed.data.prompt } : undefined);

  if (!promptVariables) {
    return {
      success: false,
      error: "Prompt variables are required for image generation.",
    };
  }

  const result = await generateImage(supabase, {
    organizationId: membership.organization.id,
    userId: user.id,
    storyId: story.id,
    jobType: "news_producer.generate_image",
    providerId: "gemini",
    promptId,
    promptVariables,
    locale: parsed.data.locale ?? "en",
    n: 1,
  });

  if (result.error || !result.data?.images[0]?.b64) {
    return {
      success: false,
      error: result.error ?? "Image generation failed.",
    };
  }

  const b64 = result.data.images[0].b64;
  const buffer = Buffer.from(b64, "base64");
  const mimeType = "image/png";
  const filename = `ai-image-${Date.now()}.png`;
  const bucket = defaultBucketForUpload();
  const storagePath = buildOrganizationStoragePath(
    membership.organization.id,
    null,
    filename,
  );

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const registered = await registerUploadedAsset(supabase, user.id, {
    organizationId: membership.organization.id,
    folderId: null,
    name: filename,
    originalFilename: filename,
    storageBucket: bucket,
    storagePath,
    fileType: "image",
    mimeType,
    fileSize: buffer.byteLength,
  });

  if (registered.error || !registered.asset) {
    return {
      success: false,
      error: registered.error ?? "Could not register generated image.",
    };
  }

  const attached = await attachAssetToStory(supabase, user.id, {
    organizationId: membership.organization.id,
    storyId: story.id,
    mediaAssetId: registered.asset.id,
  });
  if (attached.error) {
    return { success: false, error: attached.error };
  }

  revalidatePath(`/newsroom/stories/${story.id}`);

  return {
    success: true,
    data: {
      assetId: registered.asset.id,
      name: registered.asset.name,
      tokensUsed: result.data.tokensUsed ?? 1200,
      estimatedCost: result.data.estimatedCost ?? 0,
      jobId: result.jobId,
      kind: "image",
    },
  };
}
