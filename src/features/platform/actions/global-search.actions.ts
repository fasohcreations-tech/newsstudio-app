"use server";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";

export type GlobalSearchHit = {
  id: string;
  kind: "story" | "asset" | "user" | "organization" | "ai_job";
  title: string;
  subtitle?: string;
  href: string;
};

export type GlobalSearchResult = {
  hits: GlobalSearchHit[];
  error: string | null;
};

/**
 * Cross-entity search for Command Palette / Global Search.
 * AI jobs are a placeholder group until execution lands.
 */
export async function globalSearchAction(
  query: string,
): Promise<GlobalSearchResult> {
  const q = query.trim();
  if (q.length < 1) {
    return { hits: [], error: null };
  }

  const user = await requireAuth();
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error: membershipError } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return {
      hits: [],
      error: membershipError ?? "Organization required for search.",
    };
  }

  const orgId = membership.organization.id;
  const pattern = `%${q}%`;
  const hits: GlobalSearchHit[] = [];

  const [stories, assets, members, orgs] = await Promise.all([
    supabase
      .from("stories")
      .select("id, title, status")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .ilike("title", pattern)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("media_assets")
      .select("id, name, file_type")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .ilike("name", pattern)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("organization_members")
      .select("user_id, profiles!inner(id, full_name, email)")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(40),
    supabase
      .from("organizations")
      .select("id, name, slug")
      .is("deleted_at", null)
      .ilike("name", pattern)
      .limit(4),
  ]);

  for (const story of stories.data ?? []) {
    hits.push({
      id: story.id,
      kind: "story",
      title: story.title,
      subtitle: `Story · ${story.status}`,
      href: `/newsroom/stories/${story.id}`,
    });
  }

  for (const asset of assets.data ?? []) {
    hits.push({
      id: asset.id,
      kind: "asset",
      title: asset.name,
      subtitle: `Asset · ${asset.file_type}`,
      href: `/media-library?asset=${asset.id}`,
    });
  }

  const qLower = q.toLowerCase();
  for (const row of members.data ?? []) {
    const p = row.profiles as unknown as {
      id: string;
      full_name: string | null;
      email: string;
    };
    const hay = `${p.full_name ?? ""} ${p.email}`.toLowerCase();
    if (!hay.includes(qLower)) continue;
    hits.push({
      id: p.id,
      kind: "user",
      title: p.full_name?.trim() || p.email,
      subtitle: p.email,
      href: "/administration/members",
    });
    if (hits.filter((h) => h.kind === "user").length >= 6) break;
  }

  for (const org of orgs.data ?? []) {
    hits.push({
      id: org.id,
      kind: "organization",
      title: org.name,
      subtitle: org.slug,
      href: "/administration/organization",
    });
  }

  // Placeholder AI jobs group — always surface when query matches "ai"
  if (/ai|job/i.test(q)) {
    hits.push({
      id: "ai-jobs-placeholder",
      kind: "ai_job",
      title: "AI Jobs (coming soon)",
      subtitle: "Future AI job search will list here",
      href: "/ai-center",
    });
  }

  const error =
    stories.error?.message ||
    assets.error?.message ||
    members.error?.message ||
    orgs.error?.message ||
    null;

  return { hits, error };
}
