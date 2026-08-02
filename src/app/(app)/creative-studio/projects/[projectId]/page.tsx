import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { CreativeStudioWorkspace } from "@/features/creative-studio/components/creative-studio-workspace";
import { createProjectService } from "@/features/creative-studio/services/project.service.impl";
import { createTemplateService } from "@/features/creative-studio/services/template.service.impl";
import { mapMediaAssetToBinItem } from "@/features/creative-studio/lib/media-bin-mapper";
import { listMediaAssets } from "@/features/media/services/media.service";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CreativeStudioProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export async function generateMetadata({
  params,
}: CreativeStudioProjectPageProps): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: `Project · ${projectId.slice(0, 8)}`,
  };
}

export default async function CreativeStudioProjectPage({
  params,
}: CreativeStudioProjectPageProps) {
  const { projectId } = await params;
  const user = await requireAuth("/creative-studio");
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
        <AlertTitle>Creative Studio unavailable</AlertTitle>
        <AlertDescription>
          {error ??
            "No organization context is available. Apply foundation migrations and try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const projectService = createProjectService(supabase);
  const templateService = createTemplateService(supabase);

  const [projectResult, templatesResult, mediaResult] = await Promise.all([
    projectService.getWithTimeline(projectId),
    templateService.list(membership.organization.id),
    listMediaAssets(supabase, {
      organizationId: membership.organization.id,
      storyId: null,
      includeAllFolders: true,
      page: 1,
      pageSize: 120,
    }),
  ]);

  if (!projectResult.data) {
    notFound();
  }

  if (projectResult.data.organization_id !== membership.organization.id) {
    notFound();
  }

  const mediaAssets = (mediaResult.data?.assets ?? []).map((asset) =>
    mapMediaAssetToBinItem(asset, projectResult.data!.story_id),
  );

  return (
    <CreativeStudioWorkspace
      project={projectResult.data}
      templates={templatesResult.data ?? []}
      organizationId={membership.organization.id}
      mediaAssets={mediaAssets}
    />
  );
}
