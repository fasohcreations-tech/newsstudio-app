"use client";

import { CheckCircle2, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  GNN_MASTER_SCENE_TARGET,
  GNN_PACKAGE_LABEL,
} from "@/features/scene-composer/lib/gnn-package-utils";

type GnnPackageStatusProps = {
  gnnSceneCount: number;
  gnnComponentCount?: number;
  compact?: boolean;
};

export function GnnPackageStatus({
  gnnSceneCount,
  gnnComponentCount = 0,
  compact = false,
}: GnnPackageStatusProps) {
  const installed = gnnSceneCount >= GNN_MASTER_SCENE_TARGET;

  if (compact) {
    return (
      <Badge
        variant={installed ? "default" : "outline"}
        className="gap-1 text-[10px]"
      >
        {installed ? (
          <CheckCircle2 className="size-3" />
        ) : (
          <Package className="size-3" />
        )}
        GNN {gnnSceneCount}/{GNN_MASTER_SCENE_TARGET}
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-600/15">
        {installed ? (
          <CheckCircle2 className="size-4 text-blue-500" />
        ) : (
          <Package className="size-4 text-blue-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{GNN_PACKAGE_LABEL}</p>
        <p className="text-[10px] text-muted-foreground">
          {installed
            ? "Package installed — master scenes ready in Scene Composer"
            : `${gnnSceneCount}/${GNN_MASTER_SCENE_TARGET} master scenes seeded`}
          {gnnComponentCount > 0
            ? ` · ${gnnComponentCount} components`
            : null}
        </p>
      </div>
      <Badge variant={installed ? "default" : "secondary"} className="text-[10px]">
        {installed ? "Installed" : "Partial"}
      </Badge>
    </div>
  );
}
