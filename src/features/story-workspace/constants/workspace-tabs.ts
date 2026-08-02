export const STORY_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", ready: true },
  { id: "script", label: "Script", ready: true },
  { id: "media", label: "Media", ready: true },
  { id: "ai-producer", label: "AI Producer", ready: true },
  { id: "timeline", label: "Timeline", ready: true },
  { id: "graphics", label: "Graphics", ready: true },
  { id: "voice", label: "Voice", ready: false },
  { id: "publishing", label: "Publishing", ready: false },
  { id: "broadcast", label: "Broadcast", ready: false },
  { id: "analytics", label: "Analytics", ready: false },
  { id: "history", label: "History", ready: false },
] as const;

export type StoryWorkspaceTabId = (typeof STORY_WORKSPACE_TABS)[number]["id"];

export const PUBLISHING_TARGETS = [
  { id: "youtube", label: "YouTube", description: "Channel publishing pipeline" },
  { id: "ott", label: "OTT", description: "OTT / streaming platforms" },
  { id: "social", label: "Social clips", description: "Short-form social delivery" },
  { id: "website", label: "Website CMS", description: "Web article / embed delivery" },
] as const;

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
