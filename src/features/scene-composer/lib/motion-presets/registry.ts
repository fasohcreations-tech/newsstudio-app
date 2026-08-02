import { createDefaultLayerMotion } from "@/features/scene-composer/lib/motion-animation/constants";
import type { LayerMotionConfig } from "@/features/scene-composer/lib/motion-animation/types";
import { MOTION_PRESET_CATEGORIES } from "@/features/scene-composer/lib/motion-presets/categories";
import { BUILTIN_MOTION_PRESETS } from "@/features/scene-composer/lib/motion-presets/presets";
import type {
  MotionPreset,
  MotionPresetCategoryId,
} from "@/features/scene-composer/lib/motion-presets/types";

const builtinById = new Map(
  BUILTIN_MOTION_PRESETS.map((preset) => [preset.id, preset]),
);

export function listBuiltinPresets(): MotionPreset[] {
  return BUILTIN_MOTION_PRESETS;
}

export function getBuiltinPreset(id: string): MotionPreset | undefined {
  return builtinById.get(id);
}

export function listPresetsByCategory(
  presets: MotionPreset[],
  category: MotionPresetCategoryId | "all",
): MotionPreset[] {
  if (category === "all") return presets;
  return presets.filter((preset) => preset.category === category);
}

export function searchPresets(
  presets: MotionPreset[],
  query: string,
): MotionPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return presets;
  return presets.filter((preset) => {
    if (preset.name.toLowerCase().includes(q)) return true;
    if (preset.description.toLowerCase().includes(q)) return true;
    if (preset.category.replace(/_/g, " ").includes(q)) return true;
    return preset.tags.some((tag) => tag.toLowerCase().includes(q));
  });
}

export function getCategoryLabel(category: MotionPresetCategoryId): string {
  return (
    MOTION_PRESET_CATEGORIES.find((item) => item.id === category)?.label ??
    category
  );
}

export function duplicatePreset(
  source: MotionPreset,
  name?: string,
): MotionPreset {
  const stamp = Date.now().toString(36);
  return {
    ...source,
    id: `custom.${stamp}`,
    name: name ?? `${source.name} Copy`,
    builtin: false,
    tags: [...source.tags, "custom"],
    motion: createDefaultLayerMotion(source.motion),
  };
}

export function createCustomPresetFromMotion(
  name: string,
  motion: LayerMotionConfig,
  category: MotionPresetCategoryId = "basic",
): MotionPreset {
  const stamp = Date.now().toString(36);
  return {
    id: `custom.${stamp}`,
    name: name.trim() || "Custom Preset",
    category,
    kind: "layer",
    description: "User-saved custom preset",
    durationMs: Math.max(
      motion.entrance.durationMs,
      motion.exit.durationMs,
      300,
    ),
    tags: ["custom", category],
    icon: "custom",
    builtin: false,
    motion: createDefaultLayerMotion(motion),
  };
}

export function mergePresetCatalog(
  custom: MotionPreset[],
): MotionPreset[] {
  const customIds = new Set(custom.map((p) => p.id));
  return [
    ...BUILTIN_MOTION_PRESETS.filter((p) => !customIds.has(p.id)),
    ...custom,
  ];
}
