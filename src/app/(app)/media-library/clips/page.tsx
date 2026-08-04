import type { Metadata } from "next";

import { AssetClipsLibrary } from "@/features/asset-clip-editor/components/asset-clips-library";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/shared/lib/supabase/server";

export const metadata: Metadata = {
  title: "Asset Clips",
};

export default async function AssetClipsPage() {
  const user = await requireAuth("/media-library/clips");
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
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Clips unavailable</AlertTitle>
        <AlertDescription>
          {error ?? "Organization context required."}
        </AlertDescription>
      </Alert>
    );
  }

  return <AssetClipsLibrary organizationId={membership.organization.id} />;
}
