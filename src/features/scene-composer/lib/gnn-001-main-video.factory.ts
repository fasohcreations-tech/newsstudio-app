/**
 * GNN-001 Layer 3 — Main Video Container factory.
 */

import { createSceneObject } from "@/features/scene-composer/lib/object-factory";
import {
  GNN_001_MAIN_VIDEO_COMPONENT_SLUGS,
  GNN_001_MAIN_VIDEO_CONTAINER_SLUG,
  GNN_001_MAIN_VIDEO_DEFAULTS,
  GNN_001_MAIN_VIDEO_EDITABLE_PROPERTIES,
  GNN_001_MAIN_VIDEO_GEOMETRY,
  GNN_001_MAIN_VIDEO_LAYER_VERSION,
  GNN_001_MAIN_VIDEO_OBJECT_ID,
} from "@/features/scene-composer/lib/gnn-001-main-video.constants";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export function createGnn001MainVideoContainerObject(
  durationMs = 12000,
  sortOrder = 20,
): SceneObject {
  const object = createSceneObject({
    objectType: "component",
    name: "Main Video Container",
    durationMs,
    sortOrder,
    transform: { ...GNN_001_MAIN_VIDEO_GEOMETRY },
    content: {
      ...GNN_001_MAIN_VIDEO_DEFAULTS,
    },
  });

  return {
    ...object,
    id: GNN_001_MAIN_VIDEO_OBJECT_ID,
    layer_color: "#38BDF8",
    locked: false,
    style: {
      fill: "transparent",
      corner_radius: GNN_001_MAIN_VIDEO_DEFAULTS.corner_radius,
    },
    bindings: {
      border_width: "{{video_border_width}}",
      border_color: "{{video_border}}",
      corner_radius: "{{video_corner_radius}}",
      inner_shadow: "{{video_shadow}}",
      glass_opacity: "{{video_glass_opacity}}",
      frame_opacity: "{{video_frame_opacity}}",
      accent_color: "{{video_accent_color}}",
      accent_thickness: "{{video_accent_thickness}}",
      padding: "{{video_padding}}",
      safe_area: "{{video_safe_area}}",
      video_scale: "{{video_scale}}",
      video_position_x: "{{video_position_x}}",
      video_position_y: "{{video_position_y}}",
      video_rotation: "{{video_rotation}}",
      video_opacity: "{{video_opacity}}",
      crop: "{{video_crop}}",
      fit: "{{video_fit}}",
      media_mode: "{{video_media_mode}}",
      container_state: "{{video_container_state}}",
      top_bar_visible: "{{video_top_bar_visible}}",
      top_bar_height: "{{video_top_bar_height}}",
      top_bar_color: "{{video_top_bar_color}}",
      top_bar_opacity: "{{video_top_bar_opacity}}",
      bottom_bar_visible: "{{video_bottom_bar_visible}}",
      bottom_bar_height: "{{video_bottom_bar_height}}",
      bottom_bar_color: "{{video_bottom_bar_color}}",
      bottom_bar_opacity: "{{video_bottom_bar_opacity}}",
      animation_preset: "{{video_animation_preset}}",
      main_video: "{{main_video}}",
      main_image: "{{main_image}}",
      gallery_images: "{{gallery_images}}",
      live_feed: "{{live_feed}}",
      ai_video: "{{ai_video}}",
      scene_title: "{{scene_title}}",
      video_caption: "{{video_caption}}",
      camera: "{{camera}}",
      credit: "{{credit}}",
    },
    metadata: {
      component_slug: GNN_001_MAIN_VIDEO_CONTAINER_SLUG,
      component_kind: "custom",
      layer: "main_video_container",
      layer_index: 3,
      reusable: true,
      editable_properties: [...GNN_001_MAIN_VIDEO_EDITABLE_PROPERTIES],
      main_video_version: GNN_001_MAIN_VIDEO_LAYER_VERSION,
      replaces_region: "main-video",
      skeleton: false,
      subcomponents: Object.values(GNN_001_MAIN_VIDEO_COMPONENT_SLUGS),
      animation_placeholders: ["fade", "zoom", "slide", "mask_reveal", "push"],
    },
  };
}

export function buildGnn001MainVideoObjectTree(): SceneObject[] {
  const object = createGnn001MainVideoContainerObject();
  return [
    {
      ...object,
      transform: {
        ...object.transform,
        x: 0,
        y: 0,
      },
    },
  ];
}

export function buildGnn001MainVideoComponentRecord() {
  const d = GNN_001_MAIN_VIDEO_DEFAULTS;
  return {
    slug: GNN_001_MAIN_VIDEO_CONTAINER_SLUG,
    name: "GNN-001 Main Video Container",
    component_kind: "custom" as const,
    description:
      "Layer 3 premium TV broadcast video frame — VideoFrame, VideoMask, CornerAccent, overlays.",
    object_tree: buildGnn001MainVideoObjectTree(),
    default_bindings: {
      video_border_width: String(d.border_width),
      video_border: d.border_color,
      video_corner_radius: String(d.corner_radius),
      video_shadow: String(d.inner_shadow),
      video_glass_opacity: String(d.glass_opacity),
      video_frame_opacity: String(d.frame_opacity),
      video_accent_color: d.accent_color,
      video_accent_thickness: String(d.accent_thickness),
      video_padding: String(d.padding),
      video_safe_area: String(d.safe_area),
      video_scale: String(d.video_scale),
      video_position_x: String(d.video_position_x),
      video_position_y: String(d.video_position_y),
      video_rotation: String(d.video_rotation),
      video_opacity: String(d.video_opacity),
      video_crop: String(d.crop),
      video_fit: d.fit,
      video_media_mode: d.media_mode,
      video_container_state: d.container_state,
      video_top_bar_visible: String(d.top_bar_visible),
      video_top_bar_height: String(d.top_bar_height),
      video_top_bar_color: d.top_bar_color,
      video_top_bar_opacity: String(d.top_bar_opacity),
      video_bottom_bar_visible: String(d.bottom_bar_visible),
      video_bottom_bar_height: String(d.bottom_bar_height),
      video_bottom_bar_color: d.bottom_bar_color,
      video_bottom_bar_opacity: String(d.bottom_bar_opacity),
      video_animation_preset: d.animation_preset,
    },
    metadata: {
      package_id: "gnn-broadcast-v1",
      editable: true,
      ai_ready: true,
      layer: "main_video_container",
      layer_index: 3,
      main_video_version: GNN_001_MAIN_VIDEO_LAYER_VERSION,
      editable_properties: [...GNN_001_MAIN_VIDEO_EDITABLE_PROPERTIES],
      subcomponents: Object.values(GNN_001_MAIN_VIDEO_COMPONENT_SLUGS),
    },
  };
}
