import type { AssetSourceProvider } from "@/features/asset-clip-editor/types/clip.types";

/**
 * Multi-source import provider contract for Asset Clip Editor.
 * Implementations register assets into Media Library without mutating originals.
 */
export type ClipImportContext = {
  organizationId: string;
  userId: string;
};

export type ClipImportRequest = {
  provider: AssetSourceProvider;
  /** Library asset id (media_library / supabase_storage). */
  assetId?: string;
  /** Remote URL (youtube / web). */
  url?: string;
  /** Display name override. */
  name?: string;
};

export type ClipImportProvider = {
  id: AssetSourceProvider;
  label: string;
  description: string;
  supports: Array<"assetId" | "url" | "upload">;
};

export const CLIP_IMPORT_PROVIDERS: ClipImportProvider[] = [
  {
    id: "local_upload",
    label: "Local upload",
    description: "Upload a video file into the Media Library, then trim.",
    supports: ["upload"],
  },
  {
    id: "supabase_storage",
    label: "Supabase Storage",
    description: "Pick an existing Storage-backed library asset.",
    supports: ["assetId"],
  },
  {
    id: "media_library",
    label: "Media Library",
    description: "Open any organization video asset.",
    supports: ["assetId"],
  },
  {
    id: "youtube",
    label: "YouTube URL",
    description: "Register a YouTube video as an external source asset.",
    supports: ["url"],
  },
  {
    id: "web_search",
    label: "Web search result",
    description: "Use a previously imported web / stock video asset.",
    supports: ["assetId", "url"],
  },
];

export function getClipImportProvider(
  id: AssetSourceProvider,
): ClipImportProvider | undefined {
  return CLIP_IMPORT_PROVIDERS.find((p) => p.id === id);
}
