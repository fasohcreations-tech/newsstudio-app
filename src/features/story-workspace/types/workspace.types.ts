import type { Tables } from "@/shared/types/database.types";
import type { StoryWithRelations } from "@/features/newsroom/types/story.types";
import type { SaveStatus } from "@/features/story-workspace/constants/workspace-tabs";

export type StoryScript = Tables<"story_scripts">;

export type StoryWorkspaceUser = {
  id: string;
  email: string;
  full_name: string | null;
};

export type StoryWorkspaceProps = {
  story: StoryWithRelations;
  script: StoryScript;
  currentUser: StoryWorkspaceUser;
};

export type ScriptSavePayload = {
  contentHtml: string;
  contentPlain: string;
  wordCount: number;
  characterCount: number;
};

export type ScriptAutosaveState = {
  status: SaveStatus;
  lastSavedAt: string | null;
  error: string | null;
};
