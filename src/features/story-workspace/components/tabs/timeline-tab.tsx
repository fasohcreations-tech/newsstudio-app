"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clapperboard, ExternalLink, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/features/creative-studio/components/dialogs/create-project-dialog";
import type { CreativeProject } from "@/features/creative-studio/types/creative-studio.types";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import { StoryTimelineAssemblyWorkspace } from "@/features/story-timeline-assembly/components/story-timeline-assembly-workspace";
import { VideoRenderExportPanel } from "@/features/video-render-export/components/video-render-export-panel";

type TimelineTabProps = {
  storyId: string;
  storyTitle: string;
  organizationId: string;
  initialProjects: CreativeProject[];
};

/**
 * Story Workspace Timeline tab.
 * Primary: Production Timeline Assembly (Step 3.0).
 * Then: Video Rendering & Export (Step 3.1) — does not modify assembly.
 * Secondary: optional Creative Studio project (manual polish — unchanged).
 */
export function TimelineTab({
  storyId,
  storyTitle,
  organizationId,
  initialProjects,
}: TimelineTabProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-5">
      <StoryTimelineAssemblyWorkspace
        storyId={storyId}
        storyTitle={storyTitle}
      />

      <VideoRenderExportPanel
        storyId={storyId}
        storyTitle={storyTitle}
        organizationId={organizationId}
      />

      <Card className="border-border/60">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clapperboard className="size-5" />
                Creative Studio (optional)
              </CardTitle>
              <CardDescription>
                Open a Creative Studio project for manual polish. Production
                Timeline Assembly above does not redesign Studio.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (projects[0]) {
                    router.push(`/creative-studio/projects/${projects[0].id}`);
                    return;
                  }
                  setCreateOpen(true);
                }}
              >
                <ExternalLink className="size-4" />
                {projects.length > 0 ? "Open Studio" : "Create Project"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                New Project
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No story-linked Creative Studio projects yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 p-3"
                >
                  <div>
                    <Link
                      href={`/creative-studio/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Updated <RelativeTime value={project.updated_at} />
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {project.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        storyId={storyId}
        onCreated={(project) => {
          setProjects((prev) => [project, ...prev]);
          router.push(`/creative-studio/projects/${project.id}`);
        }}
      />
    </div>
  );
}
