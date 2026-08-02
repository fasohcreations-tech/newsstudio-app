import { BASIC_PRESETS } from "@/features/scene-composer/lib/motion-presets/presets/basic";
import { LOWER_THIRD_PRESETS, REPORTER_PRESETS } from "@/features/scene-composer/lib/motion-presets/presets/lower-third";
import { PROFESSIONAL_NEWS_PRESETS } from "@/features/scene-composer/lib/motion-presets/presets/professional-news";
import {
  BACKGROUND_PRESETS,
  TEXT_PRESETS,
  VIDEO_PRESETS,
} from "@/features/scene-composer/lib/motion-presets/presets/text-video-background";
import {
  BREAKING_NEWS_PRESETS,
  PROMOTIONAL_PRESETS,
  SOCIAL_MEDIA_PRESETS,
  SPORTS_PRESETS,
  WEATHER_PRESETS,
} from "@/features/scene-composer/lib/motion-presets/presets/thematic";
import { TICKER_PRESETS } from "@/features/scene-composer/lib/motion-presets/presets/ticker";
import {
  LOGO_PRESETS,
  TRANSITION_PRESETS,
} from "@/features/scene-composer/lib/motion-presets/presets/transitions-logo";
import type { MotionPreset } from "@/features/scene-composer/lib/motion-presets/types";

/** All builtin Motion Presets — category folders, not scene-hardcoded. */
export const BUILTIN_MOTION_PRESETS: MotionPreset[] = [
  ...BASIC_PRESETS,
  ...PROFESSIONAL_NEWS_PRESETS,
  ...LOWER_THIRD_PRESETS,
  ...REPORTER_PRESETS,
  ...TICKER_PRESETS,
  ...TRANSITION_PRESETS,
  ...LOGO_PRESETS,
  ...TEXT_PRESETS,
  ...VIDEO_PRESETS,
  ...BACKGROUND_PRESETS,
  ...BREAKING_NEWS_PRESETS,
  ...SPORTS_PRESETS,
  ...WEATHER_PRESETS,
  ...SOCIAL_MEDIA_PRESETS,
  ...PROMOTIONAL_PRESETS,
];
