import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildPanelDiscoveryContexts } from "@/features/ai-asset-discovery/lib/panel-context";
import {
  buildSearchQueries,
  extractKeywords,
  isSubHeadlineMediaKind,
  type SubHeadlineMediaFilter,
} from "@/features/ai-asset-discovery/lib/query-builder";
import { rankAssetHits } from "@/features/ai-asset-discovery/lib/ranking-engine";
import { getEnabledDiscoveryProviders } from "@/features/ai-asset-discovery/providers/registry";
import type {
  AssetCandidateRow,
  AssetDiscoveryProviderId,
  AssetDiscoveryRunRow,
  AssetSearchQuery,
  AssetSearchRow,
  DiscoverStoryAssetsResult,
  PanelDiscoveryBundle,
  StoryDiscoveryBundle,
} from "@/features/ai-asset-discovery/types/discovery.types";
import { generateText } from "@/features/ai/services/ai-orchestrator";
import { parseJsonObject } from "@/features/ai/intelligence/lib/parse-json-response";
import { toLibraryMediaRef } from "@/features/story-production/lib/library-media-reference";
import {
  parseSubHeadlineMedia,
  serializeSubHeadlineMedia,
  type SubHeadlineMediaKind,
} from "@/features/story-production/lib/sub-headlines";
import { attachAssetToStory } from "@/features/media/services/media.service";

type Client = SupabaseClient;

type Result<T> = { data: T | null; error: string | null };

function ok<T>(data: T): Result<T> {
  return { data, error: null };
}

function fail<T>(error: string): Result<T> {
  return { data: null, error };
}

function historyEntry(action: string, by: string, detail: Record<string, unknown> = {}) {
  return { at: new Date().toISOString(), action, by, ...detail };
}

function asRun(row: unknown): AssetDiscoveryRunRow {
  return row as AssetDiscoveryRunRow;
}

function asSearch(row: unknown): AssetSearchRow {
  const r = row as AssetSearchRow & {
    keywords?: unknown;
    expanded_keywords?: unknown;
    queries?: unknown;
  };
  return {
    ...r,
    keywords: Array.isArray(r.keywords) ? (r.keywords as string[]) : [],
    expanded_keywords: Array.isArray(r.expanded_keywords)
      ? (r.expanded_keywords as string[])
      : [],
    queries: Array.isArray(r.queries) ? (r.queries as AssetSearchQuery[]) : [],
  };
}

function asCandidate(row: unknown): AssetCandidateRow {
  return row as AssetCandidateRow;
}

async function expandKeywordsWithAI(
  client: Client,
  input: {
    organizationId: string;
    userId: string;
    storyId: string;
    keywords: string[];
    sceneHeadline: string;
    storyHeadline: string;
    category: string;
    language: string;
  },
): Promise<string[]> {
  if (input.keywords.length === 0 && !input.sceneHeadline) return [];

  try {
    const live = await generateText(client, {
      organizationId: input.organizationId,
      userId: input.userId,
      storyId: input.storyId,
      jobType: "asset_discovery.expand_keywords",
      promptId: "discovery.expand_keywords",
      promptVariables: {
        story_headline: input.storyHeadline,
        scene_headline: input.sceneHeadline,
        category: input.category || "general",
        language: input.language || "en",
        seed_keywords: input.keywords.join(", ") || input.sceneHeadline,
      },
      locale: input.language?.startsWith("ml") ? "ml" : "en",
    });

    if (!live.data?.text) return input.keywords;
    const parsed = parseJsonObject<{ keywords?: string[]; expanded?: string[] }>(
      live.data.text,
    );
    const expanded = [
      ...(parsed?.keywords ?? []),
      ...(parsed?.expanded ?? []),
    ]
      .map((k) => String(k).trim())
      .filter(Boolean);
    return [...new Set([...input.keywords, ...expanded])].slice(0, 24);
  } catch {
    return input.keywords;
  }
}

