/**
 * Design-system status tokens for MediaOS (Sprint PT-001).
 */

export const STATUS_TONES = [
  "neutral",
  "success",
  "warning",
  "danger",
  "info",
  "ai",
] as const;

export type StatusTone = (typeof STATUS_TONES)[number];

export const STATUS_TONE_CLASSES: Record<
  StatusTone,
  { dot: string; badge: string; text: string }
> = {
  neutral: {
    dot: "bg-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
    text: "text-muted-foreground",
  },
  success: {
    dot: "bg-[var(--status-success)]",
    badge:
      "border-[color-mix(in_oklch,var(--status-success)_35%,transparent)] bg-[color-mix(in_oklch,var(--status-success)_12%,transparent)] text-[var(--status-success-fg)]",
    text: "text-[var(--status-success-fg)]",
  },
  warning: {
    dot: "bg-[var(--status-warning)]",
    badge:
      "border-[color-mix(in_oklch,var(--status-warning)_35%,transparent)] bg-[color-mix(in_oklch,var(--status-warning)_12%,transparent)] text-[var(--status-warning-fg)]",
    text: "text-[var(--status-warning-fg)]",
  },
  danger: {
    dot: "bg-destructive",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
    text: "text-destructive",
  },
  info: {
    dot: "bg-[var(--status-info)]",
    badge:
      "border-[color-mix(in_oklch,var(--status-info)_35%,transparent)] bg-[color-mix(in_oklch,var(--status-info)_12%,transparent)] text-[var(--status-info-fg)]",
    text: "text-[var(--status-info-fg)]",
  },
  ai: {
    dot: "bg-[var(--status-ai)]",
    badge:
      "border-[color-mix(in_oklch,var(--status-ai)_35%,transparent)] bg-[color-mix(in_oklch,var(--status-ai)_12%,transparent)] text-[var(--status-ai-fg)]",
    text: "text-[var(--status-ai-fg)]",
  },
};

export const KEYBOARD_SHORTCUTS = [
  { id: "command-palette", keys: "Ctrl+K", description: "Open command palette" },
  { id: "toggle-sidebar", keys: "Ctrl+B", description: "Toggle navigation" },
  { id: "notifications", keys: "Ctrl+Shift+N", description: "Open notifications" },
  { id: "new-story", keys: "Ctrl+Shift+S", description: "Create story" },
] as const;
