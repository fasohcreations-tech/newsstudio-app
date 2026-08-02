import type { MotionSceneDocument } from "@/features/motion-scene-engine/types/motion-scene.types";

export type ClipMotionSceneMetadata = {
  motionSceneId: string | null;
  sceneType: string | null;
  sceneDocument: MotionSceneDocument;
  resolvedBindings: Record<string, string>;
};

function isSceneDocument(value: unknown): value is MotionSceneDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as MotionSceneDocument;
  return (
    typeof doc.version === "string" &&
    Array.isArray(doc.layers) &&
    Array.isArray(doc.placeholders)
  );
}

export function parseClipMotionSceneMetadata(
  metadata: Record<string, unknown>,
): ClipMotionSceneMetadata | null {
  const sceneDocument =
    metadata.scene_document ?? metadata.motion_scene_document;
  if (!isSceneDocument(sceneDocument)) return null;

  const resolvedBindings =
    metadata.resolved_bindings &&
    typeof metadata.resolved_bindings === "object" &&
    !Array.isArray(metadata.resolved_bindings)
      ? (metadata.resolved_bindings as Record<string, string>)
      : metadata.resolved_variables &&
          typeof metadata.resolved_variables === "object"
        ? (metadata.resolved_variables as Record<string, string>)
        : {};

  return {
    motionSceneId:
      typeof metadata.motion_scene_id === "string"
        ? metadata.motion_scene_id
        : typeof metadata.graphic_instance_id === "string"
          ? metadata.graphic_instance_id
          : null,
    sceneType:
      typeof metadata.scene_type === "string"
        ? metadata.scene_type
        : typeof metadata.graphic_type === "string"
          ? metadata.graphic_type
          : null,
    sceneDocument,
    resolvedBindings,
  };
}

export function buildSceneEditorHref(input: {
  sceneId: string;
  projectId?: string | null;
  trackId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.projectId) params.set("projectId", input.projectId);
  if (input.trackId) params.set("trackId", input.trackId);
  const query = params.toString();
  return `/creative-studio/scenes/${input.sceneId}${query ? `?${query}` : ""}`;
}

export function buildSceneLibraryHref(
  context: { projectId?: string | null; trackId?: string | null } = {},
): string {
  const params = new URLSearchParams();
  if (context.projectId) params.set("projectId", context.projectId);
  if (context.trackId) params.set("trackId", context.trackId);
  const query = params.toString();
  return `/creative-studio/scenes${query ? `?${query}` : ""}`;
}
