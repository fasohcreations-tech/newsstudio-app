import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export const GNN_001_LOWER_PANEL_FILL = "#FFFFFF";
export const GNN_001_LOWER_PANEL_TEXT_COLOR = "#000000";
export const GNN_001_LOWER_PANEL_BORDER = "rgba(0,0,0,0.08)";

function isLowerInfoPanelObject(object: SceneObject) {
  return object.metadata?.region_key === "lower-info-panel";
}

function isLowerPanelTextObject(object: SceneObject) {
  const regionKey = object.metadata?.region_key;
  return regionKey === "headline" || regionKey === "subheadline";
}

function isLowerInfoFrameObject(object: SceneObject) {
  return (
    object.metadata?.frame_kind === "lower_info" ||
    object.metadata?.component_slug === "gnn-001-frame-lower-info"
  );
}

function isFrameLayerObject(object: SceneObject) {
  return (
    object.metadata?.layer === "frames" ||
    (typeof object.metadata?.component_slug === "string" &&
      object.metadata.component_slug.startsWith("gnn-001-frame-"))
  );
}

/** Runtime + document patch for white lower panel and black headline text. */
export function patchGnn001LowerPanelObjects(objects: SceneObject[]): SceneObject[] {
  let changed = false;
  const next = objects.map((object) => {
    if (isLowerInfoPanelObject(object)) {
      if (
        object.style.fill === GNN_001_LOWER_PANEL_FILL &&
        object.style.border_color === GNN_001_LOWER_PANEL_BORDER &&
        object.style.color === GNN_001_LOWER_PANEL_TEXT_COLOR
      ) {
        return object;
      }
      changed = true;
      return {
        ...object,
        style: {
          ...object.style,
          fill: GNN_001_LOWER_PANEL_FILL,
          border_color: GNN_001_LOWER_PANEL_BORDER,
          color: GNN_001_LOWER_PANEL_TEXT_COLOR,
        },
      };
    }

    if (isLowerPanelTextObject(object)) {
      if (object.style.color === GNN_001_LOWER_PANEL_TEXT_COLOR) return object;
      changed = true;
      return {
        ...object,
        style: {
          ...object.style,
          color: GNN_001_LOWER_PANEL_TEXT_COLOR,
        },
      };
    }

    if (isFrameLayerObject(object)) {
      const solidFill = isLowerInfoFrameObject(object)
        ? GNN_001_LOWER_PANEL_FILL
        : object.content.solid_fill;
      if (
        object.content.hide_chrome === true &&
        object.content.glass === false &&
        object.content.accent_strip === false &&
        object.content.corner_marks === false &&
        object.content.solid_fill === solidFill
      ) {
        return object;
      }
      changed = true;
      return {
        ...object,
        content: {
          ...object.content,
          hide_chrome: true,
          glass: false,
          accent_strip: false,
          corner_marks: false,
          ...(isLowerInfoFrameObject(object)
            ? { solid_fill: GNN_001_LOWER_PANEL_FILL }
            : {}),
        },
      };
    }

    return object;
  });
  return changed ? next : objects;
}

export function gnn001LowerPanelFrameContent(
  object: SceneObject,
  content: Record<string, unknown> = {},
): Record<string, unknown> {
  if (!isFrameLayerObject(object)) return content;
  return {
    ...content,
    hide_chrome: true,
    glass: false,
    accent_strip: false,
    corner_marks: false,
    ...(isLowerInfoFrameObject(object)
      ? { solid_fill: GNN_001_LOWER_PANEL_FILL }
      : {}),
  };
}

export function needsGnn001LowerPanelPatch(objects: SceneObject[]): boolean {
  return objects.some((object) => {
    if (isLowerInfoPanelObject(object)) {
      return object.style.fill !== GNN_001_LOWER_PANEL_FILL;
    }
    if (isLowerPanelTextObject(object)) {
      return object.style.color !== GNN_001_LOWER_PANEL_TEXT_COLOR;
    }
    if (isFrameLayerObject(object)) {
      return (
        object.content.hide_chrome !== true ||
        (isLowerInfoFrameObject(object) &&
          object.content.solid_fill !== GNN_001_LOWER_PANEL_FILL)
      );
    }
    return false;
  });
}
