import type { MotionEasing } from "@/features/scene-composer/lib/motion-animation/types";

/** Map 0–1 progress through an easing curve. */
export function applyEasing(t: number, easing: MotionEasing): number {
  const x = Math.min(1, Math.max(0, t));
  switch (easing) {
    case "linear":
      return x;
    case "ease_in":
      return x * x;
    case "ease_out":
      return 1 - (1 - x) * (1 - x);
    case "ease_in_out":
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    case "cubic":
      return x * x * (3 - 2 * x);
    default:
      return x;
  }
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
