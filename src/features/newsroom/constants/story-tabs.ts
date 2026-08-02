/**
 * Story detail tabs reserved for future MediaOS modules.
 * Tabs render as placeholders in Feature 002.
 */
export const STORY_DETAIL_TABS = [
  { id: "overview", label: "Overview", ready: true },
  { id: "media", label: "Media", ready: true },
  { id: "script", label: "Script", ready: false },
  { id: "voice-over", label: "Voice Over", ready: false },
  { id: "timeline", label: "Timeline", ready: false },
  { id: "poster", label: "Poster", ready: false },
  { id: "thumbnail", label: "Thumbnail", ready: false },
  { id: "publishing", label: "Publishing", ready: false },
  { id: "broadcast", label: "Broadcast", ready: false },
  { id: "ai-assistant", label: "AI Assistant", ready: false },
  { id: "history", label: "History", ready: false },
  { id: "analytics", label: "Analytics", ready: false },
] as const;

export type StoryDetailTabId = (typeof STORY_DETAIL_TABS)[number]["id"];
