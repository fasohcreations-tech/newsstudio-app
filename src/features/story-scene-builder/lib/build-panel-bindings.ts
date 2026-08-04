/**
 * Story Panel → Scene Instance binding contract.
 *
 * Story Headline stays story-level identity — it is NOT bound to the on-screen
 * headline region. Panel Subheadline populates {{headline}}.
 * Panel Media populates the Main Media Container ({{main_video}} / {{video}}).
 *
 * Logo / Reporter / Optional Information Area 2 inherit Master Template chrome
 * on build. Panel media never writes the generic `image` key (that stole the
 * logo placeholder). Editors may override chrome in Scene Composer; Sync from
 * Story Panels preserves those overrides.
 */

import { DEMO_ASSET_PATHS } from "@/features/story-production/constants/demo-assets.constants";
import { createEmptyStoryData } from "@/features/story-production/lib/story-data-defaults";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

export type PanelMediaKind = "" | "image" | "video" | "caption";

/** Master / instance chrome that is not driven by Story Panels. */
export type MasterChromeAssets = {
  logo: string;
  channel_logo: string;
  watermark: string;
  reporter_photo: string;
  reporter_image: string;
  optional_info_image: string;
  optional_info_image_3: string;
  optional_info_text: string;
  optional_info_text_3: string;
  optional_info_transition_style: string;
  optional_info_slide_interval_ms: string;
  optional_info_transition_ms: string;
  optional_info_slide_index: string;
};

/** GNN master preview defaults when the template has no saved story_data yet. */
export const GNN_MASTER_CHROME_DEFAULTS: MasterChromeAssets = {
  logo: DEMO_ASSET_PATHS.logo,
  channel_logo: DEMO_ASSET_PATHS.logo,
  watermark: DEMO_ASSET_PATHS.logo,
  reporter_photo: DEMO_ASSET_PATHS.reporter,
  reporter_image: DEMO_ASSET_PATHS.reporter,
  optional_info_image: "",
  optional_info_image_3: "",
  optional_info_text: "",
  optional_info_text_3: "",
  optional_info_transition_style: "fade",
  optional_info_slide_interval_ms: "3500",
  optional_info_transition_ms: "450",
  optional_info_slide_index: "0",
};

const CHROME_KEYS = [
  "logo",
  "channel_logo",
  "watermark",
  "reporter_photo",
  "reporter_image",
  "optional_info_image",
  "optional_info_image_3",
  "optional_info_text",
  "optional_info_text_3",
  "optional_info_transition_style",
  "optional_info_slide_interval_ms",
  "optional_info_transition_ms",
  "optional_info_slide_index",
] as const satisfies ReadonlyArray<keyof MasterChromeAssets>;

