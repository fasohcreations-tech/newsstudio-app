import type { Metadata } from "next";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { MediaLibraryWorkspace } from "@/features/media/components/media-library-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Media Library",
};

export default async function MediaLibraryPage() {
  const user = await requireAuth("/media-library");
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
        <AlertTitle>Media Library unavailable</AlertTitle>
        <AlertDescription>
          {error ??
            "No organization context is available. Apply foundation migrations and try again."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <MediaLibraryWorkspace
      organizationId={membership.organization.id}
      organizationName={membership.organization.name}
    />
  );
}
