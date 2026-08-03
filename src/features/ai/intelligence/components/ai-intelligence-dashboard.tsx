import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AI_INTELLIGENCE_DOMAINS } from "@/features/ai/intelligence/types/intelligence.types";
import { AI_INTELLIGENCE_DOMAIN_LABELS } from "@/features/ai/intelligence/constants/intelligence.constants";
import type { IntelligenceDashboardSnapshot } from "@/features/ai/intelligence/types/intelligence.types";
import { RecommendationList } from "@/features/ai/intelligence/components/recommendation-list";
import { RelativeTime } from "@/features/newsroom/components/relative-time";

type AIIntelligenceDashboardProps = {
  snapshot: IntelligenceDashboardSnapshot;
  snapshotError?: string | null;
};

export function AIIntelligenceDashboard({
  snapshot,
  snapshotError,
}: AIIntelligenceDashboardProps) {
  const storyPending = snapshot.recent.filter(
    (r) => r.domain === "story" && r.status === "pending",
  );
  const scenePending = snapshot.recent.filter(
    (r) => r.domain === "scene" && r.status === "pending",
  );
  const assetPending = snapshot.recent.filter(
    (r) => r.domain === "asset" && r.status === "pending",
  );
  const graphicsPending = snapshot.recent.filter(
    (r) => r.domain === "graphics" && r.status === "pending",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Intelligence platform
          </h2>
          <p className="text-sm text-muted-foreground">
            Recommendations only — editors must accept or reject. AI never
            generates final videos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/newsroom"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Stories
          </Link>
          <Link
            href="/creative-studio/scenes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Scene Library
          </Link>
          <Link
            href="/creative-studio"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Timeline
          </Link>
          <Link
            href="/media-library"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Media
          </Link>
          <Link
            href="/broadcast"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            BroadcastOS
          </Link>
        </div>
      </div>

      {snapshotError ? (
        <p className="text-sm text-destructive">
          Intelligence ledger unavailable ({snapshotError}). Apply migration{" "}
          <code className="text-xs">20260324000019_ai_center_intelligence</code>.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {AI_INTELLIGENCE_DOMAINS.map((domain) => {
          const counts = snapshot.byDomain[domain];
          return (
            <Card key={domain} className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription>
                  {AI_INTELLIGENCE_DOMAIN_LABELS[domain]}
                </CardDescription>
                <CardTitle className="text-xl">{counts.pending} pending</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2 text-xs text-muted-foreground">
                <span>{counts.accepted} accepted</span>
                <span>·</span>
                <span>{counts.rejected} rejected</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Story suggestions</CardTitle>
            <CardDescription>
              Headline, summary, SEO, Manglish, grammar, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecommendationList
              items={storyPending}
              emptyMessage="No pending story suggestions."
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Scene recommendations</CardTitle>
            <CardDescription>
              Template matches from the Scene Library.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecommendationList
              items={scenePending}
              emptyMessage="No pending scene recommendations."
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Timeline draft status</CardTitle>
            <CardDescription>
              Editable AI drafts only — never rendered video.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecommendationList
              items={snapshot.timelineDrafts}
              emptyMessage="No timeline drafts yet. Generate from Creative Studio AI."
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Asset analysis</CardTitle>
            <CardDescription>
              Tags, OCR, descriptions, and duplicate signals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecommendationList
              items={assetPending}
              emptyMessage="No pending asset analyses."
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Graphics recommendations</CardTitle>
            <CardDescription>
              Themes, palettes, typography, and motion presets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecommendationList
              items={graphicsPending}
              emptyMessage="No pending graphics recommendations."
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Voice jobs</CardTitle>
            <CardDescription>
              STT, TTS planning, pronunciation, subtitles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.voiceJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent voice intelligence jobs.
              </p>
            ) : (
              <ul className="space-y-2">
                {snapshot.voiceJobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate font-medium">{job.job_type}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline">{job.status}</Badge>
                      <RelativeTime value={job.updated_at} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Broadcast health</CardTitle>
            <CardDescription>
              Bitrate, audio levels, safe title, subtitle readability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecommendationList
              items={snapshot.broadcastHealth}
              emptyMessage="No broadcast health checks pending."
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>AI processing queue</CardTitle>
            <CardDescription>
              Queued and running jobs across MediaOS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Queue is idle.</p>
            ) : (
              <ul className="space-y-2">
                {snapshot.queue.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{job.job_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.provider}
                      </p>
                    </div>
                    <Badge
                      variant={
                        job.status === "running" ? "default" : "secondary"
                      }
                    >
                      {job.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
