"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  FolderOpen,
  Layers,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/features/creative-studio/components/dialogs/create-project-dialog";
import {
  archiveCreativeProjectAction,
  deleteCreativeProjectAction,
  duplicateCreativeProjectAction,
} from "@/features/creative-studio/actions/project.actions";
import type { CreativeProject } from "@/features/creative-studio/types/creative-studio.types";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import { SceneIntelligencePanel } from "@/features/ai/intelligence/components/scene-intelligence-panel";
import { TimelineIntelligenceHomeCard } from "@/features/ai/intelligence/components/timeline-intelligence-home-card";

type CreativeStudioHomeProps = {
  organizationId: string;
  organizationName: string;
  initialProjects: CreativeProject[];
};

export function CreativeStudioHome({
  organizationId,
  organizationName,
  initialProjects,
}: CreativeStudioHomeProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const runAction = (
    action: () => Promise<{ success: boolean; error?: string; data?: CreativeProject }>,
    successMessage: string,
    onSuccess?: (project?: CreativeProject) => void,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Action failed");
        return;
      }
      toast.success(successMessage);
      onSuccess?.(result.data);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Creative Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            {organizationName} · Manual editing foundation for news production
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href="/creative-studio/scenes" />}
          >
            <Layers className="size-4" />
            Motion Scenes
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Project
          </Button>
        </div>
      </div>

      <SceneIntelligencePanel storyType="news" language="en" />

      <TimelineIntelligenceHomeCard
        projects={projects}
        onOpenCreate={() => setCreateOpen(true)}
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Motion Scene Engine</p>
              <p className="text-sm text-muted-foreground">
                Reusable motion scenes with layers, placeholders, animations,
                and AI variable binding for every broadcast graphic.
              </p>
            </div>
          </div>
          <Button
            type="button"
            nativeButton={false}
            render={<Link href="/creative-studio/scenes" />}
          >
            Open Scene Library
          </Button>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FolderOpen className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                Create a project to open the timeline workspace.
              </p>
            </div>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-base">
                    <Link
                      href={`/creative-studio/projects/${project.id}`}
                      className="hover:underline"
                    >
                      {project.title}
                    </Link>
                  </CardTitle>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {project.status}
                    </Badge>
                    {project.story_id ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Story-linked
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Project actions"
                      />
                    }
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      render={
                        <Link href={`/creative-studio/projects/${project.id}`} />
                      }
                    >
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={pending}
                      onClick={() =>
                        runAction(
                          () => duplicateCreativeProjectAction(project.id),
                          "Project duplicated",
                          (p) => p && router.push(`/creative-studio/projects/${p.id}`),
                        )
                      }
                    >
                      <Copy className="size-3.5" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={pending}
                      onClick={() =>
                        runAction(
                          () => archiveCreativeProjectAction(project.id),
                          "Project archived",
                          () =>
                            setProjects((prev) =>
                              prev.filter((p) => p.id !== project.id),
                            ),
                        )
                      }
                    >
                      <Archive className="size-3.5" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={pending}
                      className="text-destructive"
                      onClick={() =>
                        runAction(
                          () => deleteCreativeProjectAction(project.id),
                          "Project deleted",
                          () =>
                            setProjects((prev) =>
                              prev.filter((p) => p.id !== project.id),
                            ),
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p className="line-clamp-2">
                  {project.description || "No description"}
                </p>
                <p>
                  {project.resolution_width}×{project.resolution_height} ·{" "}
                  {project.frame_rate} fps
                </p>
                <p>
                  Updated <RelativeTime value={project.updated_at} />
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        onCreated={(project) => {
          setProjects((prev) => [project, ...prev]);
          router.push(`/creative-studio/projects/${project.id}`);
        }}
      />
    </div>
  );
}
