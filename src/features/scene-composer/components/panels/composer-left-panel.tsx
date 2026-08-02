"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Clock,
  Image,
  Layers,
  Shapes,
  Sparkles,
  Type,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COMPOSER_LEFT_TABS,
  DATA_TOOL_OBJECTS,
  MEDIA_TOOL_OBJECTS,
  SCENE_OBJECT_TYPE_LABELS,
  SHAPE_TOOL_OBJECTS,
  TEXT_TOOL_OBJECTS,
} from "@/features/scene-composer/constants/scene-composer.constants";
import type { ComposerLeftTab, SceneObjectType } from "@/features/scene-composer/types/scene-composer.types";
import type { MotionScene, SceneCategory } from "@/features/motion-scene-engine/types/motion-scene.types";
import { SceneLibraryPanel } from "@/features/motion-scene-engine/components/panels/scene-library-panel";
import type { SceneComponent } from "@/features/scene-composer/types/scene-composer.types";
import {
  countGnnScenes,
  filterGnnComponents,
  isGnnComponent,
} from "@/features/scene-composer/lib/gnn-package-utils";

type ComposerLeftPanelProps = {
  scenes: MotionScene[];
  categories: SceneCategory[];
  components: SceneComponent[];
  projectId?: string | null;
  activeTab: ComposerLeftTab;
  onTabChange: (tab: ComposerLeftTab) => void;
  onScenesChange: (scenes: MotionScene[]) => void;
  onOpenScene: (sceneId: string) => void;
  onAddObject: (type: SceneObjectType) => void;
};

const TAB_ICONS: Partial<Record<ComposerLeftTab, React.ReactNode>> = {
  library: <Layers className="size-3.5" />,
  templates: <Box className="size-3.5" />,
  media: <Image className="size-3.5" />,
  brand: <Sparkles className="size-3.5" />,
  shapes: <Shapes className="size-3.5" />,
  ai: <Wand2 className="size-3.5" />,
};

function ObjectGrid({
  types,
  onAdd,
}: {
  types: SceneObjectType[];
  onAdd: (type: SceneObjectType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 p-3">
      {types.map((type) => (
        <Button
          key={type}
          type="button"
          size="sm"
          variant="outline"
          className="h-auto flex-col gap-1 px-2 py-2 text-[10px]"
          onClick={() => onAdd(type)}
        >
          <Type className="size-3.5 opacity-60" />
          {SCENE_OBJECT_TYPE_LABELS[type]}
        </Button>
      ))}
    </div>
  );
}

export function ComposerLeftPanel({
  scenes,
  categories,
  components,
  projectId,
  activeTab,
  onTabChange,
  onScenesChange,
  onOpenScene,
  onAddObject,
}: ComposerLeftPanelProps) {
  const [gnnComponentsOnly, setGnnComponentsOnly] = useState(false);
  const gnnComponentCount = useMemo(
    () => filterGnnComponents(components).length,
    [components],
  );
  const gnnSceneCount = useMemo(() => countGnnScenes(scenes), [scenes]);

  const displayedComponents = useMemo(() => {
    if (!gnnComponentsOnly) return components;
    return filterGnnComponents(components);
  }, [components, gnnComponentsOnly]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as ComposerLeftTab)}
      className="flex h-full min-h-0 flex-col"
    >
      <TabsList className="mx-2 mt-2 grid h-auto grid-cols-3 gap-1">
        {COMPOSER_LEFT_TABS.slice(0, 6).map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="px-1 text-[9px]">
            {TAB_ICONS[tab.id]}
            <span className="ml-1 hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="library" className="min-h-0 flex-1">
        <SceneLibraryPanel
          scenes={scenes}
          categories={categories}
          projectId={projectId}
          onScenesChange={onScenesChange}
          onOpenScene={onOpenScene}
        />
      </TabsContent>

      <TabsContent value="templates" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Motion Scene Templates
              </p>
              <Badge variant="outline" className="text-[9px]">
                GNN {gnnSceneCount}/10
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant={!gnnComponentsOnly ? "secondary" : "ghost"}
                className="h-6 px-2 text-[10px]"
                onClick={() => setGnnComponentsOnly(false)}
              >
                All ({components.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={gnnComponentsOnly ? "secondary" : "ghost"}
                className="h-6 px-2 text-[10px]"
                onClick={() => setGnnComponentsOnly(true)}
              >
                GNN ({gnnComponentCount})
              </Button>
            </div>
            {displayedComponents.map((component) => (
              <button
                key={component.id}
                type="button"
                className="w-full rounded-lg border border-border/60 p-2.5 text-left hover:bg-muted/40"
                onClick={() => onAddObject("component")}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-xs font-medium">{component.name}</p>
                  {isGnnComponent(component) ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-blue-500/40 bg-blue-500/10 text-[9px] text-blue-700 dark:text-blue-300"
                    >
                      GNN
                    </Badge>
                  ) : null}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {component.component_kind} · v{component.version}
                </p>
              </button>
            ))}
            {displayedComponents.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {gnnComponentsOnly
                  ? "No GNN components seeded yet."
                  : "No reusable components yet."}
              </p>
            ) : null}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="media" className="min-h-0 flex-1">
        <ObjectGrid types={MEDIA_TOOL_OBJECTS} onAdd={onAddObject} />
        <p className="px-3 pb-3 text-[10px] text-muted-foreground">
          Stock &amp; AI asset browsers — placeholder architecture for future
          integrations.
        </p>
      </TabsContent>

      <TabsContent value="brand" className="min-h-0 flex-1 p-3">
        <p className="text-xs text-muted-foreground">
          Brand kit logos, colors, and fonts integrate via Theme panel and
          variable bindings.
        </p>
      </TabsContent>

      <TabsContent value="icons" className="min-h-0 flex-1 p-3">
        <p className="text-xs text-muted-foreground">Icon library placeholder.</p>
      </TabsContent>

      <TabsContent value="shapes" className="min-h-0 flex-1">
        <ObjectGrid types={SHAPE_TOOL_OBJECTS} onAdd={onAddObject} />
        <div className="border-t border-border/40">
          <p className="px-3 pt-2 text-[10px] font-semibold uppercase text-muted-foreground">
            Text &amp; Data
          </p>
          <ObjectGrid types={[...TEXT_TOOL_OBJECTS, ...DATA_TOOL_OBJECTS]} onAdd={onAddObject} />
        </div>
      </TabsContent>

      <TabsContent value="svg" className="min-h-0 flex-1 p-3">
        <Button type="button" size="sm" variant="outline" onClick={() => onAddObject("svg")}>
          Add SVG Object
        </Button>
      </TabsContent>

      <TabsContent value="stock" className="min-h-0 flex-1 p-3">
        <p className="text-xs text-muted-foreground">Stock assets placeholder.</p>
      </TabsContent>

      <TabsContent value="ai" className="min-h-0 flex-1 p-3">
        <div className="flex items-start gap-2 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
          <Clock className="mt-0.5 size-4 text-violet-400" />
          <div>
            <p className="text-xs font-medium">AI integration architecture</p>
            <p className="text-[10px] text-muted-foreground">
              AI will populate variables, replace media, and choose scenes
              without modifying the composer. No auto-generated layouts in this
              module.
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
