"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ANIMATION_PRESET_CATALOG,
  COMPOSER_RIGHT_TABS,
  COMPOSER_VARIABLE_KEYS,
  RESOLUTION_PRESETS,
  TRANSITION_PRESETS,
  WORKFLOW_STATE_LABELS,
  WORKFLOW_STATES,
} from "@/features/scene-composer/constants/scene-composer.constants";
import type {
  ComposerRightTab,
  ComposerScene,
  SceneObject,
  SceneWorkflowState,
} from "@/features/scene-composer/types/scene-composer.types";

type ComposerRightPanelProps = {
  scene: ComposerScene;
  selectedObject: SceneObject | null;
  activeTab: ComposerRightTab;
  onTabChange: (tab: ComposerRightTab) => void;
  onScenePatch: (patch: Partial<ComposerScene>) => void;
  onObjectPatch: (id: string, patch: Partial<SceneObject>) => void;
};

export function ComposerRightPanel({
  scene,
  selectedObject,
  activeTab,
  onTabChange,
  onScenePatch,
  onObjectPatch,
}: ComposerRightPanelProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as ComposerRightTab)}
      className="flex h-full min-h-0 flex-col"
    >
      <TabsList className="mx-2 mt-2 grid grid-cols-4 gap-1">
        {COMPOSER_RIGHT_TABS.slice(0, 4).map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="text-[9px]">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsList className="mx-2 mt-1 grid grid-cols-3 gap-1">
        {COMPOSER_RIGHT_TABS.slice(4).map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="text-[9px]">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="properties" className="min-h-0 flex-1 overflow-auto p-3">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Scene name</Label>
            <Input
              value={scene.name}
              onChange={(e) => onScenePatch({ name: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Workflow</Label>
            <Select
              value={scene.workflow_state}
              onValueChange={(v) =>
                onScenePatch({ workflow_state: v as SceneWorkflowState })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {WORKFLOW_STATE_LABELS[state]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Duration (ms)</Label>
              <Input
                type="number"
                value={scene.duration_ms}
                onChange={(e) =>
                  onScenePatch({ duration_ms: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">FPS</Label>
              <Input
                type="number"
                value={scene.frame_rate}
                onChange={(e) =>
                  onScenePatch({ frame_rate: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Resolution</Label>
            <Select
              value={scene.composer_settings.resolution_preset}
              onValueChange={(value) => {
                const preset = RESOLUTION_PRESETS.find((p) => p.id === value);
                onScenePatch({
                  composer_settings: {
                    ...scene.composer_settings,
                    resolution_preset: value as ComposerScene["composer_settings"]["resolution_preset"],
                    custom_width: preset?.width ?? scene.composer_settings.custom_width,
                    custom_height: preset?.height ?? scene.composer_settings.custom_height,
                  },
                });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="inspector" className="min-h-0 flex-1 overflow-auto p-3">
        {selectedObject ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold">{selectedObject.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {selectedObject.object_type}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["x", "y", "width", "height"] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs capitalize">{key}</Label>
                  <Input
                    type="number"
                    value={
                      key === "x" || key === "y"
                        ? selectedObject.transform[key]
                        : selectedObject.transform[key]
                    }
                    onChange={(e) =>
                      onObjectPatch(selectedObject.id, {
                        transform: {
                          ...selectedObject.transform,
                          [key]: Number(e.target.value),
                        },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
            {typeof selectedObject.content.text === "string" ? (
              <div className="space-y-1">
                <Label className="text-xs">Text content</Label>
                <Textarea
                  value={String(selectedObject.content.text)}
                  onChange={(e) =>
                    onObjectPatch(selectedObject.id, {
                      content: { ...selectedObject.content, text: e.target.value },
                    })
                  }
                  className="min-h-20 text-xs"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Select an object on the canvas to inspect properties.
          </p>
        )}
      </TabsContent>

      <TabsContent value="animations" className="min-h-0 flex-1 overflow-auto p-3">
        <p className="mb-2 text-[10px] text-muted-foreground">
          Keyframe architecture — attach animation presets to layers.
        </p>
        <div className="space-y-1.5">
          {ANIMATION_PRESET_CATALOG.map((preset) => (
            <div
              key={preset.id}
              className="rounded-md border border-border/60 px-2 py-1.5 text-xs"
            >
              {preset.name}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] font-semibold uppercase text-muted-foreground">
          Scene transitions
        </p>
        <div className="mt-1 space-y-1">
          {TRANSITION_PRESETS.map((preset) => (
            <div key={preset.id} className="text-xs text-muted-foreground">
              {preset.name}
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="variables" className="min-h-0 flex-1 overflow-auto p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {COMPOSER_VARIABLE_KEYS.map((key) => (
            <Badge key={key} variant="outline" className="text-[9px]">
              {`{{${key}}}`}
            </Badge>
          ))}
        </div>
        {scene.composer_document.variables.map((variable) => (
          <div key={variable.id} className="mb-2 rounded-md border border-border/60 p-2">
            <p className="text-xs font-medium">{variable.label}</p>
            <p className="text-[10px] text-muted-foreground">{variable.variable_key}</p>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="effects" className="min-h-0 flex-1 overflow-auto p-3">
        <p className="text-xs text-muted-foreground">
          Blur, mask, and color effects attach via keyframes and object style.
        </p>
      </TabsContent>

      <TabsContent value="bindings" className="min-h-0 flex-1 overflow-auto p-3">
        {scene.composer_document.bindings.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Bind object properties to story variables. Use {"{{headline}}"} in
            text content for automatic resolution.
          </p>
        ) : (
          scene.composer_document.bindings.map((binding) => (
            <div key={binding.id} className="mb-2 rounded-md border p-2 text-xs">
              {binding.token} → {binding.target_property}
            </div>
          ))
        )}
      </TabsContent>

      <TabsContent value="theme" className="min-h-0 flex-1 overflow-auto p-3">
        <div className="space-y-2">
          <Label className="text-xs">Background</Label>
          <Input
            value={scene.composer_settings.background}
            onChange={(e) =>
              onScenePatch({
                composer_settings: {
                  ...scene.composer_settings,
                  background: e.target.value,
                },
              })
            }
            className="h-8 text-xs"
          />
          <Label className="text-xs">Theme mode</Label>
          <p className="text-xs text-muted-foreground">{scene.theme_mode}</p>
          <p className="text-[10px] text-muted-foreground">
            Brand kit integration uses organization defaults when channel theme is
            active.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
