import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/shared/types/database.types";
import type { AILocale } from "@/features/ai/types/ai";
import { generateText } from "@/features/ai/services/ai-orchestrator";
import { getPromptTemplate } from "@/features/ai/services/prompt-manager";
import {
  createContentObject,
  CONTENT_OBJECT_SELECT,
  listContentObjects,
  updateContentObject,
} from "@/features/content/services/content.service";
import { getCurrentStoryScript } from "@/features/story-workspace/services/script.service";
import {
  NEWS_PRODUCER_CONTENT_TYPES,
  NEWS_PRODUCER_KIND_LABELS,
  NEWS_PRODUCER_MODULE,
  NEWS_PRODUCER_PROMPT_IDS,
  NEWS_PRODUCER_SECTION_KINDS,
  type NewsProducerKind,
  type NewsProducerSection,
} from "@/features/ai-news-producer/constants/producer.constants";
import {
  parseProducerMetadata,
  toProducerOutput,
  type NewsProducerMetadata,
  type NewsProducerOutput,
  type NewsProducerServiceResult,
} from "@/features/ai-news-producer/types/producer.types";

type Client = SupabaseClient<Database>;

export type StoryProducerContext = {
  organizationId: string;
  storyId: string;
  userId: string;
  title: string;
  summary: string | null;
  language: string;
  category: string | null;
};

