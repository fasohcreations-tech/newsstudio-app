/**
 * Rank provider hits by relevance to Story Panel context.
 */

import type {
  ProviderHit,
  RankedAssetCandidate,
  StoryPanelDiscoveryContext,
} from "@/features/ai-asset-discovery/types/discovery.types";

function tokenize(...parts: string[]): Set<string> {
  const set = new Set<string>();
  for (const part of parts) {
    for (const token of part
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)) {
      if (token.length > 2) set.add(token);
    }
  }
  return set;
}

function overlapScore(needle: Set<string>, haystack: string): number {
  if (needle.size === 0) return 0;
  const hay = tokenize(haystack);
  let hits = 0;
  for (const t of needle) {
    if (hay.has(t)) hits += 1;
  }
  return hits / needle.size;
}

const KIND_WEIGHT: Record<string, number> = {
  video: 1,
  image: 0.95,
  illustration: 0.85,
  infographic: 0.8,
  map: 0.75,
  chart: 0.7,
  screenshot: 0.65,
  logo: 0.55,
  icon: 0.5,
  document: 0.45,
  pdf: 0.45,
  other: 0.3,
};

/**
 * Score + sort hits. Does not mutate provider results beyond ranking fields.
 */
export function rankAssetHits(input: {
  hits: ProviderHit[];
  context: StoryPanelDiscoveryContext;
  preferredProvider?: string | null;
  limit?: number;
}): RankedAssetCandidate[] {
  const { hits, context, preferredProvider, limit = 24 } = input;
  const needles = tokenize(
    context.sceneHeadline,
    context.storyHeadline,
    context.category,
    context.location,
    ...context.keywords,
    ...context.entities,
  );

  const scored = hits.map((hit) => {
    const titleScore = overlapScore(
      needles,
      `${hit.title} ${hit.providerAssetId} ${JSON.stringify(hit.metadata ?? {})}`,
    );
    const kindBoost = KIND_WEIGHT[hit.assetKind] ?? 0.4;
    const providerBoost =
      preferredProvider && hit.provider === preferredProvider ? 0.08 : 0;
    const prior = Math.max(0, Math.min(1, hit.providerScore ?? 0.5));
    const previouslyUsedBoost =
      hit.provider === "previously_used" ? 0.06 : 0;

    const relevanceScore = Math.max(
      0,
      Math.min(
        1,
        titleScore * 0.55 + prior * 0.25 + kindBoost * 0.12 + providerBoost + previouslyUsedBoost,
      ),
    );

    const confidence = Math.max(
      0.15,
      Math.min(0.98, relevanceScore * 0.7 + prior * 0.3),
    );

    return {
      ...hit,
      relevanceScore: Number(relevanceScore.toFixed(4)),
      confidence: Number(confidence.toFixed(4)),
      rank: 0,
    } satisfies RankedAssetCandidate;
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Deduplicate by media asset / provider asset id
  const seen = new Set<string>();
  const unique: RankedAssetCandidate[] = [];
  for (const item of scored) {
    const key =
      item.mediaAssetId ||
      `${item.provider}:${item.providerAssetId}` ||
      item.sourceUrl ||
      item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= limit) break;
  }

  return unique.map((item, index) => ({ ...item, rank: index + 1 }));
}
