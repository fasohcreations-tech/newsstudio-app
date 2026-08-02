import type { MotionSceneDocument } from "@/features/motion-scene-engine/types/motion-scene.types";

export function resolveVariableTokens(
  text: string,
  bindings: Record<string, string>,
): string {
  return text.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_, key: string) => {
    return bindings[key] ?? `{{${key}}}`;
  });
}

export function buildDefaultBindings(): Record<string, string> {
  return {
    headline: "വാർത്താ തലക്കെട്ട്",
    subtitle: "ഉപശീർഷകം",
    summary: "സംക്ഷിപ്ത വിവരണം",
    speaker: "സ്പീക്കർ",
    designation: "പദവി",
    organization: "GNN News",
    reporter: "റിപ്പോർട്ടർ",
    location: "തിരുവനന്തപുരം",
    date: new Date().toLocaleDateString("ml-IN"),
    time: new Date().toLocaleTimeString("ml-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    logo: "GNN",
    image: "",
    video: "",
    voice: "",
    music: "",
    theme: "channel",
    primary_color: "#1e40af",
    secondary_color: "#dc2626",
  };
}

export function applyBindingsToDocument(
  document: MotionSceneDocument,
  bindings: Record<string, string>,
): MotionSceneDocument {
  return {
    ...document,
    layers: document.layers.map((layer) => {
      const text =
        typeof layer.content.text === "string" ? layer.content.text : undefined;
      if (!text) return layer;
      return {
        ...layer,
        content: {
          ...layer.content,
          text: resolveVariableTokens(text, bindings),
        },
      };
    }),
  };
}

export function mergeStoryBindings(
  base: Record<string, string>,
  storyData: Record<string, string | null | undefined>,
): Record<string, string> {
  const merged = { ...base };
  for (const [key, value] of Object.entries(storyData)) {
    if (value != null && value !== "") merged[key] = value;
  }
  return merged;
}