function pickTrimmed(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function readStoryDataField(
  storyData: Record<string, unknown> | null | undefined,
  key: string,
): string {
  if (!storyData) return "";
  const value = storyData[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Pull logo / reporter / Optional Info chrome from a Master Template.
 * Falls back to GNN demo assets so builds match what Composer shows for an
 * unsaved master (createDemoStoryData).
 */
export function extractMasterChromeAssets(master: {
  resolved_bindings?: Record<string, string> | null;
  metadata?: Record<string, unknown> | null;
}): MasterChromeAssets {
  const bindings = master.resolved_bindings ?? {};
  const storyData =
    master.metadata?.story_data &&
    typeof master.metadata.story_data === "object"
      ? (master.metadata.story_data as Record<string, unknown>)
      : null;

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = pickTrimmed(bindings[key], readStoryDataField(storyData, key));
      if (value) return value;
    }
    return "";
  };

  return {
    logo: pick("logo", "channel_logo") || GNN_MASTER_CHROME_DEFAULTS.logo,
    channel_logo:
      pick("channel_logo", "logo") || GNN_MASTER_CHROME_DEFAULTS.channel_logo,
    watermark:
      pick("watermark", "logo") || GNN_MASTER_CHROME_DEFAULTS.watermark,
    reporter_photo:
      pick("reporter_photo", "reporter_image") ||
      GNN_MASTER_CHROME_DEFAULTS.reporter_photo,
    reporter_image:
      pick("reporter_image", "reporter_photo") ||
      GNN_MASTER_CHROME_DEFAULTS.reporter_image,
    optional_info_image: pick("optional_info_image"),
    optional_info_image_3: pick("optional_info_image_3"),
    optional_info_text: pick("optional_info_text"),
    optional_info_text_3: pick("optional_info_text_3"),
    optional_info_transition_style:
      pick("optional_info_transition_style") ||
      GNN_MASTER_CHROME_DEFAULTS.optional_info_transition_style,
    optional_info_slide_interval_ms:
      pick("optional_info_slide_interval_ms") ||
      GNN_MASTER_CHROME_DEFAULTS.optional_info_slide_interval_ms,
    optional_info_transition_ms:
      pick("optional_info_transition_ms") ||
      GNN_MASTER_CHROME_DEFAULTS.optional_info_transition_ms,
    optional_info_slide_index:
      pick("optional_info_slide_index") ||
      GNN_MASTER_CHROME_DEFAULTS.optional_info_slide_index,
  };
}

/**
 * Prefer Composer overrides already on the instance; fill gaps from master.
 */
export function mergeChromeAssets(
  master: MasterChromeAssets,
  existingBindings?: Record<string, string> | null,
  existingStoryData?: Record<string, unknown> | null,
): MasterChromeAssets {
  const bindings = existingBindings ?? {};
  const storyData = existingStoryData ?? null;

  const pickExisting = (...keys: string[]) => {
    for (const key of keys) {
      const value = pickTrimmed(
        bindings[key],
        readStoryDataField(storyData, key),
      );
      if (value) return value;
    }
    return "";
  };

  return {
    logo: pickExisting("logo", "channel_logo") || master.logo,
    channel_logo:
      pickExisting("channel_logo", "logo") || master.channel_logo,
    watermark: pickExisting("watermark", "logo") || master.watermark,
    reporter_photo:
      pickExisting("reporter_photo", "reporter_image") || master.reporter_photo,
    reporter_image:
      pickExisting("reporter_image", "reporter_photo") || master.reporter_image,
    optional_info_image:
      pickExisting("optional_info_image") || master.optional_info_image,
    optional_info_image_3:
      pickExisting("optional_info_image_3") || master.optional_info_image_3,
    optional_info_text:
      pickExisting("optional_info_text") || master.optional_info_text,
    optional_info_text_3:
      pickExisting("optional_info_text_3") || master.optional_info_text_3,
    optional_info_transition_style:
      pickExisting("optional_info_transition_style") ||
      master.optional_info_transition_style,
    optional_info_slide_interval_ms:
      pickExisting("optional_info_slide_interval_ms") ||
      master.optional_info_slide_interval_ms,
    optional_info_transition_ms:
      pickExisting("optional_info_transition_ms") ||
      master.optional_info_transition_ms,
    optional_info_slide_index:
      pickExisting("optional_info_slide_index") ||
      master.optional_info_slide_index,
  };
}

export function chromeToBindingEntries(
  chrome: MasterChromeAssets,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of CHROME_KEYS) {
    const value = chrome[key]?.trim() ?? "";
    if (value) out[key] = value;
  }
  return out;
}

export function applyChromeToStoryData(
  data: StoryDataRecord,
  chrome: MasterChromeAssets,
): StoryDataRecord {
  return {
    ...data,
    logo: chrome.logo,
    watermark: chrome.watermark,
    reporter_photo: chrome.reporter_photo,
    optional_info_image: chrome.optional_info_image,
    optional_info_image_3: chrome.optional_info_image_3,
    optional_info_text: chrome.optional_info_text,
    optional_info_text_3: chrome.optional_info_text_3,
    optional_info_transition_style: chrome.optional_info_transition_style,
    optional_info_slide_interval_ms: chrome.optional_info_slide_interval_ms,
    optional_info_transition_ms: chrome.optional_info_transition_ms,
    optional_info_slide_index: chrome.optional_info_slide_index,
  };
}

