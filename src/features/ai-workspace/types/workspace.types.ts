import type { Tables } from "@/shared/types/database.types";
import type { AiJob } from "@/features/content/types/content.types";
import type { AIWorkflowWithTasks } from "@/features/ai-production/types/production.types";

export type AIConversation = Tables<"ai_conversations">;
export type AIMessage = Tables<"ai_messages">;
export type AIWorkspaceOutput = Tables<"ai_workspace_outputs">;

export type AIConversationWithMessages = AIConversation & {
  messages: AIMessage[];
};

export type AIWorkspaceBundle = {
  conversation: AIConversationWithMessages | null;
  outputs: AIWorkspaceOutput[];
  jobs: AiJob[];
  workflow: AIWorkflowWithTasks | null;
};

export type StoryAIContext = {
  storyId: string;
  storyTitle: string;
  storySummary?: string | null;
  language?: string;
};

export type AIWorkspaceServiceResult<T> = {
  data: T | null;
  error: string | null;
};
