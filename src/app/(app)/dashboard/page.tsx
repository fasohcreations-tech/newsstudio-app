import type { Metadata } from "next";
import Link from "next/link";
import {
  Clapperboard,
  Inbox,
  Library,
  Newspaper,
  Radio,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/shared/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getStoryDashboardStats } from "@/features/newsroom/services/story.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StoryStatusBadge } from "@/features/newsroom/components/story-status-badge";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppBreadcrumbs } from "@/features/platform/components/app-breadcrumbs";
import { EmptyState } from "@/features/platform/components/empty-state";
import { StatusDot } from "@/features/platform/components/empty-state";
import * as AIJobManager from "@/features/ai/services/ai-job-manager";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireAuth("/dashboard");
  const supabase = await createClient();

  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error: membershipError } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  const displayName = profile?.full_name?.trim() || profile?.email || user.email;

  if (!membership) {
    return (
      <div>
        <PageHeader
          title={`Welcome${displayName ? `, ${displayName}` : ""}`}
          description="MediaOS is ready. Organization context is required for the newsroom."
        />
        <Alert variant="destructive">
          <AlertTitle>No organization</AlertTitle>
          <AlertDescription>
            {membershipError ??
              "Unable to resolve an organization for this account."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const orgId = membership.organization.id;
  const [{ stats, error: statsError }, { stats: aiStats }] = await Promise.all([
    getStoryDashboardStats(supabase, orgId),
    AIJobManager.getUsageStats(supabase, orgId),
  ]);

  const editorialQueue =
    stats?.recentStories.filter(
      (s) => s.status === "draft" || s.status === "review" || s.status === "in_progress",
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <AppBreadcrumbs items={[{ label: "Command center" }]} />
        <PageHeader
          title={`Newsroom command center`}
          description={`${membership.organization.name} · ${displayName ?? "Editor"}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/intake"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Intake
              </Link>
              <Link href="/newsroom/new" className={cn(buttonVariants())}>
                Create story
              </Link>
            </div>
          }
        />
      </div>

      {statsError ? (
        <Alert>
          <AlertTitle>Story stats unavailable</AlertTitle>
          <AlertDescription>{statsError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's drafts" value={stats?.draftCount ?? 0} href="/newsroom" />
        <MetricCard label="Editorial review" value={stats?.reviewCount ?? 0} href="/newsroom" />
        <MetricCard
          label="Published today"
          value={stats?.publishedTodayCount ?? 0}
          href="/newsroom"
        />
        <MetricCard label="AI jobs (total)" value={aiStats.totalJobs} href="/ai-center" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/60 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Today&apos;s stories</CardTitle>
              <CardDescription>Recent desk activity</CardDescription>
            </div>
            <Link
              href="/newsroom"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Open newsroom
            </Link>
          </CardHeader>
          <CardContent>
            {!stats?.recentStories.length ? (
              <EmptyState
                title="No stories yet"
                description="Create a story or import from News Intake."
                action={
                  <Link href="/newsroom/new" className={cn(buttonVariants({ size: "sm" }))}>
                    Create story
                  </Link>
                }
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {stats.recentStories.map((story) => (
                  <li
                    key={story.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/newsroom/stories/${story.id}`}
                        className="block truncate font-medium underline-offset-2 hover:underline"
                      >
                        {story.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Updated <RelativeTime value={story.updated_at} />
                      </p>
                    </div>
                    <StoryStatusBadge status={story.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Jump into production</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickLink href="/newsroom/new" icon={Newspaper} label="Create story" />
            <QuickLink href="/intake" icon={Inbox} label="News intake" />
            <QuickLink href="/media-library" icon={Library} label="Media library" />
            <QuickLink href="/media-library" icon={Upload} label="Upload media" />
            <QuickLink href="/ai-center" icon={Sparkles} label="AI Center" />
            <QuickLink href="/publishing" icon={Send} label="Publishing" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QueueCard
          title="Editorial queue"
          description="Drafts and reviews needing attention"
          empty="Queue is clear."
          items={editorialQueue.slice(0, 5).map((s) => ({
            id: s.id,
            label: s.title,
            href: `/newsroom/stories/${s.id}`,
            meta: s.status,
          }))}
        />
        <QueueCard
          title="Publishing queue"
          description="Placeholder — adapters deferred"
          empty="No publish jobs yet."
          items={[]}
          footer={<StatusDot tone="neutral" label="Publishing idle" />}
        />
        <QueueCard
          title="AI usage"
          description="Orchestrator ledger summary"
          empty="No AI jobs recorded."
          items={[
            {
              id: "ai-ok",
              label: `${aiStats.succeeded} completed`,
              href: "/ai-center",
              meta: "succeeded",
            },
            {
              id: "ai-fail",
              label: `${aiStats.failed} failed`,
              href: "/ai-center",
              meta: "failed",
            },
            {
              id: "ai-tokens",
              label: `${aiStats.tokensUsed.toLocaleString()} tokens`,
              href: "/ai-center",
              meta: "usage",
            },
          ]}
        />
        <QueueCard
          title="BroadcastOS status"
          description="Playout integration placeholder"
          empty="BroadcastOS offline for this sprint."
          items={[]}
          footer={<StatusDot tone="neutral" label="Broadcast idle" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Media upload queue</CardTitle>
            <CardDescription>Realtime upload status placeholder</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/70 px-4 py-6">
              <Upload className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No active uploads</p>
                <p className="text-xs text-muted-foreground">
                  Drag files into Media Library to start.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Desk + system events</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Clapperboard className="size-3.5" />
                MediaOS command center online
              </li>
              <li className="flex items-center gap-2">
                <Radio className="size-3.5" />
                BroadcastOS status: placeholder
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="size-3.5" />
                AI Orchestrator ready · {aiStats.totalJobs} jobs logged
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="border-border/60 transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-muted/40"
    >
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </Link>
  );
}

function QueueCard({
  title,
  description,
  empty,
  items,
  footer,
}: {
  title: string;
  description: string;
  empty: string;
  items: Array<{ id: string; label: string; href: string; meta?: string }>;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!items.length ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-2 text-sm hover:underline"
                >
                  <span className="truncate">{item.label}</span>
                  {item.meta ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.meta}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}
