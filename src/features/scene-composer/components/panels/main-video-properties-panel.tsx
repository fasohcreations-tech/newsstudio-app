"use client";

import { Film, Replace } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

type MainVideoPropertiesPanelProps = {
  data: StoryDataRecord;
  onFieldChange: <K extends keyof StoryDataRecord>(
    key: K,
    value: StoryDataRecord[K],
  ) => void;
  onClearSelection?: () => void;
  onBrowseMedia?: () => void;
  selectedObject?: SceneObject | null;
  onObjectPatch?: (id: string, patch: Partial<SceneObject>) => void;
  onPreviewMotion?: () => void;
};

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/**
 * Properties Panel controls for Main Video Container selection.
 */
export function MainVideoPropertiesPanel({
  data,
  onFieldChange,
  onClearSelection,
  onBrowseMedia,
}: MainVideoPropertiesPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 p-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Properties
          </p>
          <p className="text-sm font-medium">Main Video Container</p>
          <p className="text-[10px] text-muted-foreground">
            Layer 3 · MediaOS broadcast frame
          </p>
        </div>
        {onClearSelection ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={onClearSelection}
          >
            Done
          </Button>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Media Source
            </p>
            <FieldRow label="Source URL">
              <Input
                value={data.main_video}
                onChange={(e) => onFieldChange("main_video", e.target.value)}
                placeholder="/demo/gnn/sample-news.mp4"
                className="h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Media Mode">
              <Select
                value={data.video_media_mode || "video"}
                onValueChange={(value) =>
                  onFieldChange("video_media_mode", value ?? "video")
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="slideshow">Slideshow</SelectItem>
                  <SelectItem value="live_feed">Live Feed</SelectItem>
                  <SelectItem value="ai_video">AI Generated Video</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-full text-xs"
              onClick={() => {
                if (onBrowseMedia) {
                  onBrowseMedia();
                  return;
                }
                onFieldChange("main_video", "");
              }}
            >
              <Replace className="mr-1.5 size-3.5" />
              Replace Media
            </Button>
            {!data.main_video ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
                <Film className="size-3.5 shrink-0" />
                No media assigned — drop or set a source URL.
              </div>
            ) : null}
          </section>

          <Separator />

          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Crop · Fit · Transform
            </p>
            <FieldRow label="Fit">
              <Select
                value={data.video_fit || "fill"}
                onValueChange={(value) =>
                  onFieldChange("video_fit", value ?? "fill")
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">Fit</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                  <SelectItem value="crop">Crop</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Crop">
                <Input
                  value={data.video_crop}
                  onChange={(e) => onFieldChange("video_crop", e.target.value)}
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Scale">
                <Input
                  value={data.video_scale}
                  onChange={(e) => onFieldChange("video_scale", e.target.value)}
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Position X">
                <Input
                  value={data.video_position_x}
                  onChange={(e) =>
                    onFieldChange("video_position_x", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Position Y">
                <Input
                  value={data.video_position_y}
                  onChange={(e) =>
                    onFieldChange("video_position_y", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Rotation">
                <Input
                  value={data.video_rotation}
                  onChange={(e) =>
                    onFieldChange("video_rotation", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Opacity">
                <Input
                  value={data.video_opacity}
                  onChange={(e) =>
                    onFieldChange("video_opacity", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Border · Corner · Shadow · Glass
            </p>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Border">
                <Input
                  type="color"
                  value={data.video_border || "#2A3344"}
                  onChange={(e) => onFieldChange("video_border", e.target.value)}
                  className="h-8 p-1"
                />
              </FieldRow>
              <FieldRow label="Border Width">
                <Input
                  value={data.video_border_width}
                  onChange={(e) =>
                    onFieldChange("video_border_width", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Corner Radius">
                <Input
                  value={data.video_corner_radius}
                  onChange={(e) =>
                    onFieldChange("video_corner_radius", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Inner Shadow">
                <Input
                  value={data.video_shadow}
                  onChange={(e) => onFieldChange("video_shadow", e.target.value)}
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Glass">
                <Input
                  value={data.video_glass_opacity}
                  onChange={(e) =>
                    onFieldChange("video_glass_opacity", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Frame Opacity">
                <Input
                  value={data.video_frame_opacity}
                  onChange={(e) =>
                    onFieldChange("video_frame_opacity", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Accent">
                <Input
                  type="color"
                  value={data.video_accent_color || data.accent_color || "#1D4ED8"}
                  onChange={(e) =>
                    onFieldChange("video_accent_color", e.target.value)
                  }
                  className="h-8 p-1"
                />
              </FieldRow>
              <FieldRow label="Accent Thickness">
                <Input
                  value={data.video_accent_thickness}
                  onChange={(e) =>
                    onFieldChange("video_accent_thickness", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Padding">
                <Input
                  value={data.video_padding}
                  onChange={(e) =>
                    onFieldChange("video_padding", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Safe Area">
                <Input
                  value={data.video_safe_area}
                  onChange={(e) =>
                    onFieldChange("video_safe_area", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
            </div>
            <FieldRow label="Live State">
              <Select
                value={data.video_container_state || "normal"}
                onValueChange={(value) =>
                  onFieldChange("video_container_state", value ?? "normal")
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="live">LIVE</SelectItem>
                  <SelectItem value="breaking">Breaking</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="remote_feed">Remote Feed</SelectItem>
                  <SelectItem value="fullscreen">Fullscreen</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </section>

          <Separator />

          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Information Bars
            </p>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Top Bar (scene_title)</Label>
              <Switch
                checked={Boolean(data.video_top_bar_visible)}
                onCheckedChange={(checked) =>
                  onFieldChange("video_top_bar_visible", checked)
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Height">
                <Input
                  value={data.video_top_bar_height}
                  onChange={(e) =>
                    onFieldChange("video_top_bar_height", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Opacity">
                <Input
                  value={data.video_top_bar_opacity}
                  onChange={(e) =>
                    onFieldChange("video_top_bar_opacity", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </FieldRow>
            </div>
            <FieldRow label="Top Bar Color">
              <Input
                type="color"
                value={data.video_top_bar_color || "#071225"}
                onChange={(e) =>
                  onFieldChange("video_top_bar_color", e.target.value)
                }
                className="h-8 p-1"
              />
            </FieldRow>
            <FieldRow label="Scene Title">
              <Input
                value={data.scene_title}
                onChange={(e) => onFieldChange("scene_title", e.target.value)}
                placeholder="{{scene_title}}"
                className="h-8 text-xs"
              />
            </FieldRow>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Label className="text-xs">Bottom Bar</Label>
              <Switch
                checked={Boolean(data.video_bottom_bar_visible)}
                onCheckedChange={(checked) =>
                  onFieldChange("video_bottom_bar_visible", checked)
                }
              />
            </div>
            <FieldRow label="Caption">
              <Input
                value={data.video_caption}
                onChange={(e) => onFieldChange("video_caption", e.target.value)}
                placeholder="{{video_caption}}"
                className="h-8 text-xs"
              />
            </FieldRow>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Camera">
                <Input
                  value={data.camera}
                  onChange={(e) => onFieldChange("camera", e.target.value)}
                  placeholder="{{camera}}"
                  className="h-8 text-xs"
                />
              </FieldRow>
              <FieldRow label="Credit">
                <Input
                  value={data.credit}
                  onChange={(e) => onFieldChange("credit", e.target.value)}
                  placeholder="{{credit}}"
                  className="h-8 text-xs"
                />
              </FieldRow>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
