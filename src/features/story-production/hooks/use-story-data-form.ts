"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ComposerScene } from "@/features/scene-composer/types/scene-composer.types";
import {
  bindingsToStoryData,
  mergeStoryDataBindings,
  syncSubHeadlineDerivedFields,
} from "@/features/story-production/lib/story-data-bindings";
import {
  applySystemClockBindings,
  buildLiveStoryBindings,
} from "@/features/story-production/lib/story-binding-engine";
import { STORY_ENGINE_VERSION } from "@/features/story-production/lib/story.model";
import {
  createDemoStoryData,
  createEmptyStoryData,
  isStoryUnpopulated,
} from "@/features/story-production/lib/story-data-defaults";
import { parseSubHeadlineSlots } from "@/features/story-production/lib/sub-headlines";
import { useSystemClock } from "@/features/story-production/hooks/use-system-clock";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";
import {
  isStoryInstanceScene,
  remapStoryDataToPanelScene,
} from "@/features/story-scene-builder/lib/build-panel-bindings";

type UseStoryDataFormOptions = {
  scene: ComposerScene;
  onBindingsChange: (bindings: Record<string, string>, data: StoryDataRecord) => void;
};

function readStoredStoryData(scene: ComposerScene): StoryDataRecord | null {
  const meta = scene.metadata as Record<string, unknown> | undefined;
  if (meta?.story_data && typeof meta.story_data === "object") {
    return meta.story_data as StoryDataRecord;
  }
  return null;
}

function readSegmentIndex(scene: ComposerScene): number {
  const meta = scene.metadata as Record<string, unknown> | undefined;
  const props = scene.properties as Record<string, unknown> | undefined;
  const fromMeta = meta?.segment_index;
  const fromProps = props?.segment_index;
  if (typeof fromMeta === "number" && Number.isFinite(fromMeta)) return fromMeta;
  if (typeof fromProps === "number" && Number.isFinite(fromProps)) return fromProps;
  return 0;
}

function initialStoryData(scene: ComposerScene): StoryDataRecord {
  const base = createEmptyStoryData();
  const meta = scene.metadata as Record<string, unknown> | undefined;
  const stored = readStoredStoryData(scene);

  if (isStoryInstanceScene(meta)) {
    const merged = bindingsToStoryData(scene.resolved_bindings, {
      ...base,
      ...(stored ?? {}),
    });
    return remapStoryDataToPanelScene({
      data: merged,
      bindings: {
        ...scene.resolved_bindings,
        panel_subheadline: String(meta?.panel_subheadline ?? ""),
        story_headline: String(
          meta?.story_headline ?? scene.resolved_bindings.story_headline ?? "",
        ),
      },
      segmentIndex: readSegmentIndex(scene),
      storyHeadline: String(
        meta?.story_headline ?? scene.resolved_bindings.story_headline ?? "",
      ),
    });
  }

  if (stored && !isStoryUnpopulated(stored)) {
    return bindingsToStoryData(scene.resolved_bindings, {
      ...base,
      ...stored,
    });
  }

  const hasBindings = Object.keys(scene.resolved_bindings).some(
    (key) =>
      scene.resolved_bindings[key]?.length > 0 &&
      (key === "headline" || key === "main_video"),
  );
  if (hasBindings) {
    return bindingsToStoryData(scene.resolved_bindings, base);
  }

  // SSR-safe empty first paint — demo seeds after mount.
  return base;
}

function storyDataEqual(a: StoryDataRecord, b: StoryDataRecord) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Story Form reactive state — Single Source of Truth for Module 3.7.
 */
