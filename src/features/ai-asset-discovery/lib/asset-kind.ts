import type { MediaFileType } from "@/shared/types/database.types";
import type { AssetDiscoveryKind } from "@/features/ai-asset-discovery/types/discovery.types";

export function mediaFileTypeToDiscoveryKind(
  fileType: MediaFileType | string,
  name = "",
): AssetDiscoveryKind {
  const lower = `${fileType} ${name}`.toLowerCase();
  if (fileType === "video") return "video";
  if (fileType === "pdf") return "pdf";
  if (fileType === "document" || fileType === "text") return "document";
  if (fileType === "image") {
    if (lower.includes("logo")) return "logo";
    if (lower.includes("icon")) return "icon";
    if (lower.includes("map")) return "map";
    if (lower.includes("chart") || lower.includes("graph")) return "chart";
    if (lower.includes("infographic")) return "infographic";
    if (lower.includes("illustrat")) return "illustration";
    if (lower.includes("screenshot") || lower.includes("screen-shot")) {
      return "screenshot";
    }
    return "image";
  }
  return "other";
}

export function discoveryKindToMediaFileType(
  kind: AssetDiscoveryKind,
): MediaFileType | "all" {
  switch (kind) {
    case "video":
      return "video";
    case "pdf":
      return "pdf";
    case "document":
      return "document";
    case "image":
    case "illustration":
    case "map":
    case "icon":
    case "logo":
    case "chart":
    case "infographic":
    case "screenshot":
      return "image";
    default:
      return "all";
  }
}

export function aspectRatioLabel(
  width?: number | null,
  height?: number | null,
): string {
  if (!width || !height || width <= 0 || height <= 0) return "";
  const g = gcd(width, height);
  return `${Math.round(width / g)}:${Math.round(height / g)}`;
}

export function orientationLabel(
  width?: number | null,
  height?: number | null,
): "landscape" | "portrait" | "square" | "" {
  if (!width || !height || width <= 0 || height <= 0) return "";
  if (Math.abs(width - height) < Math.max(width, height) * 0.05) return "square";
  return width > height ? "landscape" : "portrait";
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}
