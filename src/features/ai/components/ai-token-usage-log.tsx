"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  formatJobCost,
  formatTokenCount,
  readJobPromptId,
} from "@/features/ai/lib/ai-job-display";
import {
  AI_JOB_STATUS_LABELS,
  AI_PROVIDER_IDS,
  type AIUsageStats,
} from "@/features/ai/types/ai";
import type { AiJobStatus } from "@/shared/types/database.types";
import { cn } from "@/lib/utils";

export type TokenUsageLogQuery = {
  page: number;
  pageSize: number;
  status: string;
  provider: string;
  jobType: string;
  from: string;
  to: string;
  tokensOnly: boolean;
};

type AiTokenUsageLogProps = {
  jobs: AiJob[];
  total: number;
  stats: AIUsageStats;
  jobTypes: string[];
  query: TokenUsageLogQuery;
  error?: string | null;
};

const STATUS_OPTIONS: Array<AiJobStatus | "all"> = [
  "all",
  "succeeded",
  "failed",
  "running",
  "queued",
  "cancelled",
];

function buildHref(next: Partial<TokenUsageLogQuery>, current: TokenUsageLogQuery) {
  const merged = { ...current, ...next };
  const params = new URLSearchParams();
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.pageSize !== 25) params.set("pageSize", String(merged.pageSize));
  if (merged.status !== "all") params.set("status", merged.status);
  if (merged.provider !== "all") params.set("provider", merged.provider);
  if (merged.jobType !== "all") params.set("jobType", merged.jobType);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  if (merged.tokensOnly) params.set("tokensOnly", "1");
  const qs = params.toString();
  return qs ? `/ai-center/usage?${qs}` : "/ai-center/usage";
}

export function AiTokenUsageLog({
  jobs,
  total,
  stats,
  jobTypes,
  query,
  error,
}: AiTokenUsageLogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  function navigate(next: Partial<TokenUsageLogQuery>) {
    startTransition(() => {
      router.push(buildHref(next, query));
    });
  }

  return (
    <div className={cn("space-y-6", pending && "opacity-80")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Jobs in filter" value={String(stats.totalJobs)} />
        <StatCard
          title="Tokens used"
          value={stats.tokensUsed.toLocaleString()}
        />
        <StatCard
          title="Estimated cost"
          value={`$${stats.estimatedCost.toFixed(4)}`}
        />
        <StatCard title="Succeeded" value={String(stats.succeeded)} />
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            App-wide token ledger from <code className="text-xs">ai_jobs</code>.
            Every Orchestrator call records tokens and estimated cost here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              navigate({
                page: 1,
                from: String(form.get("from") ?? ""),
                to: String(form.get("to") ?? ""),
                tokensOnly: form.get("tokensOnly") === "on",
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                name="from"
                type="date"
                defaultValue={query.from.slice(0, 10)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                name="to"
                type="date"
                defaultValue={query.to.slice(0, 10)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={query.status}
                onValueChange={(value) =>
                  navigate({ page: 1, status: value ?? "all" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all"
                        ? "All statuses"
                        : AI_JOB_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select
                value={query.provider}
                onValueChange={(value) =>
                  navigate({ page: 1, provider: value ?? "all" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All providers</SelectItem>
                  {AI_PROVIDER_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Job type</Label>
              <Select
                value={query.jobType}
                onValueChange={(value) =>
                  navigate({ page: 1, jobType: value ?? "all" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All job types</SelectItem>
                  {jobTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="tokensOnly"
                  defaultChecked={query.tokensOnly}
                  className="size-4 rounded border-border"
                />
                Tokens &gt; 0 only
              </label>
              <Button type="submit" size="sm">
                Apply dates
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  navigate({
                    page: 1,
                    status: "all",
                    provider: "all",
                    jobType: "all",
                    from: "",
                    to: "",
                    tokensOnly: false,
                  })
                }
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Token usage log</CardTitle>
            <CardDescription>
              {total.toLocaleString()} jobs · page {query.page} of {totalPages}
            </CardDescription>
          </div>
          <Link
            href="/ai-center"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← AI Center
          </Link>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No AI jobs match these filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">ms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const promptId = readJobPromptId(job);
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          <RelativeTime value={job.created_at} />
                        </TableCell>
                        <TableCell className="max-w-[14rem]">
                          <p className="truncate font-medium text-sm">
                            {job.job_type}
                          </p>
                          {job.story_id ? (
                            <Link
                              href={`/newsroom/stories/${job.story_id}`}
                              className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                            >
                              Story
                            </Link>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              Org-level
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[10rem]">
                          {promptId ? (
                            <Badge variant="secondary" className="max-w-full truncate text-[10px]">
                              {promptId}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.provider}
                          {job.model ? (
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {job.model}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              job.status === "succeeded"
                                ? "secondary"
                                : job.status === "failed"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="text-[10px]"
                          >
                            {AI_JOB_STATUS_LABELS[job.status] ?? job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatTokenCount(job.tokens_used)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatJobCost(job.cost)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                          {job.processing_time_ms != null
                            ? job.processing_time_ms.toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={query.page <= 1}
                onClick={() => navigate({ page: query.page - 1 })}
              >
                Previous
              </Button>
              <p className="text-xs text-muted-foreground">
                Page {query.page} / {totalPages}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={query.page >= totalPages}
                onClick={() => navigate({ page: query.page + 1 })}
              >
                Next
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