function nonEmpty(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export async function listProducerOutputs(
  client: Client,
  args: { organizationId: string; storyId: string },
): Promise<NewsProducerServiceResult<NewsProducerOutput[]>> {
  const result = await listContentObjects(client, {
    organizationId: args.organizationId,
    storyId: args.storyId,
  });
  if (result.error) return { data: null, error: result.error };

  const outputs = (result.data ?? [])
    .map(toProducerOutput)
    .filter((row): row is NewsProducerOutput => Boolean(row))
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

  return { data: outputs, error: null };
}

export async function generateProducerOutput(
  client: Client,
  args: {
    context: StoryProducerContext;
    kind: NewsProducerKind;
    section: NewsProducerSection;
  },
): Promise<NewsProducerServiceResult<NewsProducerOutput>> {
  const { context, kind, section } = args;
  const promptId = NEWS_PRODUCER_PROMPT_IDS[kind];
  const template = getPromptTemplate(promptId);
  if (!template) {
    return { data: null, error: `Prompt template missing: ${promptId}` };
  }

  const script = await getCurrentStoryScript(client, context.storyId);
  const body = nonEmpty(
    script.script?.content_plain,
    nonEmpty(
      context.summary,
      "(കഥയുടെ ഉള്ളടക്കം ഇില്ല. തലക്കെട്ടും സംഗ്രഹവും ഉപയോഗിക്കുക.)",
    ),
  );

  // MediaOS AI News Producer: always generate Malayalam editorial copy.
  const locale: AILocale = "ml";
  const languageLabel = "Malayalam";

  const variables: Record<string, string> = {
    title: nonEmpty(context.title, "ശീർഷകമില്ലാത്ത വാർത്ത"),
    summary: nonEmpty(context.summary, "(സംഗ്രഹം ഇില്ല)"),
    body,
    language: languageLabel,
    tone: "നേരായ വാർത്താ ശൈലി",
    maxWords: "120",
    category: nonEmpty(context.category, "പൊതു"),
    topic: nonEmpty(context.title, "ശീർഷകമില്ലാത്ത വാർത്ത"),
    angle: "നേരായ വാർത്ത",
    headline: nonEmpty(context.title, "ശീർഷകമില്ലാത്ത വാർത്ത"),
  };

  const started = Date.now();
  const result = await generateText(client, {
    organizationId: context.organizationId,
    userId: context.userId,
    storyId: context.storyId,
    jobType: `news_producer.${kind}`,
    providerId: "gemini",
    promptId,
    promptVariables: variables,
    locale,
    systemPrompt: [
      "You are a Malayalam newsroom AI for MediaOS.",
      "Write the ENTIRE response in Malayalam script (മലയാളം).",
      "Do not write English paragraphs. Proper nouns may stay in Latin script when needed.",
      "Keep a professional Kerala news desk tone.",
    ].join(" "),
  });

  if (result.error || !result.data) {
    return { data: null, error: result.error ?? "Generation failed." };
  }

  const executionTimeMs = Date.now() - started;
  const metadata: NewsProducerMetadata = {
    module: NEWS_PRODUCER_MODULE,
    kind,
    section,
    body: result.data.text,
    bodyFormat: "markdown",
    approvalStatus: "waiting_for_approval",
    ai: {
      jobId: result.jobId,
      provider: "gemini",
      model: result.data.model,
      promptId,
      promptVersion: template.version,
      locale,
      tokensUsed: result.data.tokensUsed ?? null,
      executionTimeMs,
      finishReason: result.data.finishReason ?? null,
    },
  };

  const existing = await findLatestForKind(client, {
    organizationId: context.organizationId,
    storyId: context.storyId,
    kind,
  });

  const title = `${NEWS_PRODUCER_KIND_LABELS[kind]} — ${nonEmpty(context.title, "Story")}`;

  if (existing) {
    const updated = await updateContentObject(client, existing.id, {
      title,
      type: NEWS_PRODUCER_CONTENT_TYPES[kind],
      status: "in_progress",
      language: locale,
      metadata: metadata as unknown as Json,
      version: (existing.version ?? 1) + 1,
      updated_by: context.userId,
    });
    if (updated.error || !updated.data) {
      return { data: null, error: updated.error ?? "Failed to update output." };
    }
    const mapped = toProducerOutput(updated.data);
    return mapped
      ? { data: mapped, error: null }
      : { data: null, error: "Failed to parse updated output." };
  }

  const created = await createContentObject(client, {
    organization_id: context.organizationId,
    story_id: context.storyId,
    type: NEWS_PRODUCER_CONTENT_TYPES[kind],
    title,
    status: "in_progress",
    language: locale,
    metadata: metadata as unknown as Json,
    created_by: context.userId,
    updated_by: context.userId,
  });

  if (created.error || !created.data) {
    return { data: null, error: created.error ?? "Failed to save output." };
  }

  const mapped = toProducerOutput(created.data);
  return mapped
    ? { data: mapped, error: null }
    : { data: null, error: "Failed to parse created output." };
}

/** Generate Social Package: captions + YouTube description */
export async function generateSocialPackage(
  client: Client,
  context: StoryProducerContext,
): Promise<NewsProducerServiceResult<NewsProducerOutput[]>> {
  const captions = await generateProducerOutput(client, {
    context,
    kind: "social_captions",
    section: "social",
  });
  if (captions.error || !captions.data) {
    return { data: null, error: captions.error ?? "Social captions failed." };
  }

  const youtube = await generateProducerOutput(client, {
    context,
    kind: "youtube_description",
    section: "social",
  });
  if (youtube.error || !youtube.data) {
    return {
      data: [captions.data],
      error: youtube.error ?? "YouTube description failed.",
    };
  }

  return { data: [captions.data, youtube.data], error: null };
}

/** SEO package: metadata + keywords + tags */
export async function generateSeoPackage(
  client: Client,
  context: StoryProducerContext,
): Promise<NewsProducerServiceResult<NewsProducerOutput[]>> {
  const kinds: Array<{ kind: NewsProducerKind; section: NewsProducerSection }> =
    [
      { kind: "seo_metadata", section: "seo" },
      { kind: "keywords", section: "seo" },
      { kind: "tags", section: "seo" },
    ];

  const outputs: NewsProducerOutput[] = [];
  for (const step of kinds) {
    const result = await generateProducerOutput(client, {
      context,
      ...step,
    });
    if (result.error || !result.data) {
      return {
        data: outputs.length ? outputs : null,
        error: result.error ?? `${step.kind} failed.`,
      };
    }
    outputs.push(result.data);
  }
  return { data: outputs, error: null };
}

export async function approveProducerOutput(
  client: Client,
  args: { outputId: string; userId: string },
): Promise<NewsProducerServiceResult<NewsProducerOutput>> {
  return patchApproval(client, {
    ...args,
    approvalStatus: "approved",
    status: "ready",
  });
}

export async function rejectProducerOutput(
  client: Client,
  args: { outputId: string; userId: string },
): Promise<NewsProducerServiceResult<NewsProducerOutput>> {
  return patchApproval(client, {
    ...args,
    approvalStatus: "rejected",
    status: "archived",
  });
}

export async function saveProducerAsContentObject(
  client: Client,
  args: { outputId: string; userId: string },
): Promise<NewsProducerServiceResult<NewsProducerOutput>> {
  // Explicit save: approve + ready (already a content_object row)
  return approveProducerOutput(client, args);
}

export async function updateProducerBody(
  client: Client,
  args: { outputId: string; userId: string; body: string },
): Promise<NewsProducerServiceResult<NewsProducerOutput>> {
  const { data: current, error } = await client
    .from("content_objects")
    .select(CONTENT_OBJECT_SELECT)
    .eq("id", args.outputId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !current) {
    return { data: null, error: error?.message ?? "Output not found." };
  }

  const meta = parseProducerMetadata(current.metadata);
  if (!meta) {
    return { data: null, error: "Not a News Producer output." };
  }

  const next: NewsProducerMetadata = {
    ...meta,
    body: args.body,
    approvalStatus: "waiting_for_approval",
  };

  const updated = await updateContentObject(client, args.outputId, {
    metadata: next as unknown as Json,
    status: "in_progress",
    version: (current.version ?? 1) + 1,
    updated_by: args.userId,
  });

  if (updated.error || !updated.data) {
    return { data: null, error: updated.error ?? "Update failed." };
  }
  const mapped = toProducerOutput(updated.data);
  return mapped
    ? { data: mapped, error: null }
    : { data: null, error: "Failed to parse output." };
}

export async function regenerateProducerOutput(
  client: Client,
  args: {
    outputId: string;
    context: StoryProducerContext;
  },
): Promise<NewsProducerServiceResult<NewsProducerOutput>> {
  const { data: current, error } = await client
    .from("content_objects")
    .select(CONTENT_OBJECT_SELECT)
    .eq("id", args.outputId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !current) {
    return { data: null, error: error?.message ?? "Output not found." };
  }

  const meta = parseProducerMetadata(current.metadata);
  if (!meta) {
    return { data: null, error: "Not a News Producer output." };
  }

  return generateProducerOutput(client, {
    context: args.context,
    kind: meta.kind,
    section: meta.section,
  });
}

async function findLatestForKind(
  client: Client,
  args: {
    organizationId: string;
    storyId: string;
    kind: NewsProducerKind;
  },
) {
  const listed = await listProducerOutputs(client, args);
  if (listed.error || !listed.data) return null;
  return listed.data.find((o) => o.producer.kind === args.kind) ?? null;
}

async function patchApproval(
  client: Client,
  args: {
    outputId: string;
    userId: string;
    approvalStatus: "approved" | "rejected";
    status: "ready" | "archived";
  },
): Promise<NewsProducerServiceResult<NewsProducerOutput>> {
  const { data: current, error } = await client
    .from("content_objects")
    .select(CONTENT_OBJECT_SELECT)
    .eq("id", args.outputId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !current) {
    return { data: null, error: error?.message ?? "Output not found." };
  }

  const meta = parseProducerMetadata(current.metadata);
  if (!meta) {
    return { data: null, error: "Not a News Producer output." };
  }

  const next: NewsProducerMetadata = {
    ...meta,
    approvalStatus: args.approvalStatus,
  };

  const updated = await updateContentObject(client, args.outputId, {
    metadata: next as unknown as Json,
    status: args.status,
    updated_by: args.userId,
  });

  if (updated.error || !updated.data) {
    return { data: null, error: updated.error ?? "Update failed." };
  }
  const mapped = toProducerOutput(updated.data);
  return mapped
    ? { data: mapped, error: null }
    : { data: null, error: "Failed to parse output." };
}

export function kindsForSection(section: NewsProducerSection): NewsProducerKind[] {
  return NEWS_PRODUCER_SECTION_KINDS[section];
}
