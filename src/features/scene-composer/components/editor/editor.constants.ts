/**
 * Module 3.6 — Scene Composer editor UX constants.
 */

export const EDITOR_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2] as const;

export const EDITOR_ZOOM_LABELS: Record<number, string> = {
  0.25: "25%",
  0.5: "50%",
  0.75: "75%",
  1: "100%",
  1.5: "150%",
  2: "200%",
};

/** Safe Title ≈ 80% of frame; Safe Action ≈ 90%. */
export const SAFE_TITLE_INSET = 0.1;
export const SAFE_ACTION_INSET = 0.05;

export const TIMELINE_MIN_HEIGHT = 220;
export const TIMELINE_MAX_HEIGHT = 520;
export const TIMELINE_DEFAULT_HEIGHT = 320;

/** Readability scale for editor chrome (not the broadcast artboard). */
export const EDITOR_UI = {
  panelTitle: "text-[18px] font-semibold tracking-tight",
  sectionHeader: "text-[16px] font-semibold",
  label: "text-[14px] font-medium text-muted-foreground",
  input: "h-9 text-[15px]",
  button: "h-9 min-h-9 text-[16px]",
  timeline: "text-[14px]",
  helper: "text-[13px] text-muted-foreground",
} as const;