function groupPanels(
  searches: AssetSearchRow[],
  candidates: AssetCandidateRow[],
  panelCount: number,
): PanelDiscoveryBundle[] {
  const panels: PanelDiscoveryBundle[] = [];
  for (let i = 0; i < Math.max(panelCount, 1); i++) {
    const panelCandidates = candidates
      .filter((c) => c.panel_index === i)
      .sort((a, b) => a.rank - b.rank);
    const search =
      searches
        .filter((s) => s.panel_index === i)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    panels.push({
      panelIndex: i,
      sceneHeadline: search?.scene_headline ?? "",
      search,
      candidates: panelCandidates.filter((c) => c.status === "pending"),
      approved: panelCandidates.find((c) => c.status === "accepted") ?? null,
      rejected: panelCandidates.filter((c) => c.status === "rejected"),
    });
  }
  return panels;
}

export async function getStoryDiscoveryBundle(
  client: Client,
  storyId: string,
): Promise<Result<StoryDiscoveryBundle>> {
  const { data: run, error } = await client
    .from("story_asset_discovery_runs")
    .select("*")
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!run) return ok({ run: null, panels: [] });

  const runRow = asRun(run);

  const [{ data: searches }, { data: candidates }] = await Promise.all([
    client
      .from("story_panel_asset_searches")
      .select("*")
      .eq("run_id", runRow.id)
      .order("created_at", { ascending: false }),
    client
      .from("story_panel_asset_candidates")
      .select("*")
      .eq("run_id", runRow.id)
      .is("deleted_at", null)
      .order("rank", { ascending: true }),
  ]);

  return ok({
    run: runRow,
    panels: groupPanels(
      (searches ?? []).map(asSearch),
      (candidates ?? []).map(asCandidate),
      runRow.panel_count || 1,
    ),
  });
}

/**
 * Run discovery for all Story Panels. Suggestions only — no scene binding.
 */
