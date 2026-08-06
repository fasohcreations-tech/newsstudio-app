/**
 * Module 3.5 – Story Data Form types.
 * Flat story record designed for AI population later.
 */

export type StoryDataGeneral = {
  headline: string;
  subheadline: string;
  /** Joined lower-info lines (derived from sub_headline_1..4). */
  summary: string;
  /** Short lower-info slot 1 (primary rotating line). */
  sub_headline_1: string;
  sub_headline_2: string;
  sub_headline_3: string;
  sub_headline_4: string;
  /** Per-slot media kind: image | video | caption | "". */
  sub_headline_1_media_kind: string;
  sub_headline_2_media_kind: string;
  sub_headline_3_media_kind: string;
  sub_headline_4_media_kind: string;
  /** Per-slot media ref: library://uuid or URL. */
  sub_headline_1_media: string;
  sub_headline_2_media: string;
  sub_headline_3_media: string;
  sub_headline_4_media: string;
  /** Caption body / overlay text per slot. */
  sub_headline_1_caption: string;
  sub_headline_2_caption: string;
  sub_headline_3_caption: string;
  sub_headline_4_caption: string;
  category: string;
  tags: string;
  priority: string;
  breaking_news: boolean;
  live: boolean;
  reporter_name: string;
  reporter_photo: string;
  designation: string;
  location: string;
  organization: string;
  place: string;
  date: string;
  time: string;
  story_id: string;
};

export type StoryDataMedia = {
  main_video: string;
  secondary_video: string;
  main_image: string;
  gallery_images: string;
  background_video: string;
  background_image: string;
  /** Background media container — cut | fade | slide. */
  background_transition_style: string;
  /** Background slide interval in milliseconds. */
  background_slide_interval_ms: string;
  /** Background transition duration in milliseconds. */
  background_transition_ms: string;
  /** Background current slide index (manual control). */
  background_slide_index: string;
  /** Background media fit: cover | contain | fill. */
  background_fit: string;
  /** Background slideshow autoplay: true | false. */
  background_autoplay: string;
  logo: string;
  watermark: string;
  voice_over: string;
  background_music: string;
  sound_fx: string;
  /** Optional Information Area image (left rail slot). */
  optional_info_image: string;
  /** Optional Information Area 3 image (separate asset from area 1). */
  optional_info_image_3: string;
  /** Optional Information Area transition style: cut | fade | slide. */
  optional_info_transition_style: string;
  /** Optional Information Area slide interval in milliseconds. */
  optional_info_slide_interval_ms: string;
  /** Optional Information Area transition duration in milliseconds. */
  optional_info_transition_ms: string;
  /** Optional Information Area current slide index (manual control). */
  optional_info_slide_index: string;
};

export type StoryDataText = {
  headline: string;
  subheadline: string;
  summary: string;
  sub_headline_1: string;
  sub_headline_2: string;
  sub_headline_3: string;
  sub_headline_4: string;
  sub_headline_1_media_kind: string;
  sub_headline_2_media_kind: string;
  sub_headline_3_media_kind: string;
  sub_headline_4_media_kind: string;
  sub_headline_1_media: string;
  sub_headline_2_media: string;
  sub_headline_3_media: string;
  sub_headline_4_media: string;
  sub_headline_1_caption: string;
  sub_headline_2_caption: string;
  sub_headline_3_caption: string;
  sub_headline_4_caption: string;
  quote: string;
  bible_verse: string;
  verse_reference: string;
  ticker: string;
  call_to_action: string;
  website: string;
  social_links: string;
  /** Optional Information Area text (shown when no image is set). */
  optional_info_text: string;
  /** Optional Information Area 3 text. */
  optional_info_text_3: string;
};

export type StoryDataTheme = {
  theme: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  world_map_opacity: string;
  glow_intensity: string;
  grid_visibility: boolean;
  frame_border_color: string;
  frame_border_width: string;
  frame_border_radius: string;
  frame_glass_opacity: string;
  frame_shadow_strength: string;
  frame_accent_color: string;
  frame_accent_width: string;
  video_border: string;
  video_border_width: string;
  video_corner_style: string;
  video_corner_radius: string;
  video_mask: boolean;
  video_padding: string;
  video_shadow: string;
  video_glass_opacity: string;
  video_frame_opacity: string;
  video_accent_color: string;
  video_accent_thickness: string;
  video_fit: string;
  video_scale: string;
  video_crop: string;
  video_safe_area: string;
  video_position_x: string;
  video_position_y: string;
  video_rotation: string;
  video_opacity: string;
  video_media_mode: string;
  video_container_state: string;
  video_top_bar_visible: boolean;
  video_top_bar_height: string;
  video_top_bar_color: string;
  video_top_bar_opacity: string;
  video_bottom_bar_visible: boolean;
  video_bottom_bar_height: string;
  video_bottom_bar_color: string;
  video_bottom_bar_opacity: string;
  scene_title: string;
  video_caption: string;
  camera: string;
  credit: string;
  video_animation_preset: string;
  animation_preset: string;
  font_family: string;
};

export type StoryDataRecord = StoryDataGeneral &
  StoryDataMedia &
  StoryDataText &
  StoryDataTheme;

export type StoryFormSectionId =
  | "general"
  | "media"
  | "text"
  | "theme";

export type StoryAssetCategory =
  | "videos"
  | "images"
  | "voice_over"
  | "music"
  | "logos"
  | "documents";

export type StoryAssetItem = {
  id: string;
  category: StoryAssetCategory;
  label: string;
  url: string;
  bindingKey: string;
  mimeType?: string;
};

export type StoryPreviewAspect = "1920x1080" | "1080x1920" | "1080x1080" | "3840x2160";

export type StoryDataFormState = {
  data: StoryDataRecord;
  revision: number;
  seeded: boolean;
};
