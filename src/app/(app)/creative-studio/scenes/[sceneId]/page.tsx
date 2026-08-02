import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { createTimelineService } from "@/features/creative-studio/services/timeline.service.impl";
import { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";
import { ensureComposerDefaultsAction } from "@/features/scene-composer/actions/scene-composer.actions";
import { SceneComposerWorkspace } from "@/features/scene-composer/components/scene-composer-workspace";
import { createSceneComposerService } from "@/features/scene-composer/services/scene-composer.service.impl";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { createClient } from "@/shared/lib/supabase/server";

type PageProps = {
  params: Promise<{ sceneId: string }>;
  searchParams: Promise<{ projectId?: string; trackId?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sceneId } = await params;
  return {
    title: `Compose ${sceneId.slice(0, 8)}…`,
    description: "News Production Workspace — Story Data Form + Live Preview",
  };
}

export default async function MotionSceneComposerPage({
  params,
  searchParams,
}: PageProps) {
  const { sceneId } = await params;
  const query = await searchParams;

  const user = await requireAuth("/creative-studio/scenes");
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
        <AlertTitle>Scene Composer unavailable</AlertTitle>
        <AlertDescription>
          {error ??
            "Organization required. Apply migrations 16 and 17 in Supabase."}
        </AlertDescription>
      </Alert>
    );
  }

  await ensureComposerDefaultsAction();

  const composerService = createSceneComposerService(supabase);
  const motionService = createMotionSceneService(supabase);
  const orgId = membership.organization.id;

  const [sceneResult, scenesResult, categoriesResult, componentsResult] =
    await Promise.all([
      composerService.getComposerScene(sceneId),
      motionService.listScenes(orgId),
      motionService.listCategories(orgId),
      composerService.listComponents(orgId),
    ]);

  if (!sceneResult.data) notFound();

  const projectId = query.projectId ?? sceneResult.data.project_id;
  let trackId = query.trackId ?? null;

  if (!trackId && projectId) {
    const timelineService = createTimelineService(supabase);
    const bundle = await timelineService.getBundleByProject(projectId);
    trackId =
      bundle.data?.tracks.find((track) => track.kind === "graphics")?.id ??
      null;
  }

  return (
    <SceneComposerWorkspace
      initialScene={sceneResult.data}
      scenes={scenesResult.data ?? []}
      categories={categoriesResult.data ?? []}
      components={componentsResult.data ?? []}
      projectId={projectId}
      trackId={trackId}
    />
  );
}