export type BuildPanelSceneBindingsInput = {
  /** Story-level identifier (news story title). Not used as on-screen headline. */
  storyHeadline: string;
  /** Panel subheadline → on-screen headline placeholder. */
  panelSubheadline: string;
  /** Narration / body supporting text for this panel. */
  bodyText: string;
  mediaKind: PanelMediaKind;
  mediaRef: string;
  mediaCaption: string;
  /** Full-story or panel voice URL (segment timing stored separately). */
  voiceUrl: string | null;
  /**
   * @deprecated Prefer `chrome` from the Master Template.
   * Kept as a last-resort logo fallback only.
   */
  logoUrl?: string;
  /** Master / preserved instance chrome (logo, reporter, optional info). */
  chrome?: MasterChromeAssets;
  /** Story / schedule advertisement assignment (optional). */
  advertisementRef: string;
  panelIndex?: number;
};

function resolveChrome(input: BuildPanelSceneBindingsInput): MasterChromeAssets {
  if (input.chrome) return input.chrome;
  const logo = (input.logoUrl ?? "").trim();
  if (!logo) return { ...GNN_MASTER_CHROME_DEFAULTS };
  return {
    ...GNN_MASTER_CHROME_DEFAULTS,
    logo,
    channel_logo: logo,
    watermark: logo,
  };
}

/**
 * Placeholder map written onto the editable Scene Instance clone.
 * Master Template document is never modified — only resolved_bindings.
 */
export function buildPanelSceneBindings(
  input: BuildPanelSceneBindingsInput,
): Record<string, string> {
  const panelHeadline = input.panelSubheadline.trim();
  const imageRef = input.mediaKind === "image" ? input.mediaRef.trim() : "";
  // Prefer clip:// when Story Panel attached an Asset Clip (Module 2.5).
  const videoRef = input.mediaKind === "video" ? input.mediaRef.trim() : "";
  const caption = input.mediaCaption.trim();
  const mainMedia = videoRef || imageRef;
  const chrome = resolveChrome(input);

  return {
    ...chromeToBindingEntries(chrome),

    // On-screen Headline region ← Story Panel Subheadline
    headline: panelHeadline,
    // Secondary line — caption when present; do not reuse Story Headline
    subheadline: caption,
    subtitle: caption,

    // Story identity (not the on-screen headline region)
    story_headline: input.storyHeadline.trim(),
    title: input.storyHeadline.trim(),

    summary: input.bodyText.trim(),
    body: input.bodyText.trim(),

    // Main Media Container ← Story Panel Media
    // Do NOT set generic `image` — reporter-logo falls back to it and would
    // steal panel main media into the logo placeholder.
    main_video: mainMedia,
    video: videoRef || mainMedia,
    main_image: imageRef,

    // Voice Track ← panel voice (timing windows live on voice_segments)
    voice: input.voiceUrl?.trim() ?? "",
    voice_over: input.voiceUrl?.trim() ?? "",

    // Advertisement ← story / schedule assignment
    advertisement: input.advertisementRef.trim(),
    ad: input.advertisementRef.trim(),

    // Re-assert chrome so panel fields never overwrite template assets
    ...chromeToBindingEntries(chrome),
  };
}

/**
 * Story Data SSOT for one Scene Instance — drives Composer form + live preview.
 * Headline field = panel subheadline (on-screen). Story title is not stored in headline.
 */
