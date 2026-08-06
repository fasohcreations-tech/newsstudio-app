/**
 * Mapping Mode → ordered pages from source candidates.
 */

import type {
  SmartMappingCandidate,
  SmartMappingMode,
  SmartMappingPage,
} from "@/features/scene-composer/lib/story-mapping/types";

function toPage(item: SmartMappingCandidate): SmartMappingPage {
  return {
    value: item.value,
    kind: item.kind,
    label: item.label,
  };
}

function shuffleOnce<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

/**
 * Collapse candidates into pages.
 *
 * Phase 1:
 * - single / first → first
 * - last → last
 * - slideshow / sequential / grid / timeline → all
 * - random → shuffle once, take first
 * - manual → empty (caller uses media_container.slides)
 */
export function applyMappingMode(
  mode: SmartMappingMode,
  candidates: SmartMappingCandidate[],
): SmartMappingPage[] {
  if (mode === "manual") return [];
  if (candidates.length === 0) return [];

  switch (mode) {
    case "single":
    case "first":
      return [toPage(candidates[0]!)];
    case "last":
      return [toPage(candidates[candidates.length - 1]!)];
    case "random": {
      const shuffled = shuffleOnce(candidates);
      return [toPage(shuffled[0]!)];
    }
    case "slideshow":
    case "sequential":
    case "grid":
    case "timeline":
      return candidates.map(toPage);
    default:
      return [toPage(candidates[0]!)];
  }
}
