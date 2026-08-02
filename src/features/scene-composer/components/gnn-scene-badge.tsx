import { Badge } from "@/components/ui/badge";
import type { MotionScene } from "@/features/motion-scene-engine/types/motion-scene.types";
import {
  getScenePackageCode,
  isGnnScene,
} from "@/features/scene-composer/lib/gnn-package-utils";

type GnnSceneBadgeProps = {
  scene: MotionScene;
  className?: string;
};

export function GnnSceneBadge({ scene, className }: GnnSceneBadgeProps) {
  if (!isGnnScene(scene)) return null;
  const code = getScenePackageCode(scene);
  return (
    <Badge
      variant="outline"
      className={`shrink-0 border-blue-500/40 bg-blue-500/10 text-[9px] text-blue-700 dark:text-blue-300 ${className ?? ""}`}
    >
      {code ?? "GNN"}
    </Badge>
  );
}
