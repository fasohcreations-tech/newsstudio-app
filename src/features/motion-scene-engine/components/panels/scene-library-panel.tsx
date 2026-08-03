"use client";

import { useMemo, useState } from "react";
import { Copy, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MOTION_SCENE_DRAG_TYPE,
  MOTION_SCENE_TYPE_LABELS,
  NEWSROOM_QUICK_CREATE,
} from "@/features/motion-scene-engine/constants/motion-scene.constants";
import { GnnPackageStatus } from "@/features/scene-composer/components/gnn-package-status";
import { GnnSceneBadge } from "@/features/scene-composer/components/gnn-scene-badge";
import {
  countGnnScenes,
  isGnnScene,
} from "@/features/scene-composer/lib/gnn-package-utils";
import {
  createMotionSceneAction,
  duplicateMotionSceneAction,
} from "@/features/motion-scene-engine/actions/motion-scene.actions";
import type {
  MotionScene,
  MotionSceneType,
  SceneCategory,
} from "@/features/motion-scene-engine/types/motion-scene.types";

type SceneLibraryPanelProps = {
  scenes: MotionScene[];
  categories: SceneCategory[];
  projectId?: string | null;
  onScenesChange: (scenes: MotionScene[]) => void;
  onOpenScene: (sceneId: string) => void;
};

export function SceneLibraryPanel({
  scenes,
  categories,
  projectId,
  onScenesChange,
  onOpenScene,
}: SceneLibraryPanelProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [gnnOnly, setGnnOnly] = useState(false);

  const gnnSceneCount = useMemo(() => countGnnScenes(scenes), [scenes]);

  const filtered = useMemo(() => {
    return scenes.filter((scene) => {
      if (gnnOnly && !isGnnScene(scene)) return false;
      if (categoryId !== "all" && scene.category_id !== categoryId) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const packageCode = (scene.metadata as Record<string, unknown>)
          ?.package_code;
        return (
          scene.name.toLowerCase().includes(q) ||
          MOTION_SCENE_TYPE_LABELS[scene.scene_type].toLowerCase().includes(q) ||
          (typeof packageCode === "string" &&
            packageCode.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [categoryId, gnnOnly, scenes, search]);

  const createScene = async (sceneType: MotionSceneType, name: string) => {
    const result = await createMotionSceneAction({
      sceneType,
      name,
      projectId,
    });
    if (!result.success) {
      toast.error(result.error ?? "Failed to create scene");
      return;
    }
    onScenesChange([result.data, ...scenes]);
    onOpenScene(result.data.id);
  };

  const duplicate = async (scene: MotionScene) => {
    const result = await duplicateMotionSceneAction(scene.id);
    if (!result.success) {
      toast.error(result.error ?? "Duplicate failed");
      return;
    }
    onScenesChange([result.data, ...scenes]);
    toast.success("Scene duplicated");
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    scene: MotionScene,
  ) => {
    event.dataTransfer.setData(
      MOTION_SCENE_DRAG_TYPE,
      JSON.stringify({
        sceneId: scene.id,
        sceneType: scene.scene_type,
        name: scene.name,
        durationMs: scene.duration_ms,
      }),
    );
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border/60 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Scene Library
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search motion scenes…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant={categoryId === "all" && !gnnOnly ? "secondary" : "ghost"}
            className="h-6 px-2 text-[10px]"
            onClick={() => {
              setCategoryId("all");
              setGnnOnly(false);
            }}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={gnnOnly ? "secondary" : "ghost"}
            className="h-6 px-2 text-[10px]"
            onClick={() => {
              setGnnOnly(true);
              setCategoryId("all");
            }}
          >
            GNN ({gnnSceneCount})
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              size="sm"
              variant={categoryId === category.id ? "secondary" : "ghost"}
              className="h-6 px-2 text-[10px]"
              onClick={() => {
                setCategoryId(category.id);
                setGnnOnly(false);
              }}
            >
              {category.name}
            </Button>
          ))}
        </div>
        <GnnPackageStatus gnnSceneCount={gnnSceneCount} compact />
      </div>

      <div className="border-b border-border/60 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
          Newsroom Quick Create
        </p>
        <div className="flex flex-wrap gap-1">
          {NEWSROOM_QUICK_CREATE.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => void createScene(item.sceneType, item.label)}
            >
              <Plus className="mr-1 size-3" />
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {filtered.map((scene) => (
          <div
            key={scene.id}
            className="rounded-lg border border-border/60 bg-card"
          >
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, scene)}
              onClick={() => onOpenScene(scene.id)}
              className="w-full p-2.5 text-left"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{scene.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {MOTION_SCENE_TYPE_LABELS[scene.scene_type]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <GnnSceneBadge scene={scene} />
                  <Badge variant="secondary" className="text-[9px]">
                    v{scene.version}
                  </Badge>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {(scene.duration_ms / 1000).toFixed(1)}s ·{" "}
                {typeof scene.metadata?.layer_count === "number"
                  ? scene.metadata.layer_count
                  : (scene.scene_document?.layers?.length ?? 0)}{" "}
                layers
              </p>
            </button>
            <div className="flex justify-end border-t border-border/40 px-2 py-1">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-7"
                      aria-label="Scene actions"
                    />
                  }
                >
                  <MoreHorizontal className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpenScene(scene.id)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void duplicate(scene)}>
                    <Copy className="size-3.5" />
                    Duplicate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {gnnOnly
              ? "No GNN master scenes in this project."
              : "No motion scenes yet. Use Quick Create to add your first scene."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
