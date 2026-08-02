"use client";

import { useEffect, useMemo, useState } from "react";

import { getPreviewMediaUrlsAction } from "@/features/creative-studio/actions/preview.actions";
import type { PreviewMediaSource } from "@/features/creative-studio/actions/preview.actions";
import type { CreativeProjectWithTimeline } from "@/features/creative-studio/types/creative-studio.types";

export function usePreviewMediaSources(project: CreativeProjectWithTimeline) {
  const [sources, setSources] = useState<Record<string, PreviewMediaSource>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  const assetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.media_asset_id) ids.add(clip.media_asset_id);
      }
    }
    return [...ids];
  }, [project.tracks]);

  const assetKey = assetIds.join(",");

  useEffect(() => {
    if (assetIds.length === 0) {
      setSources({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    void getPreviewMediaUrlsAction({ assetIds }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success) return;

      const next: Record<string, PreviewMediaSource> = {};
      for (const source of result.data) {
        next[source.assetId] = source;
      }
      setSources(next);
    });

    return () => {
      cancelled = true;
    };
  }, [assetKey]);

  return { sources, loading };
}