export function panelToStoryData(
  input: BuildPanelSceneBindingsInput,
): StoryDataRecord {
  const imageRef = input.mediaKind === "image" ? input.mediaRef.trim() : "";
  // Prefer clip:// when Story Panel attached an Asset Clip (Module 2.5).
  const videoRef = input.mediaKind === "video" ? input.mediaRef.trim() : "";
  const mainMedia = videoRef || imageRef;
  const panelHeadline = input.panelSubheadline.trim();
  const caption = input.mediaCaption.trim();
  const chrome = resolveChrome(input);

  return applyChromeToStoryData(
    {
      ...createEmptyStoryData(),
      headline: panelHeadline,
      subheadline: caption,
      // Clear multi-panel slots — this instance owns one on-screen headline
      sub_headline_1: "",
      sub_headline_2: "",
      sub_headline_3: "",
      sub_headline_4: "",
      sub_headline_1_media_kind: "",
      sub_headline_2_media_kind: "",
      sub_headline_3_media_kind: "",
      sub_headline_4_media_kind: "",
      sub_headline_1_media: "",
      sub_headline_2_media: "",
      sub_headline_3_media: "",
      sub_headline_4_media: "",
      sub_headline_1_caption: "",
      sub_headline_2_caption: "",
      sub_headline_3_caption: "",
      sub_headline_4_caption: "",
      summary: input.bodyText.trim(),
      main_video: mainMedia,
      main_image: imageRef,
      video_media_mode: videoRef ? "video" : imageRef ? "image" : "video",
      voice_over: input.voiceUrl?.trim() ?? "",
      story_id: "",
    },
    chrome,
  );
}

/** Scene instance columns derived from a panel (editable overrides start here). */
export function panelToInstanceFields(input: {
  panelSubheadline: string;
  mediaCaption: string;
  bodyText: string;
  mediaKind: PanelMediaKind;
  mediaRef: string;
  logoUrl?: string;
  chrome?: MasterChromeAssets;
  advertisementRef: string;
  storyHeadline: string;
}) {
  const imageRef = input.mediaKind === "image" ? input.mediaRef : "";
  const videoRef = input.mediaKind === "video" ? input.mediaRef : "";
  const chrome = input.chrome
    ? input.chrome
    : {
        ...GNN_MASTER_CHROME_DEFAULTS,
        logo: (input.logoUrl ?? "").trim() || GNN_MASTER_CHROME_DEFAULTS.logo,
        channel_logo:
          (input.logoUrl ?? "").trim() || GNN_MASTER_CHROME_DEFAULTS.channel_logo,
      };
  return {
    /** On-screen headline value (from panel subheadline). */
    headline: input.panelSubheadline.trim(),
    /** Secondary / caption line — editable independently. */
    subheadline: input.mediaCaption.trim(),
    body_text: input.bodyText.trim(),
    video_asset_ref: videoRef,
    image_asset_ref: imageRef,
    logo_ref: chrome.logo.trim(),
    advertisement_ref: input.advertisementRef.trim(),
    metadataExtras: {
      story_headline: input.storyHeadline.trim(),
      panel_subheadline: input.panelSubheadline.trim(),
      media_kind: input.mediaKind,
      media_caption: input.mediaCaption.trim(),
      binding_model: "story-panel-v1",
    },
  };
}

export function isStoryInstanceScene(meta: Record<string, unknown> | undefined): boolean {
  if (!meta) return false;
  if (meta.is_story_instance === true) return true;
  if (meta.binding_model === "story-panel-v1") return true;
  // Legacy instances stamped with story_id during clone
  return typeof meta.story_id === "string" && meta.story_id.length > 0;
}

/**
 * Remap legacy / polluted story-level Story Data onto panel bindings for this scene.
 * Scene N uses Sub Headline N as on-screen headline + that slot's media as main media.
 */
