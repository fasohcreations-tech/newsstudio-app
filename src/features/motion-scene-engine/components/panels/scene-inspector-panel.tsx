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
  ASPECT_FORMATS,
  MOTION_SCENE_TYPE_LABELS,
  SCENE_THEME_MODES,
  STANDARD_VARIABLE_KEYS,
} from "@/features/motion-scene-engine/constants/motion-scene.constants";
import type { MotionSceneWithRelations } from "@/features/motion-scene-engine/types/motion-scene.types";

type SceneInspectorPanelProps = {
  scene: MotionSceneWithRelations;
  selectedLayerId: string | null;
  onUpdate: (patch: Record<string, unknown>) => void;
};

export function SceneInspectorPanel({
  scene,
  selectedLayerId,
  onUpdate,
}: SceneInspectorPanelProps) {
  const selectedLayer = scene.scene_document.layers.find(
    (layer) => layer.id === selectedLayerId,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs defaultValue="properties" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid w-auto grid-cols-4">
          <TabsTrigger value="properties" className="text-[10px]">
            Props
          </TabsTrigger>
          <TabsTrigger value="animations" className="text-[10px]">
            Anim
          </TabsTrigger>
          <TabsTrigger value="variables" className="text-[10px]">
            Vars
          </TabsTrigger>
          <TabsTrigger value="theme" className="text-[10px]">
            Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Scene name</Label>
              <Input
                value={scene.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scene type</Label>
              <p className="text-xs text-muted-foreground">
                {MOTION_SCENE_TYPE_LABELS[scene.scene_type]}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration (ms)</Label>
              <Input
                type="number"
                value={scene.duration_ms}
                onChange={(e) =>
                  onUpdate({ duration_ms: Number(e.target.value) })
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Aspect format</Label>
              <Select
                value={scene.aspect_format}
                onValueChange={(value) => onUpdate({ aspect_format: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_FORMATS.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLayer ? (
              <div className="rounded-lg border border-border/60 p-3">
                <p className="mb-2 text-xs font-semibold">Selected layer</p>
                <p className="text-xs">{selectedLayer.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedLayer.layer_type} · {selectedLayer.start_ms}–
                  {selectedLayer.end_ms}ms
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select a layer on the canvas or timeline.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="animations" className="min-h-0 flex-1 overflow-auto p-3">
          {scene.scene_document.animations.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No animation tracks yet. Attach presets from the animation
              library.
            </p>
          ) : (
            <div className="space-y-2">
              {scene.scene_document.animations.map((animation) => (
                <div
                  key={animation.id}
                  className="rounded-lg border border-border/60 p-2"
                >
                  <p className="text-xs font-medium">{animation.kind}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Layer {animation.layer_id?.slice(0, 8) ?? "—"}… ·{" "}
                    {animation.start_ms}ms
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="variables" className="min-h-0 flex-1 overflow-auto p-3">
          <p className="mb-2 text-[10px] text-muted-foreground">
            Bind placeholders to story variables using {"{{key}}"} syntax.
          </p>
          <div className="mb-3 flex flex-wrap gap-1">
            {STANDARD_VARIABLE_KEYS.map((key) => (
              <Badge key={key} variant="outline" className="text-[9px]">
                {`{{${key}}}`}
              </Badge>
            ))}
          </div>
          {scene.scene_document.placeholders.map((placeholder) => (
            <div
              key={placeholder.id}
              className="mb-2 rounded-lg border border-border/60 p-2"
            >
              <p className="text-xs font-medium">{placeholder.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {placeholder.placeholder_kind} → {placeholder.variable_key}
              </p>
              <Textarea
                value={String(
                  scene.resolved_bindings[placeholder.variable_key] ??
                    placeholder.default_value ??
                    "",
                )}
                readOnly
                className="mt-2 min-h-12 text-xs"
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="theme" className="min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Theme mode</Label>
              <Select
                value={scene.theme_mode}
                onValueChange={(value) => onUpdate({ theme_mode: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENE_THEME_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Primary</Label>
                <Input
                  value={String(
                    (scene.properties.theme_tokens as Record<string, string>)
                      ?.primary_color ?? "{{primary_color}}",
                  )}
                  onChange={(e) =>
                    onUpdate({
                      properties: {
                        ...scene.properties,
                        theme_tokens: {
                          ...(scene.properties.theme_tokens as Record<
                            string,
                            string
                          >),
                          primary_color: e.target.value,
                        },
                      },
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Secondary</Label>
                <Input
                  value={String(
                    (scene.properties.theme_tokens as Record<string, string>)
                      ?.secondary_color ?? "{{secondary_color}}",
                  )}
                  onChange={(e) =>
                    onUpdate({
                      properties: {
                        ...scene.properties,
                        theme_tokens: {
                          ...(scene.properties.theme_tokens as Record<
                            string,
                            string
                          >),
                          secondary_color: e.target.value,
                        },
                      },
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Brand kit integration uses organization defaults when channel
              theme is selected.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
