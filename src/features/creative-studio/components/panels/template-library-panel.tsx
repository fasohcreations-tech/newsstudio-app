"use client";

import { LayoutTemplate } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PLACEHOLDER_KIND_LABELS } from "@/features/creative-studio/constants/creative-studio.constants";
import type { CreativeTemplate } from "@/features/creative-studio/types/creative-studio.types";

type TemplateLibraryPanelProps = {
  templates: CreativeTemplate[];
};

export function TemplateLibraryPanel({ templates }: TemplateLibraryPanelProps) {
  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        <LayoutTemplate className="mx-auto mb-2 size-6 opacity-60" />
        No templates yet. Seed defaults from project settings.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {templates.map((template) => (
        <li
          key={template.id}
          draggable
          className="cursor-grab rounded-lg border border-border/60 bg-muted/15 p-3 active:cursor-grabbing"
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{template.name}</p>
            <Badge variant="outline" className="text-[9px]">
              {template.aspect_ratio}
            </Badge>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.values(PLACEHOLDER_KIND_LABELS)
              .slice(0, 4)
              .map((label) => (
                <Badge key={label} variant="secondary" className="text-[9px]">
                  {label}
                </Badge>
              ))}
            <Badge variant="secondary" className="text-[9px]">
              +more
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