export function remapStoryDataToPanelScene(input: {
  data: StoryDataRecord;
  bindings: Record<string, string>;
  segmentIndex: number;
  storyHeadline?: string;
}): StoryDataRecord {
  const { data, bindings, segmentIndex } = input;
  const slot = Math.min(Math.max(segmentIndex, 0), 3) + 1;
  const slotTextKey = `sub_headline_${slot}` as keyof StoryDataRecord;
  const slotMediaKey = `sub_headline_${slot}_media` as keyof StoryDataRecord;
  const slotKindKey = `sub_headline_${slot}_media_kind` as keyof StoryDataRecord;
  const slotCaptionKey = `sub_headline_${slot}_caption` as keyof StoryDataRecord;

  const storyHeadline = (
    input.storyHeadline ||
    bindings.story_headline ||
    bindings.title ||
    ""
  ).trim();

  const panelFromSlot = String(data[slotTextKey] ?? "").trim();
  const panelFromBinding = (bindings.headline || "").trim();
  const panelFromMeta = (bindings.panel_subheadline || "").trim();

  // Prefer explicit panel binding; else Sub Headline slot for this scene index;
  // never keep Story Headline in the on-screen field when a panel line exists.
  let onScreenHeadline = panelFromBinding;
  if (
    !onScreenHeadline ||
    (storyHeadline && onScreenHeadline === storyHeadline && panelFromSlot)
  ) {
    onScreenHeadline = panelFromSlot || panelFromMeta || onScreenHeadline;
  }
  if (!onScreenHeadline) {
    onScreenHeadline = panelFromSlot || panelFromMeta;
  }

  const slotMedia = String(data[slotMediaKey] ?? "").trim();
  const slotKind = String(data[slotKindKey] ?? "").trim() as PanelMediaKind | string;
  const caption = String(data[slotCaptionKey] ?? data.subheadline ?? "").trim();

  const bindingMedia = (bindings.main_video || bindings.video || bindings.main_image || "").trim();
  const mainMedia = bindingMedia || slotMedia;

  const next: StoryDataRecord = {
    ...createEmptyStoryData(),
    ...data,
    headline: onScreenHeadline || data.headline,
    subheadline: caption,
    // Instance form: don't keep multi-panel slots competing with on-screen headline
    sub_headline_1: "",
    sub_headline_2: "",
    sub_headline_3: "",
    sub_headline_4: "",
    sub_headline_1_media: "",
    sub_headline_2_media: "",
    sub_headline_3_media: "",
    sub_headline_4_media: "",
    sub_headline_1_media_kind: "",
    sub_headline_2_media_kind: "",
    sub_headline_3_media_kind: "",
    sub_headline_4_media_kind: "",
    sub_headline_1_caption: "",
    sub_headline_2_caption: "",
    sub_headline_3_caption: "",
    sub_headline_4_caption: "",
    main_video: mainMedia || data.main_video,
    main_image:
      slotKind === "image" || (!slotKind && Boolean(slotMedia && !bindings.video))
        ? mainMedia || data.main_image
        : data.main_image || (bindings.main_image ?? ""),
    video_media_mode:
      slotKind === "image" || (mainMedia && !bindings.video && slotKind !== "video")
        ? "image"
        : data.video_media_mode || "video",
    summary: data.summary || bindings.summary || "",
    logo: bindings.logo || data.logo,
    watermark: bindings.watermark || data.watermark,
    reporter_photo:
      bindings.reporter_photo || bindings.reporter_image || data.reporter_photo,
    optional_info_image:
      bindings.optional_info_image || data.optional_info_image,
    optional_info_image_3:
      bindings.optional_info_image_3 || data.optional_info_image_3,
    optional_info_text: bindings.optional_info_text || data.optional_info_text,
    optional_info_text_3:
      bindings.optional_info_text_3 || data.optional_info_text_3,
    optional_info_transition_style:
      bindings.optional_info_transition_style ||
      data.optional_info_transition_style,
    optional_info_slide_interval_ms:
      bindings.optional_info_slide_interval_ms ||
      data.optional_info_slide_interval_ms,
    optional_info_transition_ms:
      bindings.optional_info_transition_ms || data.optional_info_transition_ms,
    optional_info_slide_index:
      bindings.optional_info_slide_index || data.optional_info_slide_index,
    voice_over: bindings.voice || bindings.voice_over || data.voice_over,
  };

  return next;
}
