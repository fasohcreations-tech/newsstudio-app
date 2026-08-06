import { DEMO_ASSET_PATHS } from "@/features/story-production/constants/demo-assets.constants";
import { DEFAULT_MALAYALAM_FONT_VALUE } from "@/features/story-production/constants/story-font-options";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

/** Fixed SSR-safe fallbacks — live preview overlays system clock after mount. */
export const DEMO_STORY_DATE = "28 Jul 2026";
export const DEMO_STORY_TIME = "08:00";

/**
 * Module 3.7 demo Story — first-launch sample that looks like a real news package.
 */
export function createDemoStoryData(storyId = "GNN-DEMO-001"): StoryDataRecord {
  return {
    headline: "ദൈവം മൗനമായിരിക്കുന്നതുപോലെ തോന്നിയിട്ടുണ്ടോ?",
    subheadline: "ഒരു പുതിയ കാഴ്ചപ്പാട്",
    sub_headline_1: "ആയിരം പേർ പങ്കെടുത്തു",
    sub_headline_2: "പോസിറ്റീവ് വാർത്തകൾ ശേഖരിക്കുന്നു",
    sub_headline_3: "കേരളത്തിലെ സമൂഹ സാക്ഷാത്കാരം",
    sub_headline_4: "Good News Flash പദ്ധതി",
    sub_headline_1_media_kind: "image",
    sub_headline_2_media_kind: "image",
    sub_headline_3_media_kind: "caption",
    sub_headline_4_media_kind: "video",
    sub_headline_1_media: DEMO_ASSET_PATHS.image1,
    sub_headline_2_media: DEMO_ASSET_PATHS.image2,
    sub_headline_3_media: "",
    sub_headline_4_media: DEMO_ASSET_PATHS.mainVideo,
    sub_headline_1_caption: "",
    sub_headline_2_caption: "",
    sub_headline_3_caption: "സമൂഹ സാക്ഷാത്കാര പദ്ധതി",
    sub_headline_4_caption: "",
    summary:
      "ആയിരം പേർ പങ്കെടുത്തു\nപോസിറ്റീവ് വാർത്തകൾ ശേഖരിക്കുന്നു\nകേരളത്തിലെ സമൂഹ സാക്ഷാത്കാരം\nGood News Flash പദ്ധതി",
    category: "Christian News",
    tags: "good news, faith, kerala",
    priority: "normal",
    breaking_news: true,
    live: false,
    reporter_name: "Good News Flash",
    reporter_photo: DEMO_ASSET_PATHS.reporter,
    designation: "News Desk",
    location: "Kottayam",
    organization: "GNN News",
    place: "Thiruvananthapuram",
    date: DEMO_STORY_DATE,
    time: DEMO_STORY_TIME,
    story_id: storyId,
    main_video: DEMO_ASSET_PATHS.mainVideo,
    secondary_video: DEMO_ASSET_PATHS.backgroundVideo,
    main_image: DEMO_ASSET_PATHS.image1,
    gallery_images: [
      DEMO_ASSET_PATHS.image1,
      DEMO_ASSET_PATHS.image2,
      DEMO_ASSET_PATHS.image3,
    ].join(","),
    background_video: "",
    background_image: "",
    background_transition_style: "fade",
    background_slide_interval_ms: "5000",
    background_transition_ms: "600",
    background_slide_index: "0",
    background_fit: "contain",
    background_autoplay: "true",
    logo: DEMO_ASSET_PATHS.logo,
    watermark: DEMO_ASSET_PATHS.logo,
    voice_over: DEMO_ASSET_PATHS.voiceOver,
    background_music: DEMO_ASSET_PATHS.backgroundMusic,
    sound_fx: "",
    optional_info_image: "",
    optional_info_image_3: "",
    optional_info_transition_style: "fade",
    optional_info_slide_interval_ms: "3500",
    optional_info_transition_ms: "450",
    optional_info_slide_index: "0",
    quote: "ദൈവത്തിന്റെ സ്നേഹം നമ്മോട് കൂടെയാണ്.",
    optional_info_text: "",
    optional_info_text_3: "",
    bible_verse: "ദൈവത്തിന്റെ സ്നേഹം നമ്മോട് കൂടെയാണ്.",
    verse_reference: "റോമർ 8:28",
    ticker: "Breaking | Good News Flash | Kerala | World",
    call_to_action: "കൂടുതൽ വാർത്തകൾക്ക് gnn.news",
    website: "https://gnn.news",
    social_links: "@gnnnews",
    theme: "gnn-broadcast-v1",
    primary_color: "#071225",
    secondary_color: "#0B1F3A",
    accent_color: "#1D4ED8",
    world_map_opacity: "0.08",
    glow_intensity: "0.42",
    grid_visibility: true,
    frame_border_color: "#FFFFFF",
    frame_border_width: "2",
    frame_border_radius: "12",
    frame_glass_opacity: "0.10",
    frame_shadow_strength: "0.28",
    frame_accent_color: "#1D4ED8",
    frame_accent_width: "4",
    video_border: "#2A3344",
    video_border_width: "1.5",
    video_corner_style: "bracket",
    video_corner_radius: "10",
    video_mask: true,
    video_padding: "8",
    video_shadow: "0.35",
    video_glass_opacity: "0.03",
    video_frame_opacity: "1",
    video_accent_color: "#1D4ED8",
    video_accent_thickness: "2",
    video_fit: "fill",
    video_scale: "1",
    video_crop: "0",
    video_safe_area: "10",
    video_position_x: "0",
    video_position_y: "0",
    video_rotation: "0",
    video_opacity: "1",
    video_media_mode: "video",
    video_container_state: "normal",
    video_top_bar_visible: false,
    video_top_bar_height: "32",
    video_top_bar_color: "#071225",
    video_top_bar_opacity: "0.72",
    video_bottom_bar_visible: false,
    video_bottom_bar_height: "32",
    video_bottom_bar_color: "#071225",
    video_bottom_bar_opacity: "0.72",
    scene_title: "ദൈവം മൗനമായിരിക്കുന്നതുപോലെ തോന്നിയിട്ടുണ്ടോ?",
    video_caption: "",
    camera: "",
    credit: "GNN News",
    video_animation_preset: "none",
    animation_preset: "none",
    font_family: DEFAULT_MALAYALAM_FONT_VALUE,
  };
}

