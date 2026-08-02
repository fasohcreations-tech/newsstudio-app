import { definePreset } from "@/features/scene-composer/lib/motion-presets/define-preset";
import type { MotionPreset } from "@/features/scene-composer/lib/motion-presets/types";

export const TICKER_PRESETS: MotionPreset[] = [
  definePreset({
    id: "ticker.continuous-scroll",
    name: "Continuous Scroll",
    category: "ticker",
    description: "Parallax continuous crawl feel",
    durationMs: 600,
    tags: ["ticker", "scroll", "loop"],
    icon: "ticker",
    motion: {
      entrance: { type: "slide_left", durationMs: 550, delayMs: 0, easing: "ease_out" },
      idle: { type: "parallax", speed: 0.55, loop: true },
      exit: { type: "slide_left", durationMs: 400, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "ticker.breaking-scroll",
    name: "Breaking Scroll",
    category: "ticker",
    description: "Faster breaking crawl entrance",
    durationMs: 420,
    tags: ["ticker", "breaking", "scroll"],
    icon: "flash",
    motion: {
      entrance: { type: "slide_left", durationMs: 380, delayMs: 0, easing: "cubic" },
      idle: { type: "parallax", speed: 0.9, loop: true },
      exit: { type: "fade_out", durationMs: 260, delayMs: 0, easing: "ease_in" },
      speed: 1.25,
    },
  }),
  definePreset({
    id: "ticker.loop-scroll",
    name: "Loop Scroll",
    category: "ticker",
    description: "Gentle looping crawl",
    durationMs: 540,
    tags: ["ticker", "loop"],
    icon: "ticker",
    motion: {
      entrance: { type: "fade_in", durationMs: 360, delayMs: 40, easing: "ease_out" },
      idle: { type: "parallax", speed: 0.4, loop: true },
      exit: { type: "fade_out", durationMs: 300, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "ticker.fade-scroll",
    name: "Fade Scroll",
    category: "ticker",
    description: "Fade in then soft crawl",
    durationMs: 580,
    tags: ["ticker", "fade", "scroll"],
    icon: "ticker",
    motion: {
      entrance: { type: "fade_in", durationMs: 500, delayMs: 60, easing: "ease_out" },
      idle: { type: "parallax", speed: 0.35, loop: true },
      exit: { type: "fade_out", durationMs: 360, delayMs: 0, easing: "ease_in" },
    },
  }),
  definePreset({
    id: "ticker.emergency-flash",
    name: "Emergency Flash",
    category: "ticker",
    description: "High-urgency ticker flash",
    durationMs: 300,
    tags: ["ticker", "emergency", "flash"],
    icon: "flash",
    motion: {
      entrance: { type: "opacity", durationMs: 180, delayMs: 0, easing: "linear" },
      idle: { type: "pulse", speed: 2, loop: true },
      exit: { type: "opacity", durationMs: 200, delayMs: 0, easing: "linear" },
      speed: 1.35,
    },
  }),
];
