import type { Metadata } from "next";

import { AssetClipEditorWorkspace } from "@/features/asset-clip-editor/components/asset-clip-editor-workspace";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/shared/lib/supabase/server";

export const metadata: Metadata = {
  title: "Asset Clip Editor",
};

type PageProps = {
  searchParams: Promise<{
    asset?: string;
    clipId?: string;
    storyId?: string;
    panel?: string;
  }>;
};

export default async function AssetClipEditorPage({ searchParams }: PageProps) {
  const user = await requireAuth("/media-library/clip-editor");
  const params = await searchParams;
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
        <AlertTitle>Clip Editor unavailable</AlertTitle>
        <AlertDescription>
          {error ?? "Organization context required."}
        </AlertDescription>
      </Alert>
    );
  }

  const panelRaw = params.panel != null ? Number(params.panel) : NaN;
  const panelIndex =
    Number.isFinite(panelRaw) && panelRaw >= 0 && panelRaw < 16
      ? Math.floor(panelRaw)
      : null;

  return (
    <AssetClipEditorWorkspace
      organizationId={membership.organization.id}
      initialAssetId={params.asset ?? null}
      initialClipId={params.clipId ?? null}
      storyId={params.storyId ?? null}
      panelIndex={panelIndex}
    />
  );
}