export function useStoryDataForm({
  scene,
  onBindingsChange,
}: UseStoryDataFormOptions) {
  const seededSceneIdRef = useRef<string | null>(null);
  const onBindingsChangeRef = useRef(onBindingsChange);
  onBindingsChangeRef.current = onBindingsChange;
  const existingBindingsRef = useRef(scene.resolved_bindings);
  existingBindingsRef.current = scene.resolved_bindings;
  const lastEmittedRef = useRef<{
    bindings: string;
    data: string;
  } | null>(null);

  const [data, setData] = useState<StoryDataRecord>(() =>
    initialStoryData(scene),
  );
  const systemClock = useSystemClock();
  const skipBindingsEmitRef = useRef(true);
  const meta = scene.metadata as Record<string, unknown> | undefined;
  const isInstance = isStoryInstanceScene(meta);

  const bindings = useMemo(() => {
    const live = buildLiveStoryBindings(data, existingBindingsRef.current);
    if (!systemClock.mounted) return live;
    return applySystemClockBindings(live, systemClock.now ?? undefined);
  }, [data, systemClock.mounted, systemClock.now]);

  // Publish Story SSOT → scene bindings. Never call parent setState inside setData.
  useEffect(() => {
    if (skipBindingsEmitRef.current) {
      skipBindingsEmitRef.current = false;
      // Story instances: still emit remapped bindings once so canvas matches panel.
      if (!isInstance) return;
    }
    const merged = mergeStoryDataBindings(data, existingBindingsRef.current);
    // Keep story identity tokens without letting them override on-screen headline.
    if (isInstance) {
      const storyHeadline = String(
        meta?.story_headline ?? existingBindingsRef.current.story_headline ?? "",
      );
      if (storyHeadline) {
        merged.story_headline = storyHeadline;
        merged.title = storyHeadline;
      }
    }
    const bindingsKey = JSON.stringify(merged);
    const dataKey = JSON.stringify(data);
    if (
      lastEmittedRef.current &&
      lastEmittedRef.current.bindings === bindingsKey &&
      lastEmittedRef.current.data === dataKey
    ) {
      return;
    }
    lastEmittedRef.current = { bindings: bindingsKey, data: dataKey };
    onBindingsChangeRef.current(merged, data);
  }, [data, isInstance, meta?.story_headline]);

  // First-launch demo seed (including GNN-001 skeleton). Skip for story instances.
  useEffect(() => {
    if (seededSceneIdRef.current === scene.id) return;
    seededSceneIdRef.current = scene.id;

    const sceneMeta = scene.metadata as Record<string, unknown> | undefined;
    if (isStoryInstanceScene(sceneMeta)) {
      const next = initialStoryData(scene);
      setData((prev) => (storyDataEqual(prev, next) ? prev : next));
      return;
    }

    const stored = readStoredStoryData(scene);
    const engineVersion = sceneMeta?.story_engine_version;
    const current = stored
      ? { ...createEmptyStoryData(), ...stored }
      : createEmptyStoryData();

    const needsDemo =
      !stored ||
      (isStoryUnpopulated(current) && engineVersion !== STORY_ENGINE_VERSION);

    let next: StoryDataRecord;
    if (!needsDemo && stored) {
      next = bindingsToStoryData(scene.resolved_bindings, {
        ...createEmptyStoryData(),
        ...stored,
      });
    } else if (!needsDemo) {
      next = initialStoryData(scene);
    } else {
      next = createDemoStoryData(scene.id.slice(0, 8));
    }

    setData((prev) => (storyDataEqual(prev, next) ? prev : next));
    // Only re-seed when switching scenes — not when bindings/metadata update.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scene.id gates re-seed
  }, [scene.id]);

  const updateField = useCallback(
    <K extends keyof StoryDataRecord>(key: K, value: StoryDataRecord[K]) => {
      setData((prev) => {
        if (Object.is(prev[key], value)) return prev;
        const next = { ...prev, [key]: value };
        if (
          key === "sub_headline_1" ||
          key === "sub_headline_2" ||
          key === "sub_headline_3" ||
          key === "sub_headline_4" ||
          key === "summary"
        ) {
          if (key === "summary" && typeof value === "string") {
            const slots = parseSubHeadlineSlots(value);
            next.sub_headline_1 = slots[0] ?? "";
            next.sub_headline_2 = slots[1] ?? "";
            next.sub_headline_3 = slots[2] ?? "";
            next.sub_headline_4 = slots[3] ?? "";
          }
          return syncSubHeadlineDerivedFields(next);
        }
        return next;
      });
    },
    [],
  );

  const patchFields = useCallback((patch: Partial<StoryDataRecord>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      const touchesSubHeadlines =
        "sub_headline_1" in patch ||
        "sub_headline_2" in patch ||
        "sub_headline_3" in patch ||
        "sub_headline_4" in patch ||
        "summary" in patch;
      return touchesSubHeadlines ? syncSubHeadlineDerivedFields(next) : next;
    });
  }, []);

  const applyAsset = useCallback(
    (bindingKey: string, url: string) => {
      const fieldMap: Record<string, keyof StoryDataRecord> = {
        main_video: "main_video",
        video: "main_video",
        background_video: "background_video",
        main_image: "main_image",
        image: "main_image",
        gallery_images: "gallery_images",
        reporter_photo: "reporter_photo",
        logo: "logo",
        channel_logo: "logo",
        voice_over: "voice_over",
        voice: "voice_over",
        background_music: "background_music",
        music: "background_music",
        background_image: "background_image",
        optional_info_image: "optional_info_image",
        optional_info_image_3: "optional_info_image_3",
        optional_info: "optional_info_image",
        sub_headline_1_media: "sub_headline_1_media",
        sub_headline_2_media: "sub_headline_2_media",
        sub_headline_3_media: "sub_headline_3_media",
        sub_headline_4_media: "sub_headline_4_media",
      };
      const field = fieldMap[bindingKey];
      if (field) updateField(field, url);
    },
    [updateField],
  );

  const applyMedia = useCallback(
    (field: keyof StoryDataRecord, url: string) => {
      updateField(field, url);
    },
    [updateField],
  );

  return {
    data,
    bindings,
    revision: 0,
    isStoryInstance: isInstance,
    updateField,
    patchFields,
    applyAsset,
    applyMedia,
    systemClock,
  };
}