export function createEmptyStoryData(): StoryDataRecord {
  const empty = createDemoStoryData();
  for (const key of Object.keys(empty) as Array<keyof StoryDataRecord>) {
    const value = empty[key];
    if (typeof value === "boolean") {
      (empty as Record<string, unknown>)[key] = false;
    } else {
      (empty as Record<string, unknown>)[key] = "";
    }
  }
  empty.date = DEMO_STORY_DATE;
  empty.time = DEMO_STORY_TIME;
  empty.primary_color = "#071225";
  empty.secondary_color = "#0B1F3A";
  empty.accent_color = "#1D4ED8";
  empty.world_map_opacity = "0.08";
  empty.glow_intensity = "0.42";
  empty.grid_visibility = true;
  empty.frame_border_color = "#FFFFFF";
  empty.frame_border_width = "2";
  empty.frame_border_radius = "12";
  empty.frame_glass_opacity = "0.10";
  empty.frame_shadow_strength = "0.28";
  empty.frame_accent_color = "#1D4ED8";
  empty.frame_accent_width = "4";
  empty.video_border = "#2A3344";
  empty.video_border_width = "1.5";
  empty.video_corner_style = "bracket";
  empty.video_corner_radius = "10";
  empty.video_mask = true;
  empty.video_padding = "8";
  empty.video_shadow = "0.35";
  empty.video_glass_opacity = "0.03";
  empty.video_frame_opacity = "1";
  empty.video_accent_color = "#1D4ED8";
  empty.video_accent_thickness = "2";
  empty.video_fit = "fill";
  empty.video_scale = "1";
  empty.video_crop = "0";
  empty.video_safe_area = "10";
  empty.video_position_x = "0";
  empty.video_position_y = "0";
  empty.video_rotation = "0";
  empty.video_opacity = "1";
  empty.video_media_mode = "video";
  empty.video_container_state = "normal";
  empty.video_top_bar_visible = false;
  empty.video_top_bar_height = "32";
  empty.video_top_bar_color = "#071225";
  empty.video_top_bar_opacity = "0.72";
  empty.video_bottom_bar_visible = false;
  empty.video_bottom_bar_height = "32";
  empty.video_bottom_bar_color = "#071225";
  empty.video_bottom_bar_opacity = "0.72";
  empty.video_animation_preset = "none";
  empty.animation_preset = "none";
  empty.optional_info_slide_interval_ms = "3500";
  empty.optional_info_transition_ms = "450";
  empty.optional_info_transition_style = "fade";
  empty.optional_info_slide_index = "0";
  empty.background_transition_style = "fade";
  empty.background_slide_interval_ms = "5000";
  empty.background_transition_ms = "600";
  empty.background_slide_index = "0";
  empty.background_fit = "contain";
  empty.background_autoplay = "true";
  empty.font_family = DEFAULT_MALAYALAM_FONT_VALUE;
  return empty;
}

/** True when Story has no meaningful editorial/media content yet. */
export function isStoryUnpopulated(data: StoryDataRecord): boolean {
  return !String(data.headline ?? "").trim() && !String(data.main_video ?? "").trim();
}
