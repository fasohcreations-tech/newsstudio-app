import type { Metadata } from "next";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { NewStoryClient } from "@/features/newsroom/components/new-story-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "New story",
};

export default async function NewStoryPage() {
  const user = await requireAuth("/newsroom/new");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);
  const { membership, error } = await resolveActiveMembership(
    supabase,
    user.id,
    profile?.email ?? user.email ?? "",
    profile?.full_name,
  );

  if (!membership || error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Cannot create story</AlertTitle>
        <AlertDescription>
          {error ?? "Organization context is required."}
        </AlertDescription>
      </Alert>
    );
  }

  return <NewStoryClient organizationId={membership.organization.id} />;
}
