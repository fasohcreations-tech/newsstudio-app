import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import {
  listSourceItems,
  listSourceTypes,
} from "@/features/intake/services/intake.service";
import { IntakeCenter } from "@/features/intake/components/intake-center";

export const metadata: Metadata = { title: "News Intake" };

export default async function IntakePage() {
  const user = await requireAuth("/intake");
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
          title="News Intake"
          description="Convert incoming sources into Stories."
        />
        <Alert variant="destructive">
          <AlertTitle>No organization</AlertTitle>
          <AlertDescription>
            {membershipError ??
              "Organization context is required for News Intake."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const [typesResult, itemsResult] = await Promise.all([
    listSourceTypes(supabase),
    listSourceItems(supabase, {
      organizationId: membership.organization.id,
      limit: 100,
    }),
  ]);

  const loadError = typesResult.error || itemsResult.error;

  return (
    <div className="space-y-4">
      <PageHeader
        title="News Intake"
        description={`${membership.organization.name} · Source → Story architecture`}
      />

      {loadError ? (
        <Alert className="mb-2">
          <AlertTitle>Intake data unavailable</AlertTitle>
          <AlertDescription>
            {loadError}. Apply migration{" "}
            <code className="text-xs">20260324000008_news_intake.sql</code> in
            Supabase if you have not already.
          </AlertDescription>
        </Alert>
      ) : null}

      <IntakeCenter
        organizationName={membership.organization.name}
        sourceTypes={typesResult.data ?? []}
        initialItems={itemsResult.data ?? []}
      />
    </div>
  );
}
