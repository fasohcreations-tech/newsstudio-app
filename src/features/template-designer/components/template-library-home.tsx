"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Copy, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { duplicateTemplateAction } from "@/features/template-designer/actions/template-designer.actions";
import { TEMPLATE_CATEGORIES } from "@/features/template-designer/constants/template-designer.constants";
import type { BroadcastTemplateSummary } from "@/features/template-designer/types/template-designer.types";

type TemplateLibraryHomeProps = {
  organizationName: string;
  templates: BroadcastTemplateSummary[];
};

function categoryLabel(id: string) {
  return TEMPLATE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function TemplateLibraryHome({
  organizationName,
  templates,
}: TemplateLibraryHomeProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const items = templates;

  const duplicate = (id: string) => {
    startTransition(async () => {
      const result = await duplicateTemplateAction(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Template duplicated");
      router.refresh();
      router.push(`/templates/${result.data.id}/design`);
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5" />
            Feature 040
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Professional Template Designer
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {organizationName} · Build reusable broadcast graphics packages.
            Stories supply data; Templates decide layout. Scene Composer, Shape,
            Behaviour, and Motion stay the design engines — this module is the
            master shell.
          </p>
        </div>
        <Link href="/templates/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          New Template
        </Link>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutTemplate className="size-4" />
              No templates yet
            </CardTitle>
            <CardDescription>
              Create your first package (GNN, Breaking, Weather, Reels, …).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/templates/new" className={cn(buttonVariants())}>
              Create template
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {template.code}
                    </p>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">{template.workflow_state}</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {template.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    {categoryLabel(template.category)}
                  </Badge>
                  <Badge variant="outline">
                    {template.canvas.width}×{template.canvas.height}
                  </Badge>
                  {template.composer_scene_id ? (
                    <Badge variant="outline">Scene linked</Badge>
                  ) : (
                    <Badge variant="outline">Scaffold</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/templates/${template.id}/design`}
                    className={cn(buttonVariants({ size: "sm" }), "flex-1")}
                  >
                    Open Designer
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => duplicate(template.id)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
