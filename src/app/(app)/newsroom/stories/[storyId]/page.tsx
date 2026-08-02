import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getStoryById } from "@/features/newsroom/services/story.service";
import { ensureCurrentStoryScript } from "@/features/story-workspace/services/script.service";
import { createProjectService } from "@/features/creative-studio/services/project.service.impl";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { StoryWorkspace } from "@/features/story-workspace/components/story-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StoryWorkspacePageProps = {
  params: Promise<{ storyId: string }>;
};

export async function generateMetadata({
  params,
}: StoryWorkspacePageProps): Promise<Metadata> {
  const { storyId } = await params;
  const supabase = await createClient();
  const { story } = await getStoryById(supabase, storyId);
  return {
    title: story ? `${story.title} · Workspace` : "Story workspace",
  };
}

export default async function StoryWorkspacePage({
  params,
}: StoryWorkspacePageProps) {
  const user = await requireAuth();
  const { storyId } = await params;
  const supabase = await createClient();

  const [{ story, error }, { profile }] = await Promise.all([
    getStoryById(supabase, storyId),
    getCurrentProfile(supabase, user.id),
  ]);

  if (error || !story) {
    notFound();
  }

  const { script, error: scriptError } = await ensureCurrentStoryScript(
    supabase,
    {
      storyId: story.id,
      organizationId: story.organization_id,
      userId: user.id,
    },
  );

  const projectService = createProjectService(supabase);
  const creativeProjectsResult = await projectService.list(story.organization_id, {
    storyId: story.id,
  });

  if (scriptError || !script) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Story workspace unavailable</AlertTitle>
        <AlertDescription>
          {scriptError ??
            "Unable to open the script document. Apply the story workspace migration and try again."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <StoryWorkspace
      story={story}
      script={script}
      currentUser={{
        id: user.id,
        email: profile?.email ?? user.email ?? "",
        full_name: profile?.full_name ?? null,
      }}
      creativeProjects={creativeProjectsResult.data ?? []}
    />
  );
}
