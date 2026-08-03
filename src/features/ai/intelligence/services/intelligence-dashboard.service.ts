import type { SupabaseClient } from "@supabase/supabase-js";

import { AI_INTELLIGENCE_DOMAINS } from "@/features/ai/intelligence/types/intelligence.types";
import type {
  AIIntelligenceDomain,
  AIRecommendation,
  IntelligenceDashboardSnapshot,
  IntelligenceServiceResult,
} from "@/features/ai/intelligence/types/intelligence.types";
import { listRecommendations } from "@/features/ai/intelligence/services/recommendation.service";
import { AI_JOB_SELECT } from "@/features/content/services/ai-job.service";

type Client = SupabaseClient;

function emptyDomainCounts(): IntelligenceDashboardSnapshot["byDomain"] {
  return Object.fromEntries(
    AI_INTELLIGENCE_DOMAINS.map((domain) => [
      domain,
      { pending: 0, accepted: 0, rejected: 0 },
    ]),
  ) as IntelligenceDashboardSnapshot["byDomain"];
}

/**
 * Aggregates recommendation + job queue state for the AI Center dashboard.
 */
export async function getIntelligenceDashboard(
  client: Client,
  organizationId: string,
): Promise<IntelligenceServiceResult<IntelligenceDashboardSnapshot>> {
  const listed = await listRecommendations(client, organizationId, {
    limit: 80,
  });
  if (listed.error && !listed.data) {
    return { data: null, error: listed.error };
  }

  const byDomain = emptyDomainCounts();
  const recent = listed.data ?? [];

  for (const row of recent) {
    const bucket = byDomain[row.domain as AIIntelligenceDomain];
    if (!bucket) continue;
    if (row.status === "pending") bucket.pending += 1;
    else if (row.status === "accepted") bucket.accepted += 1;
    else if (row.status === "rejected") bucket.rejected += 1;
  }

  const timelineDrafts = recent.filter(
    (row) =>
      row.domain === "timeline" &&
      (row.status === "pending" || row.status === "accepted"),
  );

  const broadcastHealth = recent.filter(
    (row) => row.domain === "broadcast" && row.status === "pending",
  );

  const { data: jobs } = await client
    .from("ai_jobs")
    .select(AI_JOB_SELECT)
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(20);

  const queue = (jobs ?? [])
    .filter((job) => job.status === "queued" || job.status === "running")
    .map((job) => ({
      id: job.id,
      job_type: job.job_type,
      status: job.status,
      provider: job.provider,
      updated_at: job.updated_at,
    }));

  const voiceJobs = (jobs ?? [])
    .filter((job) => job.job_type.startsWith("intelligence.voice"))
    .slice(0, 10)
    .map((job) => ({
      id: job.id,
      job_type: job.job_type,
      status: job.status,
      updated_at: job.updated_at,
    }));

  return {
    data: {
      byDomain,
      recent: recent.slice(0, 25),
      queue,
      timelineDrafts: timelineDrafts.slice(0, 8),
      voiceJobs,
      broadcastHealth: broadcastHealth.slice(0, 5),
    },
    error: null,
  };
}

export type { AIRecommendation };
