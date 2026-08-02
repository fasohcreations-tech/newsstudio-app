export type StoryMalayalamFontOption = {
  value: string;
  label: string;
  family: string;
  weight: number;
};

export const DEFAULT_MALAYALAM_FONT_VALUE = "noto-sans-malayalam-bold";

/** Malayalam fonts available in the composer preview (loaded via next/font). */
export const STORY_MALAYALAM_FONT_OPTIONS: StoryMalayalamFontOption[] = [
  {
    value: "noto-sans-malayalam",
    label: "Noto Sans Malayalam",
    family: "Noto Sans Malayalam",
    weight: 400,
  },
  {
    value: "noto-sans-malayalam-bold",
    label: "Noto Sans Malayalam Bold",
    family: "Noto Sans Malayalam",
    weight: 700,
  },
  {
    value: "noto-serif-malayalam",
    label: "Noto Serif Malayalam",
    family: "Noto Serif Malayalam",
    weight: 400,
  },
  {
    value: "noto-serif-malayalam-bold",
    label: "Noto Serif Malayalam Bold",
    family: "Noto Serif Malayalam",
    weight: 700,
  },
  {
    value: "manjari",
    label: "Manjari",
    family: "Manjari",
    weight: 400,
  },
  {
    value: "manjari-bold",
    label: "Manjari Bold",
    family: "Manjari",
    weight: 700,
  },
  {
    value: "gayathri",
    label: "Gayathri",
    family: "Gayathri",
    weight: 400,
  },
  {
    value: "gayathri-bold",
    label: "Gayathri Bold",
    family: "Gayathri",
    weight: 700,
  },
];

export function resolveStoryMalayalamFont(bindings: Record<string, string>) {
  const raw = bindings.font_family?.trim() || DEFAULT_MALAYALAM_FONT_VALUE;
  const byValue = STORY_MALAYALAM_FONT_OPTIONS.find((option) => option.value === raw);
  if (byValue) return byValue;

  const byFamily = STORY_MALAYALAM_FONT_OPTIONS.find((option) => option.family === raw);
  if (byFamily) return byFamily;

  return (
    STORY_MALAYALAM_FONT_OPTIONS.find(
      (option) => option.value === DEFAULT_MALAYALAM_FONT_VALUE,
    ) ?? STORY_MALAYALAM_FONT_OPTIONS[0]!
  );
}

export function storyMalayalamFontFamilyCss(family: string): string {
  const cssVarByFamily: Record<string, string> = {
    "Noto Sans Malayalam": "var(--font-noto-sans-malayalam)",
    "Noto Serif Malayalam": "var(--font-noto-serif-malayalam)",
    Manjari: "var(--font-manjari)",
    Gayathri: "var(--font-gayathri)",
  };

  const cssVar = cssVarByFamily[family];
  if (cssVar) {
    return `${cssVar}, "${family}", sans-serif`;
  }
  return `"${family}", sans-serif`;
}
