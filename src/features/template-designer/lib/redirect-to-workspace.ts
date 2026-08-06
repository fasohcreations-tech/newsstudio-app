import { redirect } from "next/navigation";

import type { InspectorTab } from "@/features/scene-composer/components/editor/property-inspector-panel";

/**
 * Feature 040 is a single-page workspace. The former per-feature panel routes
 * stay as redirects so existing links/bookmarks land in the Design workspace
 * with the matching Property Inspector tab already open.
 */
export function redirectToWorkspace(
  templateId: string,
  inspector?: InspectorTab,
): never {
  const query = inspector ? `?inspector=${inspector}` : "";
  redirect(`/templates/${templateId}/design${query}`);
}

const INSPECTOR_TABS: InspectorTab[] = [
  "object",
  "text",
  "transform",
  "animation",
  "effects",
  "behaviors",
  "shape",
  "bindings",
  "story",
];

/** Validates the `?inspector=` query value from a redirected legacy route. */
export function parseInspectorTab(
  value: string | undefined,
): InspectorTab | undefined {
  if (!value) return undefined;
  return (INSPECTOR_TABS as string[]).includes(value)
    ? (value as InspectorTab)
    : undefined;
}
