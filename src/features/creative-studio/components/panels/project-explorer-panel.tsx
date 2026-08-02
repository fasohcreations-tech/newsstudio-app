"use client";

import Link from "next/link";
import { FolderTree, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CreativeProjectWithTimeline } from "@/features/creative-studio/types/creative-studio.types";

type ProjectExplorerPanelProps = {
  project: CreativeProjectWithTimeline;
};

export function ProjectExplorerPanel({ project }: ProjectExplorerPanelProps) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <FolderTree className="size-3.5" />
          Project
        </p>
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="font-medium">{project.title}</p>
          <p className="text-xs text-muted-foreground">
            {project.description || "No description"}
          </p>
          <Badge variant="outline" className="capitalize">
            {project.status}
          </Badge>
        </div>
      </div>

      {project.story_id ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Linked Story
          </p>
          <Link
            href={`/newsroom/stories/${project.story_id}`}
            className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-xs hover:bg-muted/30"
          >
            <Link2 className="size-3.5" />
            Open story workspace
          </Link>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Timeline
        </p>
        <ul className="space-y-1 text-xs">
          {project.tracks.map((track) => (
            <li
              key={track.id}
              className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1.5"
            >
              <span>{track.name}</span>
              <span className="text-muted-foreground">
                {track.clips.length} clips
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
