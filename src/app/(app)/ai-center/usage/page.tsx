import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/shared/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import * as AIJobManager from "@/features/ai/services/ai-job-manager";
import { AiTokenUsageLog } from "@/features/ai/components/ai-token-usage-log";
import type { AiJobStatus } from "@/shared/types/database.types";

export const metadata: Metadata = { title: "AI Token Usage" };

type UsagePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toStartOfDayIso(dateOnly: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return `${dateOnly}T00:00:00.000Z`;
}

function toEndOfDayIso(dateOnly: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return `${dateOnly}T23:59:59.999Z`;
}

export default async function AiTokenUsagePage({ searchParams }: UsagePageProps) {
  const user = await requireAuth("/ai-center/usage");
  const params = await searchParams;
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error: membershipError } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership) {
    return (
      <div>
        <PageHeader
          title="AI Token Usage"
          description="Organization-wide AI token and cost ledger."
        />
        <Alert variant="destructive">
          <AlertTitle>No organization</AlertTitle>
          <AlertDescription>
            {membershipError ?? "Organization context is required."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const page = Math.max(1, Number(firstParam(params.page) ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(firstParam(params.pageSize) ?? "25") || 25),
  );
  const statusRaw = firstParam(params.status) ?? "all";
  const provider = firstParam(params.provider) ?? "all";
  const jobType = firstParam(params.jobType) ?? "all";
  const fromDate = firstParam(params.from) ?? "";
  const toDate = firstParam(params.to) ?? "";
  const tokensOnly = firstParam(params.tokensOnly) === "1";

  const status =
    statusRaw === "all" ||
    statusRaw === "queued" ||
    statusRaw === "running" ||
    statusRaw === "succeeded" ||
    statusRaw === "failed" ||
    statusRaw === "cancelled"
      ? (statusRaw as AiJobStatus | "all")
      : "all";

  const orgId = membership.organization.id;
  const [{ data, error }, { jobTypes }] = await Promise.all([
    AIJobManager.listTokenUsageLog(supabase, {
      organizationId: orgId,
      page,
      pageSize,
      status,
      provider,
      jobType,
      from: fromDate ? toStartOfDayIso(fromDate) : null,
      to: toDate ? toEndOfDayIso(toDate) : null,
      tokensOnly,
    }),
    AIJobManager.listJobTypesForOrg(supabase, orgId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Token Usage"
        description={`${membership.organization.name} · tokens & estimated cost across all AI jobs`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/ai-center"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              AI Center
            </Link>
            <Link
              href="/settings/ai"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              AI Settings
            </Link>
          </div>
        }
      />

      <AiTokenUsageLog
        jobs={data?.jobs ?? []}
        total={data?.total ?? 0}
        stats={
          data?.stats ?? {
            totalJobs: 0,
            queued: 0,
            running: 0,
            succeeded: 0,
            failed: 0,
            cancelled: 0,
            tokensUsed: 0,
            estimatedCost: 0,
          }
        }
        jobTypes={jobTypes}
        query={{
          page: data?.page ?? page,
          pageSize: data?.pageSize ?? pageSize,
          status,
          provider,
          jobType,
          from: fromDate,
          to: toDate,
          tokensOnly,
        }}
        error={error}
      />
    </div>
  );
}
