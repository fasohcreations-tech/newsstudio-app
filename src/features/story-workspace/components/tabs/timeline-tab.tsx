"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Clapperboard, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";

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

type TimelineTabProps = {
  storyId: string;
  storyTitle: string;
  organizationId: string;
  initialProjects: CreativeProject[];
};

export function TimelineTab({
  storyId,
  storyTitle,
  organizationId,
  initialProjects,
}: TimelineTabProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const openOrCreate = () => {
    if (projects.length > 0) {
      router.push(`/creative-studio/projects/${projects[0].id}`);
      return;
    }
    setCreateOpen(true);
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clapperboard className="size-5" />
                Creative Studio Timeline
              </CardTitle>
              <CardDescription>
                Edit packages for <strong>{storyTitle}</strong> in the full
                desktop timeline workspace.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={openOrCreate} disabled={pending}>
                <ExternalLink className="size-4" />
                {projects.length > 0 ? "Open Studio" : "Create Project"}
              </Button>
              <Button
                type="button"
                variant="outline"
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
              No story-linked Creative Studio projects yet. Create one to start
              building the timeline package.
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
