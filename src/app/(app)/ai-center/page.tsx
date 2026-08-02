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
import { getAIOrgSettings } from "@/features/ai/services/ai-settings.service";
import { checkAllProvidersHealth } from "@/features/ai/services/ai-orchestrator";
import * as AIJobManager from "@/features/ai/services/ai-job-manager";
import { getProviderKeyPresence } from "@/features/ai/lib/server-env";
import { AICenterDashboard } from "@/features/ai/components/ai-center-dashboard";

export const metadata: Metadata = { title: "AI Center" };

export default async function AiCenterPage() {
  const user = await requireAuth("/ai-center");
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
          title="AI Center"
          description="Central AI Orchestrator dashboard for MediaOS."
        />
        <Alert variant="destructive">
          <AlertTitle>No organization</AlertTitle>
          <AlertDescription>
            {membershipError ??
              "Organization context is required for AI Center."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const orgId = membership.organization.id;
  const [{ settings }, health, { jobs, error: jobsError }, { stats }] =
    await Promise.all([
      getAIOrgSettings(supabase, orgId),
      checkAllProvidersHealth(supabase, orgId),
      AIJobManager.listRecentJobs(supabase, orgId, 15),
      AIJobManager.getUsageStats(supabase, orgId),
    ]);

  return (
    <div>
      <PageHeader
        title="AI Center"
        description={`${membership.organization.name} · Provider-agnostic orchestration`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/ai-center/smart-editor"
              className={cn(buttonVariants())}
            >
              Smart Editor
            </Link>
            <Link
              href="/ai-center/gemini-test"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Gemini Test
            </Link>
            <Link
              href="/settings/ai"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Configure AI
            </Link>
          </div>
        }
      />
      <AICenterDashboard
        settings={settings}
        health={health}
        jobs={jobs}
        stats={stats}
        keyPresence={getProviderKeyPresence()}
        jobsError={jobsError}
      />
    </div>
  );
}