export async function discoverStoryAssets(
  client: Client,
  input: {
    storyId: string;
    userId: string;
    panelIndex?: number;
    preferredProvider?: AssetDiscoveryProviderId | null;
    /** Restrict results to image, video, or both (default). */
    mediaFilter?: SubHeadlineMediaFilter;
  },
): Promise<Result<DiscoverStoryAssetsResult>> {
  const { data: story, error: storyError } = await client
    .from("stories")
    .select(
      "id, organization_id, title, summary, category, language, approved_script, sub_headline_media, created_at",
    )
    .eq("id", input.storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (storyError || !story) {
    return fail(storyError?.message ?? "Story not found");
  }

  const contexts = buildPanelDiscoveryContexts(story);
  const targetContexts =
    typeof input.panelIndex === "number"
      ? contexts.filter((c) => c.panelIndex === input.panelIndex)
      : contexts;

  if (targetContexts.length === 0) {
    return fail("No Story Panels found. Add Sub Headlines in Overview first.");
  }

  // Soft-delete prior live run when refreshing full story.
  if (typeof input.panelIndex !== "number") {
    await client
      .from("story_asset_discovery_runs")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: input.userId,
        status: "archived",
      })
      .eq("story_id", input.storyId)
      .is("deleted_at", null);
  }

  let runId: string | null = null;
  if (typeof input.panelIndex === "number") {
    const existing = await getStoryDiscoveryBundle(client, input.storyId);
    runId = existing.data?.run?.id ?? null;
  }

  if (!runId) {
    const { data: created, error: createError } = await client
      .from("story_asset_discovery_runs")
      .insert({
        organization_id: story.organization_id,
        story_id: story.id,
        status: "running",
        panel_count: contexts.length,
        preferred_provider: input.preferredProvider ?? null,
        started_at: new Date().toISOString(),
        created_by: input.userId,
        updated_by: input.userId,
        history: [historyEntry("started", input.userId)],
      })
      .select("*")
      .single();

    if (createError || !created) {
      return fail(createError?.message ?? "Failed to start discovery run");
    }
    runId = asRun(created).id;
  } else {
    await client
      .from("story_asset_discovery_runs")
      .update({
        status: "running",
        preferred_provider:
          input.preferredProvider ?? undefined,
        updated_by: input.userId,
        error: null,
      })
      .eq("id", runId);
  }

  const mediaFilter = input.mediaFilter ?? "both";
  const providers = getEnabledDiscoveryProviders(
    client,
    input.preferredProvider,
  );

  try {
    for (const context of targetContexts) {
      const seedKeywords = extractKeywords(context);
      const expanded = await expandKeywordsWithAI(client, {
        organizationId: story.organization_id,
        userId: input.userId,
        storyId: story.id,
        keywords: seedKeywords,
        sceneHeadline: context.sceneHeadline,
        storyHeadline: context.storyHeadline,
        category: context.category,
        language: context.language,
      });
      const queries = buildSearchQueries({
        context,
        keywords: seedKeywords,
        expandedKeywords: expanded,
        mediaFilter,
      });

      const { data: searchRow, error: searchError } = await client
        .from("story_panel_asset_searches")
        .insert({
          organization_id: story.organization_id,
          story_id: story.id,
          run_id: runId,
          panel_index: context.panelIndex,
          scene_headline: context.sceneHeadline,
          story_headline: context.storyHeadline,
          keywords: seedKeywords,
          expanded_keywords: expanded,
          queries,
          providers_queried: providers.map((p) => p.id),
          context: {
            category: context.category,
            location: context.location,
            entities: context.entities,
            language: context.language,
            date: context.date,
          },
          created_by: input.userId,
        })
        .select("*")
        .single();

      if (searchError || !searchRow) {
        throw new Error(searchError?.message ?? "Failed to store search history");
      }

      // Soft-delete prior pending candidates for this panel (keep accepted/rejected).
      await client
        .from("story_panel_asset_candidates")
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: input.userId,
        })
        .eq("run_id", runId)
        .eq("panel_index", context.panelIndex)
        .eq("status", "pending")
        .is("deleted_at", null);

      const hitBatches = await Promise.all(
        providers.map(async (provider) => {
          try {
            return await provider.search({
              organizationId: story.organization_id,
              storyId: story.id,
              context,
              queries,
              limit: 12,
            });
          } catch (err) {
            console.error("[AssetDiscovery] provider failed", {
              provider: provider.id,
              message: err instanceof Error ? err.message : String(err),
            });
            return [];
          }
        }),
      );

      const ranked = rankAssetHits({
        hits: hitBatches.flat().filter((hit) => {
          if (!isSubHeadlineMediaKind(hit.assetKind)) return false;
          if (mediaFilter === "video") return hit.assetKind === "video";
          if (mediaFilter === "image") return hit.assetKind !== "video";
          return true;
        }),
        context,
        preferredProvider: input.preferredProvider,
        limit: 18,
      });

      if (ranked.length > 0) {
        const { error: insertError } = await client
          .from("story_panel_asset_candidates")
          .insert(
            ranked.map((hit) => ({
              organization_id: story.organization_id,
              story_id: story.id,
              run_id: runId,
              search_id: (searchRow as { id: string }).id,
              panel_index: context.panelIndex,
              provider: hit.provider,
              provider_asset_id: hit.providerAssetId,
              media_asset_id: hit.mediaAssetId ?? null,
              asset_kind: hit.assetKind,
              title: hit.title,
              thumbnail_url: hit.thumbnailUrl ?? null,
              preview_url: hit.previewUrl ?? null,
              source_url: hit.sourceUrl ?? null,
              license_info: hit.licenseInfo ?? "",
              resolution: hit.resolution ?? "",
              aspect_ratio: hit.aspectRatio ?? "",
              orientation: hit.orientation ?? "",
              relevance_score: hit.relevanceScore,
              confidence: hit.confidence,
              rank: hit.rank,
              status: "pending",
              metadata: hit.metadata ?? {},
              created_by: input.userId,
              updated_by: input.userId,
            })),
          );
        if (insertError) throw new Error(insertError.message);
      }
    }

    await client
      .from("story_asset_discovery_runs")
      .update({
        status: "ready",
        panel_count: contexts.length,
        completed_at: new Date().toISOString(),
        updated_by: input.userId,
        error: null,
      })
      .eq("id", runId);

    const bundle = await getStoryDiscoveryBundle(client, input.storyId);
    if (bundle.error || !bundle.data?.run) {
      return fail(bundle.error ?? "Discovery finished but bundle missing");
    }
    return ok({ run: bundle.data.run, panels: bundle.data.panels });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery failed";
    await client
      .from("story_asset_discovery_runs")
      .update({
        status: "failed",
        error: message,
        updated_by: input.userId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return fail(message);
  }
}

