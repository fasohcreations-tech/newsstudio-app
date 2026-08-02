import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { MotionSceneLibraryHome } from "@/features/motion-scene-engine/components/motion-scene-library-home";
import { ensureComposerDefaultsAction } from "@/features/scene-composer/actions/scene-composer.actions";
import { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { createClient } from "@/shared/lib/supabase/server";

export const metadata: Metadata = {
  title: "Motion Scene Engine",
  description:
    "Enterprise reusable motion scenes with layers, placeholders, animations, and AI variable binding.",
};

export default async function MotionSceneLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; trackId?: string }>;
}) {
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
        <AlertTitle>Motion Scene Engine unavailable</AlertTitle>
        <AlertDescription>
          {error ??
            "Organization context required. Apply migration 20260324000016_motion_scene_engine.sql first."}
        </AlertDescription>
      </Alert>
    );
  }

  const service = createMotionSceneService(supabase);
  const orgId = membership.organization.id;

  const [defaultsResult, scenesResult, categoriesResult] = await Promise.all([
    ensureComposerDefaultsAction(),
    service.listScenes(orgId),
    service.listCategories(orgId),
  ]);

  if (scenesResult.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Scene library failed to load</AlertTitle>
        <AlertDescription>
          {scenesResult.error}
          {!defaultsResult.success ? ` · ${defaultsResult.error}` : null}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <MotionSceneLibraryHome
      organizationName={membership.organization.name}
      scenes={scenesResult.data ?? []}
      categories={categoriesResult.data ?? []}
      projectId={query.projectId ?? null}
      trackId={query.trackId ?? null}
    />
  );
}
