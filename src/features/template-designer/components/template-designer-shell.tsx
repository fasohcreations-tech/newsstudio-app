"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TEMPLATE_DESIGNER_PANELS } from "@/features/template-designer/constants/template-designer.constants";
import type {
  BroadcastTemplate,
  TemplateDesignerPanel,
} from "@/features/template-designer/types/template-designer.types";

type TemplateDesignerShellProps = {
  template: BroadcastTemplate;
  activePanel: TemplateDesignerPanel;
  children: React.ReactNode;
};

export function TemplateDesignerShell({
  template,
  activePanel,
  children,
}: TemplateDesignerShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-2.5">
        <Link
          href="/templates"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="size-3.5" />
          Templates
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              {template.code}
            </span>
            <h1 className="truncate text-sm font-semibold">{template.name}</h1>
            <Badge variant="secondary">{template.workflow_state}</Badge>
            <Badge variant="outline">
              {template.canvas.width}×{template.canvas.height}
            </Badge>
          </div>
        </div>
        {template.composer_scene_id ? (
          <Link
            href={`/creative-studio/scenes/${template.composer_scene_id}`}
            target="_blank"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Scene Composer
            <ExternalLink className="size-3.5" />
          </Link>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-48 shrink-0 overflow-y-auto border-r border-border/60 bg-muted/20 p-2">
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Designer
          </p>
          <ul className="space-y-0.5">
            {TEMPLATE_DESIGNER_PANELS.map((panel) => {
              const href = `/templates/${template.id}/${panel.hrefSuffix}`;
              const active = activePanel === panel.id || pathname === href;
              return (
                <li key={panel.id}>
                  <Link
                    href={href}
                    className={cn(
                      "block rounded-md px-2.5 py-1.5 text-xs transition-colors",
                      active
                        ? "bg-background font-medium shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                    )}
                  >
                    {panel.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