function kindFromCandidate(assetKind: string): SubHeadlineMediaKind {
  return assetKind === "video" ? "video" : "image";
}

/**
 * Accept a candidate → bind to Story Panel media. Never touches Scene Instances.
 */
export async function acceptAssetCandidate(
  client: Client,
  input: {
    candidateId: string;
    userId: string;
    note?: string;
  },
): Promise<Result<AssetCandidateRow>> {
  const { data: candidate, error } = await client
    .from("story_panel_asset_candidates")
    .select("*")
    .eq("id", input.candidateId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !candidate) {
    return fail(error?.message ?? "Candidate not found");
  }

  const row = asCandidate(candidate);

  // Clear previous accepted for this panel.
  await client
    .from("story_panel_asset_candidates")
    .update({
      status: "replaced",
      decided_by: input.userId,
      decided_at: new Date().toISOString(),
      updated_by: input.userId,
    })
    .eq("story_id", row.story_id)
    .eq("panel_index", row.panel_index)
    .eq("status", "accepted")
    .is("deleted_at", null)
    .neq("id", row.id);

  const { data: updated, error: updateError } = await client
    .from("story_panel_asset_candidates")
    .update({
      status: "accepted",
      decided_by: input.userId,
      decided_at: new Date().toISOString(),
      decision_note: input.note ?? null,
      updated_by: input.userId,
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return fail(updateError?.message ?? "Failed to accept candidate");
  }

  // Bind to stories.sub_headline_media only when we have a library asset.
  if (row.media_asset_id) {
    const { data: story } = await client
      .from("stories")
      .select("id, organization_id, sub_headline_media")
      .eq("id", row.story_id)
      .maybeSingle();

    if (story) {
      const slots = parseSubHeadlineMedia(story.sub_headline_media);
      const index = row.panel_index;
      while (slots.length <= index) {
        slots.push({ kind: "", ref: "", caption: "" });
      }
      slots[index] = {
        kind: kindFromCandidate(row.asset_kind),
        ref: toLibraryMediaRef(row.media_asset_id),
        caption: slots[index]?.caption ?? "",
      };

      await client
        .from("stories")
        .update({
          sub_headline_media: serializeSubHeadlineMedia(slots),
          updated_by: input.userId,
        })
        .eq("id", row.story_id);

      const attached = await attachAssetToStory(client, input.userId, {
        organizationId: story.organization_id,
        storyId: row.story_id,
        mediaAssetId: row.media_asset_id,
        label: `Panel ${index + 1} · approved discovery`,
      });
      // Unique story_media links may already exist — non-fatal.
      if (attached.error && !/duplicate|unique/i.test(attached.error)) {
        console.warn("[AssetDiscovery] story_media attach", attached.error);
      }
    }
  }

  return ok(asCandidate(updated));
}

export async function rejectAssetCandidate(
  client: Client,
  input: { candidateId: string; userId: string; note?: string },
): Promise<Result<AssetCandidateRow>> {
  const { data: updated, error } = await client
    .from("story_panel_asset_candidates")
    .update({
      status: "rejected",
      decided_by: input.userId,
      decided_at: new Date().toISOString(),
      decision_note: input.note ?? null,
      updated_by: input.userId,
    })
    .eq("id", input.candidateId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !updated) {
    return fail(error?.message ?? "Failed to reject candidate");
  }
  return ok(asCandidate(updated));
}

export async function setPreferredDiscoveryProvider(
  client: Client,
  input: {
    storyId: string;
    userId: string;
    provider: AssetDiscoveryProviderId | null;
  },
): Promise<Result<AssetDiscoveryRunRow>> {
  const { data, error } = await client
    .from("story_asset_discovery_runs")
    .update({
      preferred_provider: input.provider,
      updated_by: input.userId,
    })
    .eq("story_id", input.storyId)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) return fail(error.message);
  if (!data) return fail("No discovery run yet. Search first.");
  return ok(asRun(data));
}
