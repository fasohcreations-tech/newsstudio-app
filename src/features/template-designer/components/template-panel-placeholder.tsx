import Link from "next/link";
import { Layers, Link2, Play, Shapes, Sparkles, Wand2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BroadcastTemplate } from "@/features/template-designer/types/template-designer.types";

type TemplatePanelPlaceholderProps = {
  template: BroadcastTemplate;
  title: string;
  description: string;
  /** Existing MediaOS module this panel will host — not redesigned. */
  integrates?: string;
};

export function TemplatePanelPlaceholder({
  template,
  title,
  description,
  integrates,
}: TemplatePanelPlaceholderProps) {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration (Feature 040)</CardTitle>
          <CardDescription>
            {integrates
              ? `This panel will host the existing ${integrates} — no second engine.`
              : "Scaffold panel. Wire existing MediaOS modules here without forking them."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {template.composer_scene_id ? (
            <Link
              href={`/creative-studio/scenes/${template.composer_scene_id}`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Open linked Scene Composer
            </Link>
          ) : (
            <Link
              href="/creative-studio/scenes"
              className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
            >
              Link a scene from Scene Library
            </Link>
          )}
          <Link
            href={`/templates/${template.id}/preview`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Preview
          </Link>
          <Link
            href={`/templates/${template.id}/bindings`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Bindings
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: Layers, label: "Layer Manager", href: "layers" },
          { icon: Wand2, label: "Property Inspector", href: "properties" },
          { icon: Shapes, label: "Shape Composer", href: "shapes" },
          {
            icon: Sparkles,
            label: "Behaviours / Effects",
            href: "behaviours",
          },
          { icon: Link2, label: "Data Bindings", href: "bindings" },
          { icon: Play, label: "Live Preview", href: "preview" },
        ].map((item) => (
          <Link
            key={item.href}
            href={`/templates/${template.id}/${item.href}`}
            className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-3 text-sm transition-colors hover:bg-muted/40"
          >
            <item.icon className="size-4 text-muted-foreground" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
