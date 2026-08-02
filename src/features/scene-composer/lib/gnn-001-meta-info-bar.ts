import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

export const GNN_001_META_INFO_BAR = {
  x: 1504,
  y: 28,
  width: 376,
  height: 44,
  background: "#DC2626",
  textColor: "#FFFFFF",
  borderRadius: 10,
} as const;

export function isMetaInfoBarObject(object: SceneObject) {
  return (
    object.metadata?.region_key === "meta-info-bar" ||
    object.metadata?.component_slug === "gnn-001-meta-info-bar"
  );
}

export function isLegacyMetaPartObject(object: SceneObject) {
  const regionKey = object.metadata?.region_key;
  return regionKey === "clock" || regionKey === "date" || regionKey === "place";
}

export function buildMetaInfoLine(bindings: Record<string, string>): string {
  const place = String(bindings.place ?? "").trim();
  const date = String(bindings.date ?? "").trim();
  const time = String(bindings.time ?? "").trim();
  return [place, date, time].filter(Boolean).join("  ·  ");
}
