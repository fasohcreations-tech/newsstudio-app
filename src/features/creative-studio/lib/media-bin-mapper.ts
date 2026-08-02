import type { MediaBinItem } from "@/features/creative-studio/actions/media-bin.actions";
import {
  mediaFileTypeToBinCategory,
  mediaFileTypeToClipKind,
} from "@/features/creative-studio/lib/studio-utils";
import type { MediaAssetWithMeta } from "@/features/media/types/media.types";

export function mapMediaAssetToBinItem(
  asset: MediaAssetWithMeta,
  storyId?: string | null,
): MediaBinItem {
  const isStoryAsset = Boolean(
    asset.story_links?.some(
      (link) =>
        !link.deleted_at && (!storyId || link.story_id === storyId),
    ),
  );

  return {
    id: asset.id,
    name: asset.name,
    category: isStoryAsset ? "story" : mediaFileTypeToBinCategory(asset.file_type),
    clipKind: mediaFileTypeToClipKind(asset.file_type),
    fileType: asset.file_type,
    durationMs:
      typeof asset.duration_seconds === "number"
        ? Math.round(asset.duration_seconds * 1000)
        : null,
    isStoryAsset,
  };
}
