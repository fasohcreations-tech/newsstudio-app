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
import { GeminiTestPanel } from "@/features/ai/components/gemini-test-panel";
import { DEFAULT_PROVIDER_MODELS } from "@/features/ai/lib/defaults";

export const metadata: Metadata = { title: "Gemini Test · AI Center" };

export default async function GeminiTestPage() {
  const user = await requireAuth("/ai-center/gemini-test");
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
          title="Gemini Test"
          description="Live Gemini generateText through the AI Orchestrator."
        />
        <Alert variant="destructive">
          <AlertTitle>No organization</AlertTitle>
          <AlertDescription>
            {membershipError ??
              "Organization context is required for Gemini tests."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { settings } = await getAIOrgSettings(
    supabase,
    membership.organization.id,
  );
  const keys = getProviderKeyPresence();

  return (
    <div>
      <PageHeader
        title="Gemini Test"
        description="Module 2.1 — verify Google Gemini via the AI Orchestrator"
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
      <GeminiTestPanel
        defaultModel={
          settings.providers.gemini?.preferredModel ??
          settings.preferredModel ??
          DEFAULT_PROVIDER_MODELS.gemini
        }
        defaultTemperature={settings.temperature}
        geminiEnabled={Boolean(settings.providers.gemini?.enabled)}
        keyConfigured={keys.gemini.configured}
      />
    </div>
  );
}
