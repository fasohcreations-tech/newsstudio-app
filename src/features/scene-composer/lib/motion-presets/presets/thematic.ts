import { definePreset } from "@/features/scene-composer/lib/motion-presets/define-preset";
import type { MotionPreset } from "@/features/scene-composer/lib/motion-presets/types";

export const BREAKING_NEWS_PRESETS: MotionPreset[] = [
  definePreset({
    id: "breaking.banner-slam",
    name: "Breaking Banner Slam",
    category: "breaking_news",
    description: "Hard slam breaking banner",
    durationMs: 320,
    tags: ["breaking", "banner", "urgent"],
    icon: "flash",
    motion: {
      entrance: { type: "slide_down", durationMs: 280, delayMs: 0, easing: "cubic" },
      idle: { type: "pulse", speed: 1.4, loop: true },
      exit: { type: "slide_up", durationMs: 240, delayMs: 0, easing: "ease_in" },
      speed: 1.2,
    },
  }),
  definePreset({
    id: "breaking.alert-streak",
    name: "Alert Streak",
    category: "breaking_news",
    description: "Fast wipe alert streak",
    durationMs: 360,
    tags: ["breaking", "alert", "wipe"],
    icon: "wipe",
    motion: {
      entrance: { type: "wipe_left", durationMs: 340, delayMs: 0, easing: "ease_out" },
      idle: { type: "glow", speed: 1.3, loop: true },
      exit: { type: "wipe", durationMs: 260, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "breaking.urgency-pulse",
    name: "Urgency Pulse",
    category: "breaking_news",
    description: "Urgent continuous pulse",
    durationMs: 280,
    tags: ["breaking", "pulse"],
    icon: "live",
    motion: {
      entrance: { type: "opacity", durationMs: 200, delayMs: 0, easing: "linear" },
      idle: { type: "pulse", speed: 1.8, loop: true },
      exit: { type: "fade_out", durationMs: 220, delayMs: 0, easing: "ease_in" },
    },
  }),
];

export const SPORTS_PRESETS: MotionPreset[] = [
  definePreset({
    id: "sports.score-snap",
    name: "Score Snap",
    category: "sports",
    description: "Snappy score bug pop",
    durationMs: 340,
    tags: ["sports", "score", "pop"],
    icon: "pop",
    motion: {
      entrance: { type: "scale_in", durationMs: 300, delayMs: 0, easing: "cubic" },
      idle: { type: "none", speed: 1, loop: true },
      exit: { type: "scale_out", durationMs: 240, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "sports.highlight-zoom",
    name: "Highlight Zoom",
    category: "sports",
    description: "Highlight zoom into play",
    durationMs: 480,
    tags: ["sports", "highlight", "zoom"],
    icon: "zoom",
    motion: {
      entrance: { type: "zoom", durationMs: 460, delayMs: 40, easing: "ease_out" },
      idle: { type: "slow_zoom", speed: 0.5, loop: true },
      exit: { type: "fade_out", durationMs: 300, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "sports.lineup-slide",
    name: "Lineup Slide",
    category: "sports",
    description: "Roster plate slide",
    durationMs: 500,
    tags: ["sports", "lineup", "slide"],
    icon: "slide",
    motion: {
      entrance: { type: "slide_left", durationMs: 480, delayMs: 60, easing: "ease_out" },
      idle: { type: "none", speed: 1, loop: true },
      exit: { type: "slide_left", durationMs: 340, delayMs: 0, easing: "ease_in" },
    },
  }),
];

export const WEATHER_PRESETS: MotionPreset[] = [
  definePreset({
    id: "weather.soft-drift",
    name: "Soft Drift",
    category: "weather",
    description: "Soft weather graphic float",
    durationMs: 700,
    tags: ["weather", "soft", "drift"],
    icon: "float",
    motion: {
      entrance: { type: "fade_in", durationMs: 680, delayMs: 80, easing: "ease_in_out" },
      idle: { type: "float", speed: 0.4, loop: true },
      exit: { type: "fade_out", durationMs: 420, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "weather.map-wipe",
    name: "Map Wipe",
    category: "weather",
    description: "Weather map wipe open",
    durationMs: 620,
    tags: ["weather", "map", "wipe"],
    icon: "wipe",
    motion: {
      entrance: { type: "wipe_right", durationMs: 600, delayMs: 40, easing: "ease_out" },
      idle: { type: "parallax", speed: 0.25, loop: true },
      exit: { type: "wipe", durationMs: 400, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "weather.temp-pop",
    name: "Temperature Pop",
    category: "weather",
    description: "Temperature value pop-in",
    durationMs: 360,
    tags: ["weather", "temperature", "pop"],
    icon: "pop",
    motion: {
      entrance: { type: "scale_in", durationMs: 340, delayMs: 60, easing: "cubic" },
      idle: { type: "none", speed: 1, loop: true },
      exit: { type: "fade_out", durationMs: 260, delayMs: 0, easing: "ease_in" },
    },
  }),
];

export const SOCIAL_MEDIA_PRESETS: MotionPreset[] = [
  definePreset({
    id: "social.story-pop",
    name: "Story Pop",
    category: "social_media",
    description: "Short-form pop entrance",
    durationMs: 300,
    tags: ["social", "story", "pop"],
    icon: "pop",
    motion: {
      entrance: { type: "scale_in", durationMs: 280, delayMs: 0, easing: "cubic" },
      idle: { type: "none", speed: 1, loop: true },
      exit: { type: "scale_out", durationMs: 220, delayMs: 0, easing: "ease_in" },
      speed: 1.2,
    },
  }),
  definePreset({
    id: "social.reel-slide",
    name: "Reel Slide",
    category: "social_media",
    description: "Vertical reel slide",
    durationMs: 420,
    tags: ["social", "reel", "slide"],
    icon: "slide",
    motion: {
      entrance: { type: "slide_up", durationMs: 400, delayMs: 0, easing: "ease_out" },
      idle: { type: "none", speed: 1, loop: true },
      exit: { type: "slide_down", durationMs: 300, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "social.caption-fade",
    name: "Caption Fade",
    category: "social_media",
    description: "Caption fade for social clips",
    durationMs: 380,
    tags: ["social", "caption", "fade"],
    icon: "text",
    motion: {
      entrance: { type: "fade_in", durationMs: 360, delayMs: 40, easing: "ease_out" },
      idle: { type: "none", speed: 1, loop: true },
      exit: { type: "fade_out", durationMs: 280, delayMs: 0, easing: "ease_in" },
    },
  }),
];

export const PROMOTIONAL_PRESETS: MotionPreset[] = [
  definePreset({
    id: "promo.sting-zoom",
    name: "Sting Zoom",
    category: "promotional",
    description: "Promo sting zoom hit",
    durationMs: 440,
    tags: ["promo", "sting", "zoom"],
    icon: "zoom",
    motion: {
      entrance: { type: "zoom", durationMs: 420, delayMs: 0, easing: "cubic" },
      idle: { type: "glow", speed: 0.9, loop: true },
      exit: { type: "scale_out", durationMs: 300, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "promo.bumper-wipe",
    name: "Bumper Wipe",
    category: "promotional",
    description: "Channel bumper wipe",
    durationMs: 500,
    tags: ["promo", "bumper", "wipe"],
    icon: "wipe",
    motion: {
      entrance: { type: "wipe_left", durationMs: 480, delayMs: 0, easing: "ease_in_out" },
      idle: { type: "none", speed: 1, loop: true },
      exit: { type: "wipe", durationMs: 360, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "promo.title-rise",
    name: "Title Rise",
    category: "promotional",
    description: "Promo title rises with glow",
    durationMs: 560,
    tags: ["promo", "title", "rise"],
    icon: "text",
    motion: {
      entrance: { type: "slide_up", durationMs: 540, delayMs: 60, easing: "ease_out" },
      idle: { type: "glow", speed: 0.6, loop: true },
      exit: { type: "fade_out", durationMs: 340, delayMs: 0, easing: "ease_in" },
    },
  }),
];
