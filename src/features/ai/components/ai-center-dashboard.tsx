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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import type { AiJob } from "@/features/content/types/content.types";
import {
  AI_JOB_STATUS_LABELS,
  type AIOrgSettings,
  type AIUsageStats,
  type ProviderHealth,
  type ProviderKeyPresence,
} from "@/features/ai/types/ai";
import { AI_PROVIDER_IDS } from "@/features/ai/types/ai";

const PROVIDER_LABELS: Record<(typeof AI_PROVIDER_IDS)[number], string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude",
  ollama: "Ollama",
};

type AICenterDashboardProps = {
  settings: AIOrgSettings;
  health: ProviderHealth[];
  jobs: AiJob[];
  stats: AIUsageStats;
  keyPresence: ProviderKeyPresence;
  jobsError?: string | null;
};

function healthBadgeVariant(
  status: ProviderHealth["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "healthy") return "default";
  if (status === "error") return "destructive";
  if (status === "disabled") return "outline";
  return "secondary";
}

export function AICenterDashboard({
  settings,
  health,
  jobs,
  stats,
  keyPresence,
  jobsError,
}: AICenterDashboardProps) {
  const healthById = Object.fromEntries(
    health.map((h) => [h.providerId, h]),
  ) as Partial<Record<(typeof AI_PROVIDER_IDS)[number], ProviderHealth>>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/settings/ai"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          AI Settings
        </Link>
        <Link
          href="/ai-center/gemini-test"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Gemini Test
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total jobs" value={String(stats.totalJobs)} />
        <StatCard title="Completed" value={String(stats.succeeded)} />
        <StatCard title="Failed" value={String(stats.failed)} />
        <StatCard
          title="Tokens used"
          value={stats.tokensUsed.toLocaleString()}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Available providers</CardTitle>
            <CardDescription>
              Default: {PROVIDER_LABELS[settings.defaultProvider]} ·{" "}
              {settings.preferredModel}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AI_PROVIDER_IDS.map((id) => {
              const enabled = settings.providers[id]?.enabled;
              const configured = keyPresence[id]?.configured;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{PROVIDER_LABELS[id]}</p>
                    <p className="text-xs text-muted-foreground">
                      {settings.providers[id]?.preferredModel ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Badge variant={enabled ? "default" : "outline"}>
                      {enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Badge variant={configured ? "secondary" : "outline"}>
                      {configured ? "Configured" : "No key"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Provider health</CardTitle>
            <CardDescription>
              Credential presence checks only — live generation is deferred.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AI_PROVIDER_IDS.map((id) => {
              const row = healthById[id];
              return (
                <div
                  key={id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{PROVIDER_LABELS[id]}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row?.message ?? "Not checked"}
                    </p>
                  </div>
                  <Badge variant={healthBadgeVariant(row?.status ?? "unconfigured")}>
                    {row?.status ?? "unknown"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent AI jobs</CardTitle>
            <CardDescription>
              From <code className="text-xs">ai_jobs</code> for this organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobsError ? (
              <p className="text-sm text-destructive">{jobsError}</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No AI jobs yet. Modules will enqueue work through the
                Orchestrator.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.job_type}</TableCell>
                      <TableCell>
                        {job.provider}
                        {job.model ? (
                          <span className="block text-xs text-muted-foreground">
                            {job.model}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {AI_JOB_STATUS_LABELS[job.status] ?? job.status}
                      </TableCell>
                      <TableCell>
                        <RelativeTime value={job.updated_at} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Cost summary</CardTitle>
            <CardDescription>Placeholder until billing adapters land.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                ${stats.estimatedCost.toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground">
                Estimated from recorded job costs (USD)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border border-border/50 p-2">
                <p className="text-muted-foreground">Queued</p>
                <p className="font-medium">{stats.queued}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2">
                <p className="text-muted-foreground">Running</p>
                <p className="font-medium">{stats.running}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2">
                <p className="text-muted-foreground">Cancelled</p>
                <p className="font-medium">{stats.cancelled}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2">
                <p className="text-muted-foreground">Failed</p>
                <p className="font-medium">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
