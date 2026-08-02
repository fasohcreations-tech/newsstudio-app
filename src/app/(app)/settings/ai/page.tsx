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
import { getProviderKeyPresence } from "@/features/ai/lib/server-env";
import { AISettingsForm } from "@/features/ai/components/ai-settings-form";

export const metadata: Metadata = { title: "AI Settings" };

export default async function AISettingsPage() {
  const user = await requireAuth("/settings/ai");
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
          title="AI Settings"
          description="Configure the MediaOS AI Orchestrator."
        />
        <Alert variant="destructive">
          <AlertTitle>No organization</AlertTitle>
          <AlertDescription>
            {membershipError ??
              "Organization context is required for AI settings."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { settings, error } = await getAIOrgSettings(
    supabase,
    membership.organization.id,
  );

  return (
    <div>
      <PageHeader
        title="AI Settings"
        description={`${membership.organization.name} · Default provider, models, and toggles`}
        actions={
          <Link
            href="/ai-center"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            AI Center
          </Link>
        }
      />

      {error ? (
        <Alert className="mb-4">
          <AlertTitle>Settings notice</AlertTitle>
          <AlertDescription>
            {error}. Showing defaults until the organization settings load
            cleanly.
          </AlertDescription>
        </Alert>
      ) : null}

      <AISettingsForm
        initialSettings={settings}
        keyPresence={getProviderKeyPresence()}
      />
    </div>
  );
}
