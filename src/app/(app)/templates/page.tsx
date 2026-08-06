import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createMotionSceneService } from "@/features/motion-scene-engine/services/motion-scene.service.impl";
import { TemplateLibraryHome } from "@/features/template-designer/components/template-library-home";
import { requireTemplateContext } from "@/features/template-designer/lib/load-template";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Professional Broadcast Template Designer — reusable graphics packages for every story.",
};

export default async function TemplatesPage() {
  const { supabase, membership, error } =
    await requireTemplateContext("/templates");

  if (!membership || error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Templates unavailable</AlertTitle>
          <AlertDescription>
            {error ?? "Organization context required."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Templates are persisted composer scenes (`is_template = true`), which is
  // what `listScenes` returns — so the designer and Scene Library never drift.
  const motionService = createMotionSceneService(supabase);
  const result = await motionService.listScenes(membership.organization.id, {
    lightweight: true,
  });

  return (
    <TemplateLibraryHome
      organizationName={membership.organization.name}
      templates={result.data ?? []}
    />
  );
}
