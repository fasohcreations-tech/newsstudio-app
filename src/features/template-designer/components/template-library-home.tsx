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
import { duplicateMotionSceneAction } from "@/features/motion-scene-engine/actions/motion-scene.actions";
import type { MotionScene } from "@/features/motion-scene-engine/types/motion-scene.types";

type TemplateLibraryHomeProps = {
  organizationName: string;
  templates: MotionScene[];
};

function layerCount(template: MotionScene): number | null {
  const raw = template.metadata?.layer_count;
  if (typeof raw === "number") return raw;
  const objects = template.scene_document?.layers?.length ?? 0;
  return objects > 0 ? objects : null;
}

export function TemplateLibraryHome({
  organizationName,
  templates,
}: TemplateLibraryHomeProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const duplicate = (id: string) => {
    startTransition(async () => {
      const result = await duplicateMotionSceneAction(id);
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
            Stories supply data; Templates decide layout. Every template opens in
            one workspace — layers, canvas, inspector and timeline together.
          </p>
        </div>
        <Link href="/templates/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          New Template
        </Link>
      </div>

      {templates.length === 0 ? (
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
          {templates.map((template) => {
            const layers = layerCount(template);
            return (
              <Card key={template.id} className="flex flex-col">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="secondary">v{template.version}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {template.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">
                      {template.canvas.width}×{template.canvas.height}
                    </Badge>
                    <Badge variant="outline">
                      {(template.duration_ms / 1000).toFixed(1)}s
                    </Badge>
                    {layers != null ? (
                      <Badge variant="outline">{layers} layers</Badge>
                    ) : null}
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
                      title="Duplicate template"
                      disabled={pending}
                      onClick={() => duplicate(template.id)}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
