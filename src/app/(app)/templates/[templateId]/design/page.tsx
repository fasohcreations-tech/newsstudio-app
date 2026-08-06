import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";
import { SceneComposerWorkspace } from "@/features/scene-composer/components/scene-composer-workspace";
import { createSceneComposerService } from "@/features/scene-composer/services/scene-composer.service.impl";
import { requireTemplateContext } from "@/features/template-designer/lib/load-template";
import { parseInspectorTab } from "@/features/template-designer/lib/redirect-to-workspace";

type PageProps = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ inspector?: string }>;
};

export const metadata: Metadata = {
  title: "Template Designer",
  description:
    "Single-page broadcast graphics workspace — layers, canvas, inspector, timeline.",
};

/**
 * Feature 040 Design Workspace.
 *
 * A template *is* a reusable composer scene (`is_template = true`), so the
 * designer mounts the same Scene Composer runtime the Story Preview uses —
 * one workspace with the layer tree, canvas, property inspector and timeline
 * rather than a page per feature.
 */
export default async function TemplateDesignPage({
  params,
  searchParams,
}: PageProps) {
  const { templateId } = await params;
  const { inspector } = await searchParams;

  const { supabase, membership, error } = await requireTemplateContext(
    `/templates/${templateId}/design`,
  );

  if (!membership || error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Template Designer unavailable</AlertTitle>
          <AlertDescription>
            {error ?? "Organization context required."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const composerService = createSceneComposerService(supabase);
  const motionService = createMotionSceneService(supabase);
  const orgId = membership.organization.id;

  const [sceneResult, scenesResult, categoriesResult, componentsResult] =
    await Promise.all([
      composerService.getComposerScene(templateId),
      motionService.listScenes(orgId, { lightweight: true }),
      motionService.listCategories(orgId),
      composerService.listComponents(orgId),
    ]);

  // Feature 040 originally kept templates in an in-memory store, so old links
  // can carry ids that never existed as scenes. Explain that instead of 404ing.
  if (!sceneResult.data) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Template not found</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              No template exists for <code>{templateId}</code>. Templates are now
              stored as reusable scenes, so links created by the earlier
              placeholder build no longer resolve.
            </p>
            <Link href="/templates" className={cn(buttonVariants({ size: "sm" }))}>
              Back to Templates
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <SceneComposerWorkspace
      initialScene={sceneResult.data}
      scenes={scenesResult.data ?? []}
      categories={categoriesResult.data ?? []}
      components={componentsResult.data ?? []}
      initialInspectorTab={parseInspectorTab(inspector)}
      backHref="/templates"
      backLabel="Templates"
    />
  );
}
