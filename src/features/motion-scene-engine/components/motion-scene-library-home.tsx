"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Layers, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MOTION_SCENE_DRAG_TYPE,
  MOTION_SCENE_TYPE_LABELS,
  NEWSROOM_QUICK_CREATE,
} from "@/features/motion-scene-engine/constants/motion-scene.constants";
import {
  createMotionSceneAction,
  duplicateMotionSceneAction,
} from "@/features/motion-scene-engine/actions/motion-scene.actions";
import { buildMotionSceneEditorHref } from "@/features/motion-scene-engine/lib/motion-scene-navigation";
import { GnnPackageStatus } from "@/features/scene-composer/components/gnn-package-status";
import { GnnSceneBadge } from "@/features/scene-composer/components/gnn-scene-badge";
import {
  countGnnScenes,
  isGnnScene,
} from "@/features/scene-composer/lib/gnn-package-utils";
import { SceneIntelligencePanel } from "@/features/ai/intelligence/components/scene-intelligence-panel";
import type {
  MotionScene,
  MotionSceneType,
  SceneCategory,
} from "@/features/motion-scene-engine/types/motion-scene.types";

type MotionSceneLibraryHomeProps = {
  organizationName: string;
  scenes: MotionScene[];
  categories: SceneCategory[];
  projectId?: string | null;
  trackId?: string | null;
};

export function MotionSceneLibraryHome({
  organizationName,
  scenes: initialScenes,
  categories,
  projectId = null,
  trackId = null,
}: MotionSceneLibraryHomeProps) {
  const [scenes, setScenes] = useState(initialScenes);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [gnnOnly, setGnnOnly] = useState(false);

  const scenesFingerprint = useMemo(
    () =>
      initialScenes
        .map((scene) => `${scene.id}:${scene.updated_at}:${scene.version}`)
        .join("|"),
    [initialScenes],
  );

  useEffect(() => {
    setScenes(initialScenes);
    // Fingerprint only — a fresh array reference from the server parent must not
    // re-set state every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [scenesFingerprint]);

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
    setScenes((prev) => [result.data, ...prev]);
    window.location.href = buildMotionSceneEditorHref(result.data.id, {
      projectId,
      trackId,
    });
  };

  const openScene = (sceneId: string) => {
    window.location.href = buildMotionSceneEditorHref(sceneId, {
      projectId,
      trackId,
    });
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Motion Scene Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            {organizationName} · {scenes.length} reusable motion scenes ·{" "}
            {gnnSceneCount} GNN master scenes
          </p>
        </div>
        <Button
          type="button"
          nativeButton={false}
          render={<Link href="/creative-studio" />}
          variant="outline"
        >
          Back to Creative Studio
        </Button>
      </div>

      <SceneIntelligencePanel storyType="news" language="en" />

      <GnnPackageStatus gnnSceneCount={gnnSceneCount} />

      <Card className="border-violet-500/30 bg-violet-500/5">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold">Newsroom Quick Create</p>
          <p className="text-xs text-muted-foreground">
            One-click empty editable scenes — no static templates. Bind story
            variables with {"{{headline}}"}, {"{{reporter}}"}, brand kit colors,
            and more.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {NEWSROOM_QUICK_CREATE.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                onClick={() => void createScene(item.sceneType, item.label)}
              >
                <Plus className="mr-1 size-3" />
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search motion scenes…"
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant={categoryId === "all" && !gnnOnly ? "secondary" : "ghost"}
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
            onClick={() => {
              setGnnOnly(true);
              setCategoryId("all");
            }}
          >
            GNN Package ({gnnSceneCount})
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              size="sm"
              variant={categoryId === category.id ? "secondary" : "ghost"}
              onClick={() => {
                setCategoryId(category.id);
                setGnnOnly(false);
              }}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {projectId ? (
        <p className="text-xs text-muted-foreground">
          Open a scene to edit, then use <strong>Place at playhead</strong> to
          add it to your Creative Studio project timeline.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((scene) => (
          <Card key={scene.id} className="overflow-hidden">
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, scene)}
              onClick={() => openScene(scene.id)}
              className="w-full p-4 text-left"
            >
              <div className="mb-3 flex aspect-video items-center justify-center rounded-md bg-gradient-to-br from-slate-900 to-slate-800">
                <Layers className="size-8 text-violet-400/80" />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{scene.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {MOTION_SCENE_TYPE_LABELS[scene.scene_type]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <GnnSceneBadge scene={scene} />
                  <Badge variant="outline" className="text-[10px]">
                    v{scene.version}
                  </Badge>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {(scene.duration_ms / 1000).toFixed(1)}s ·{" "}
                {typeof scene.metadata?.layer_count === "number"
                  ? scene.metadata.layer_count
                  : (scene.scene_document?.layers?.length ?? 0)}{" "}
                layers · {scene.aspect_format}
              </p>
            </button>
            <div className="flex border-t border-border/40 px-2 py-1">
              {isGnnScene(scene) ? (
                <p className="px-2 py-1.5 text-[10px] text-muted-foreground">
                  Master template — use History inside the editor for versions
                </p>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() =>
                    void duplicateMotionSceneAction(scene.id).then((result) => {
                      if (!result.success) {
                        toast.error(result.error ?? "Duplicate failed");
                        return;
                      }
                      setScenes((prev) => [result.data, ...prev]);
                      toast.success("Scene duplicated");
                    })
                  }
                >
                  Duplicate
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {gnnOnly
              ? "No GNN master scenes found. Open the library once to seed the package."
              : "No motion scenes yet. Use Newsroom Quick Create above."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
