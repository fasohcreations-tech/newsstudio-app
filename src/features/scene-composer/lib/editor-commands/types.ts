/**
 * Feature 041 — Editor Command System.
 *
 * Every document mutation goes through a named command. Commands produce
 * undo/redo closures for the existing history stack — they do not edit
 * React state directly.
 */

import type {
  ComposerHistoryCommand,
  ObjectTransform,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";

export type EditorCommandKind =
  | "move_layer"
  | "resize_layer"
  | "rotate_layer"
  | "transform_layer"
  | "delete_layers"
  | "duplicate_layers"
  | "rename_layer"
  | "reorder_layers"
  | "group_layers"
  | "ungroup_layers"
  | "toggle_visibility"
  | "toggle_lock"
  | "align_layers"
  | "nudge_layers"
  | "paste_layers"
  | "update_object"
  | "set_objects";

export type EditorCommand = ComposerHistoryCommand & {
  kind: EditorCommandKind;
};

export type ObjectsSnapshot = {
  previous: SceneObject[];
  next: SceneObject[];
};

export type ApplyObjects = (
  next: SceneObject[],
  previous: SceneObject[],
  label: string,
  kind: EditorCommandKind,
) => void;

export type ApplyObjectsSilent = (next: SceneObject[]) => void;

/** Labels shown in History / undo toast. */
export const COMMAND_LABELS: Record<EditorCommandKind, string> = {
  move_layer: "Move layer",
  resize_layer: "Resize layer",
  rotate_layer: "Rotate layer",
  transform_layer: "Transform layer",
  delete_layers: "Delete layer(s)",
  duplicate_layers: "Duplicate layer(s)",
  rename_layer: "Rename layer",
  reorder_layers: "Reorder layers",
  group_layers: "Group layers",
  ungroup_layers: "Ungroup",
  toggle_visibility: "Toggle visibility",
  toggle_lock: "Toggle lock",
  align_layers: "Align layers",
  nudge_layers: "Nudge layers",
  paste_layers: "Paste layers",
  update_object: "Update object",
  set_objects: "Edit objects",
};

export function transformKind(
  origin: ObjectTransform,
  next: ObjectTransform,
): EditorCommandKind {
  const moved =
    origin.x !== next.x ||
    origin.y !== next.y ||
    origin.scale !== next.scale;
  const resized =
    origin.width !== next.width || origin.height !== next.height;
  const rotated = origin.rotation !== next.rotation;
  if (resized && !rotated && origin.x === next.x && origin.y === next.y) {
    return "resize_layer";
  }
  if (rotated && !resized && origin.x === next.x && origin.y === next.y) {
    return "rotate_layer";
  }
  if (moved && !resized && !rotated) return "move_layer";
  return "transform_layer";
}
