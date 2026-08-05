import type {
  TemplateAspectPreset,
  TemplateBindingKey,
  TemplateCanvas,
  TemplateCategory,
  TemplateDesignerPanel,
  TemplateTheme,
  TemplateTimelineDefaults,
} from "@/features/template-designer/types/template-designer.types";

export const TEMPLATE_DESIGNER_FEATURE = "040" as const;
export const TEMPLATE_DESIGNER_VERSION = "1.0.0" as const;

export const TEMPLATE_CATEGORIES: Array<{
  id: TemplateCategory;
  label: string;
}> = [
  { id: "gnn", label: "GNN" },
  { id: "breaking_news", label: "Breaking News" },
  { id: "election", label: "Election" },
  { id: "weather", label: "Weather" },
  { id: "financial", label: "Financial" },
  { id: "sports", label: "Sports" },
  { id: "live", label: "Live" },
  { id: "promo", label: "Promo" },
  { id: "documentary", label: "Documentary" },
  { id: "interview", label: "Interview" },
  { id: "social", label: "Social Media" },
  { id: "vertical_reels", label: "Vertical Reels" },
  { id: "custom", label: "Custom" },
];

export const TEMPLATE_DESIGNER_PANELS: Array<{
  id: TemplateDesignerPanel;
  label: string;
  hrefSuffix: string;
  description: string;
}> = [
  {
    id: "design",
    label: "Design",
    hrefSuffix: "design",
    description: "Main canvas — Scene Composer",
  },
  {
    id: "assets",
    label: "Assets",
    hrefSuffix: "assets",
    description: "Template asset library",
  },
  {
    id: "layers",
    label: "Layers",
    hrefSuffix: "layers",
    description: "Layer manager",
  },
  {
    id: "properties",
    label: "Properties",
    hrefSuffix: "properties",
    description: "Property inspector",
  },
  {
    id: "animations",
    label: "Animations",
    hrefSuffix: "animations",
    description: "Entrance / idle / exit",
  },
  {
    id: "behaviours",
    label: "Behaviours",
    hrefSuffix: "behaviours",
    description: "Behaviour Engine",
  },
  {
    id: "shapes",
    label: "Shapes",
    hrefSuffix: "shapes",
    description: "Shape Composer",
  },
  {
    id: "effects",
    label: "Effects",
    hrefSuffix: "effects",
    description: "Effects Studio",
  },
  {
    id: "bindings",
    label: "Bindings",
    hrefSuffix: "bindings",
    description: "Story data bindings",
  },
  {
    id: "preview",
    label: "Preview",
    hrefSuffix: "preview",
    description: "Live Story Preview runtime",
  },
];

export const DEFAULT_BINDING_KEYS: TemplateBindingKey[] = [
  "headline",
  "subheadline",
  "ticker",
  "video",
  "image",
  "logo",
  "reporter",
  "location",
  "date",
  "advertisement",
  "audio",
];

export const ASPECT_PRESETS: Record<
  TemplateAspectPreset,
  { width: number; height: number; label: string }
> = {
  "1920x1080": { width: 1920, height: 1080, label: "16:9 HD" },
  "1080x1920": { width: 1080, height: 1920, label: "9:16 Vertical" },
  "1080x1080": { width: 1080, height: 1080, label: "1:1 Square" },
  "3840x2160": { width: 3840, height: 2160, label: "4K UHD" },
};

export function createDefaultCanvas(
  aspect: TemplateAspectPreset = "1920x1080",
): TemplateCanvas {
  const preset = ASPECT_PRESETS[aspect];
  return {
    width: preset.width,
    height: preset.height,
    aspectPreset: aspect,
    background: "#071225",
    safeAreaInsetPct: 5,
    gridSize: 20,
    showGrid: true,
    showGuides: true,
    showSafeArea: true,
  };
}

export function createDefaultTheme(): TemplateTheme {
  return {
    primaryColor: "#1D4ED8",
    secondaryColor: "#0F172A",
    accentColor: "#F59E0B",
    backgroundColor: "#071225",
    textColor: "#FFFFFF",
    fontFamilies: ["Noto Sans Malayalam", "Manjari", "Segoe UI"],
  };
}

export function createDefaultTimelineDefaults(): TemplateTimelineDefaults {
  return {
    defaultDurationMs: 15_000,
    frameRate: 25,
    entranceMs: 600,
    exitMs: 500,
  };
}

export function templateHref(templateId: string, panel?: TemplateDesignerPanel) {
  if (!panel || panel === "design") {
    return panel === "design"
      ? `/templates/${templateId}/design`
      : `/templates/${templateId}`;
  }
  return `/templates/${templateId}/${panel}`;
}
