import type { Metadata } from "next";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { CreativeStudioHome } from "@/features/creative-studio/components/creative-studio-home";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { resolveActiveMembership } from "@/features/organization/services/resolve-active-membership";
import { createProjectService } from "@/features/creative-studio/services/project.service.impl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Creative Studio",
  description:
    "Desktop-class timeline workspace for manual news production editing.",
};

export default async function CreativeStudioPage() {
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
  const projectsResult = await projectService.list(membership.organization.id);

  return (
    <CreativeStudioHome
      organizationId={membership.organization.id}
      organizationName={membership.organization.name}
      initialProjects={projectsResult.data ?? []}
    />
  );
}
