import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export const GNN_001_LOGO_LAYOUT = {
  y: 128,
  height: 231,
} as const;

export const GNN_001_OPTIONAL_INFO_2_LAYOUT = {
  y: 392,
  height: 294,
} as const;

function regionKeyOf(object: SceneObject) {
  return typeof object.metadata?.region_key === "string"
    ? object.metadata.region_key
    : "";
}

export function isOptionalInfo3Object(object: SceneObject) {
  return (
    regionKeyOf(object) === "optional-info-3" ||
    object.metadata?.component_slug === "gnn-001-optional-info-3" ||
    /optional information area 3/i.test(object.name)
  );
}

export function isReporterLogoObject(object: SceneObject) {
  return (
    regionKeyOf(object) === "reporter-logo" ||
    object.metadata?.component_slug === "gnn-001-reporter-logo" ||
    /reporter|logo/i.test(object.name)
  );
}

export function isOptionalInfo2Object(object: SceneObject) {
  const region = regionKeyOf(object);
  return (
    region === "optional-info-2" ||
    region === "optional-info-1" ||
    region === "optional-info" ||
    (/optional information/i.test(object.name) && !isOptionalInfo3Object(object))
  );
}

/** Apply left-rail layout: remove area 3, size logo + info area 2. */
export function patchGnn001LeftRailObjects(objects: SceneObject[]): SceneObject[] {
  if (!needsGnn001LeftRailPatch(objects)) return objects;

  return objects
    .filter((object) => !isOptionalInfo3Object(object))
    .map((object) => {
      if (isReporterLogoObject(object) && regionKeyOf(object) === "reporter-logo") {
        if (
          object.transform.y === GNN_001_LOGO_LAYOUT.y &&
          object.transform.height === GNN_001_LOGO_LAYOUT.height
        ) {
          return object;
        }
        return {
          ...object,
          transform: {
            ...object.transform,
            y: GNN_001_LOGO_LAYOUT.y,
            height: GNN_001_LOGO_LAYOUT.height,
          },
        };
      }

      if (
        isOptionalInfo2Object(object) &&
        (regionKeyOf(object) === "optional-info-1" ||
          regionKeyOf(object) === "optional-info-2" ||
          regionKeyOf(object) === "optional-info")
      ) {
        if (
          object.name === "Optional Information Area 2" &&
          regionKeyOf(object) === "optional-info-2" &&
          object.transform.y === GNN_001_OPTIONAL_INFO_2_LAYOUT.y &&
          object.transform.height === GNN_001_OPTIONAL_INFO_2_LAYOUT.height
        ) {
          return object;
        }
        return {
          ...object,
          name: "Optional Information Area 2",
          transform: {
            ...object.transform,
            y: GNN_001_OPTIONAL_INFO_2_LAYOUT.y,
            height: GNN_001_OPTIONAL_INFO_2_LAYOUT.height,
          },
          metadata: {
            ...object.metadata,
            region_key: "optional-info-2",
            placeholder_label: "Optional Information Area 2",
            component_slug: "gnn-001-optional-info",
          },
        };
      }

      return object;
    });
}

export function needsGnn001LeftRailPatch(objects: SceneObject[]): boolean {
  if (objects.some(isOptionalInfo3Object)) return true;

  return objects.some((object) => {
    if (regionKeyOf(object) === "reporter-logo") {
      return (
        object.transform.y !== GNN_001_LOGO_LAYOUT.y ||
        object.transform.height !== GNN_001_LOGO_LAYOUT.height
      );
    }
    if (
      regionKeyOf(object) === "optional-info-1" ||
      regionKeyOf(object) === "optional-info-2"
    ) {
      return (
        regionKeyOf(object) !== "optional-info-2" ||
        object.transform.y !== GNN_001_OPTIONAL_INFO_2_LAYOUT.y ||
        object.transform.height !== GNN_001_OPTIONAL_INFO_2_LAYOUT.height
      );
    }
    return false;
  });
}
