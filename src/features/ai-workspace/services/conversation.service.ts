import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/shared/types/database.types";
import {
  AI_WORKSPACE_ACTION_LABELS,
  type AIWorkspaceSuggestedAction,
} from "@/features/ai-workspace/constants/workspace.constants";
import {
  runMockAssistantReply,
  runMockWorkspaceAction,
  systemWelcomeMessage,
} from "@/features/ai-workspace/services/mock-assistant";
import * as AIJobManager from "@/features/ai/services/ai-job-manager";
import type {
  AIConversation,
  AIConversationWithMessages,
  AIMessage,
  AIWorkspaceOutput,
  AIWorkspaceServiceResult,
  StoryAIContext,
} from "@/features/ai-workspace/types/workspace.types";

type Client = SupabaseClient<Database>;

const AI_CONVERSATION_SELECT =
  "id, organization_id, story_id, title, status, metadata, created_by, updated_by, created_at, updated_at, deleted_at";

const AI_MESSAGE_SELECT =
  "id, organization_id, conversation_id, story_id, role, content, action_type, metadata, created_by, created_at, updated_at, deleted_at";

const AI_WORKSPACE_OUTPUT_SELECT =
  "id, organization_id, story_id, conversation_id, message_id, action_type, status, title, content, content_version, ai_job_id, structured, error, approved_at, approved_by, rejected_at, rejected_by, rejection_reason, created_by, updated_by, created_at, updated_at, deleted_at";

export async function getOrCreateConversation(
  client: Client,
  args: {
    organizationId: string;
    storyId: string;
    userId: string;
    context: StoryAIContext;
  },
): Promise<AIWorkspaceServiceResult<AIConversationWithMessages>> {
  const existing = await loadConversationForStory(client, args.storyId);
  if (existing.error) {
    return { data: null, error: existing.error };
  }
  if (existing.data) {
    return { data: existing.data, error: null };
  }

  const { data: conversation, error } = await client
    .from("ai_conversations")
    .insert({
      organization_id: args.organizationId,
      story_id: args.storyId,
      title: "Story Assistant",
      status: "active",
      metadata: { mock: true },
      created_by: args.userId,
      updated_by: args.userId,
    })
    .select(AI_CONVERSATION_SELECT)
    .single();

  if (error || !conversation) {
    // Race: another request created it
    if (error?.code === "23505") {
      const raced = await loadConversationForStory(client, args.storyId);
      if (raced.error || !raced.data) {
        return {
          data: null,
          error: raced.error ?? "Unable to load conversation after create race.",
        };
      }
      return { data: raced.data, error: null };
    }
    return { data: null, error: error?.message ?? "Unable to create conversation." };
  }

  const { data: welcome, error: welcomeError } = await client
    .from("ai_messages")
    .insert({
      organization_id: args.organizationId,
      conversation_id: conversation.id,
      story_id: args.storyId,
      role: "system",
      content: systemWelcomeMessage(args.context),
      action_type: null,
      metadata: { kind: "welcome", mock: true },
      created_by: args.userId,
    })
    .select(AI_MESSAGE_SELECT)
    .single();

  if (welcomeError) {
    return { data: null, error: welcomeError.message };
  }

  return {
    data: { ...conversation, messages: welcome ? [welcome] : [] },
    error: null,
  };
}

export async function loadConversationForStory(
  client: Client,
  storyId: string,
): Promise<AIWorkspaceServiceResult<AIConversationWithMessages | null>> {
  const { data: conversation, error } = await client
    .from("ai_conversations")
    .select(AI_CONVERSATION_SELECT)
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!conversation) return { data: null, error: null };

  const { data: messages, error: messagesError } = await client
    .from("ai_messages")
    .select(AI_MESSAGE_SELECT)
    .eq("conversation_id", conversation.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (messagesError) return { data: null, error: messagesError.message };

  return {
    data: { ...conversation, messages: messages ?? [] },
    error: null,
  };
}

export async function sendChatMessage(
  client: Client,
  args: {
    organizationId: string;
    userId: string;
    context: StoryAIContext;
    content: string;
  },
): Promise<
  AIWorkspaceServiceResult<{
    conversation: AIConversationWithMessages;
    userMessage: AIMessage;
    assistantMessage: AIMessage;
  }>
> {
  const content = args.content.trim();
  if (!content) {
    return { data: null, error: "Message cannot be empty." };
  }
  if (content.length > 8000) {
    return { data: null, error: "Message is too long." };
  }

  const convo = await getOrCreateConversation(client, {
    organizationId: args.organizationId,
    storyId: args.context.storyId,
    userId: args.userId,
    context: args.context,
  });
  if (convo.error || !convo.data) {
    return { data: null, error: convo.error ?? "Conversation unavailable." };
  }

  const conversation = convo.data;

  const { data: userMessage, error: userError } = await client
    .from("ai_messages")
    .insert({
      organization_id: args.organizationId,
      conversation_id: conversation.id,
      story_id: args.context.storyId,
      role: "user",
      content,
      action_type: "chat",
      metadata: { mock: true },
      created_by: args.userId,
    })
    .select(AI_MESSAGE_SELECT)
    .single();

  if (userError || !userMessage) {
    return { data: null, error: userError?.message ?? "Failed to save message." };
  }

  const job = await AIJobManager.enqueueJob(client, {
    organizationId: args.organizationId,
    userId: args.userId,
    storyId: args.context.storyId,
    provider: "mock",
    model: "workspace-assistant",
    jobType: "workspace.chat",
    request: {
      conversationId: conversation.id,
      messageId: userMessage.id,
      mock: true,
      content,
    },
  });

  if (job.job) {
    await AIJobManager.markJobRunning(client, job.job.id, args.userId);
  }

  const started = Date.now();
  let reply: string;
  try {
    reply = await runMockAssistantReply(args.context, content);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mock assistant failed.";
    if (job.job) {
      await AIJobManager.markJobFailed(client, job.job.id, args.userId, message);
    }
    return { data: null, error: message };
  }

  const { data: assistantMessage, error: assistantError } = await client
    .from("ai_messages")
    .insert({
      organization_id: args.organizationId,
      conversation_id: conversation.id,
      story_id: args.context.storyId,
      role: "assistant",
      content: reply,
      action_type: "chat",
      metadata: {
        mock: true,
        inReplyTo: userMessage.id,
        aiJobId: job.job?.id ?? null,
      },
      created_by: null,
    })
    .select(AI_MESSAGE_SELECT)
    .single();

  if (assistantError || !assistantMessage) {
    if (job.job) {
      await AIJobManager.markJobFailed(
        client,
        job.job.id,
        args.userId,
        assistantError?.message ?? "Failed to save assistant reply.",
      );
    }
    return {
      data: null,
      error: assistantError?.message ?? "Failed to save assistant reply.",
    };
  }

  if (job.job) {
    await AIJobManager.markJobSucceeded(client, job.job.id, args.userId, {
      response: { messageId: assistantMessage.id, mock: true } as unknown as Json,
      tokensUsed: 0,
      cost: 0,
      processingTimeMs: Date.now() - started,
    });
  }

  await client
    .from("ai_conversations")
    .update({ updated_by: args.userId })
    .eq("id", conversation.id);

  const refreshed = await loadConversationForStory(client, args.context.storyId);
  if (refreshed.error || !refreshed.data) {
    return {
      data: null,
      error: refreshed.error ?? "Conversation reload failed.",
    };
  }

  return {
    data: {
      conversation: refreshed.data,
      userMessage,
      assistantMessage,
    },
    error: null,
  };
}

export async function runSuggestedAction(
  client: Client,
  args: {
    organizationId: string;
    userId: string;
    context: StoryAIContext;
    action: AIWorkspaceSuggestedAction;
  },
): Promise<
  AIWorkspaceServiceResult<{
    conversation: AIConversationWithMessages;
    output: AIWorkspaceOutput;
  }>
> {
  const label = AI_WORKSPACE_ACTION_LABELS[args.action];

  const convo = await getOrCreateConversation(client, {
    organizationId: args.organizationId,
    storyId: args.context.storyId,
    userId: args.userId,
    context: args.context,
  });
  if (convo.error || !convo.data) {
    return { data: null, error: convo.error ?? "Conversation unavailable." };
  }

  const conversation = convo.data;

  await client.from("ai_messages").insert({
    organization_id: args.organizationId,
    conversation_id: conversation.id,
    story_id: args.context.storyId,
    role: "system",
    content: `Suggested task started: ${label}`,
    action_type: args.action,
    metadata: { kind: "suggested_action", mock: true },
    created_by: args.userId,
  });

  const { data: userMessage } = await client
    .from("ai_messages")
    .insert({
      organization_id: args.organizationId,
      conversation_id: conversation.id,
      story_id: args.context.storyId,
      role: "user",
      content: `Run suggested task: ${label}`,
      action_type: args.action,
      metadata: { kind: "suggested_action", mock: true },
      created_by: args.userId,
    })
    .select(AI_MESSAGE_SELECT)
    .single();

  const job = await AIJobManager.enqueueJob(client, {
    organizationId: args.organizationId,
    userId: args.userId,
    storyId: args.context.storyId,
    provider: "mock",
    model: "workspace-assistant",
    jobType: `workspace.${args.action}`,
    request: {
      action: args.action,
      conversationId: conversation.id,
      mock: true,
    },
  });

  if (job.job) {
    await AIJobManager.markJobRunning(client, job.job.id, args.userId);
  }

  const started = Date.now();
  let generated: Awaited<ReturnType<typeof runMockWorkspaceAction>>;
  try {
    generated = await runMockWorkspaceAction(args.action, args.context);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mock generation failed.";
    if (job.job) {
      await AIJobManager.markJobFailed(client, job.job.id, args.userId, message);
    }
    return { data: null, error: message };
  }

  const { data: assistantMessage } = await client
    .from("ai_messages")
    .insert({
      organization_id: args.organizationId,
      conversation_id: conversation.id,
      story_id: args.context.storyId,
      role: "assistant",
      content: `Generated “${generated.title}”. Review it under Outputs.`,
      action_type: args.action,
      metadata: {
        mock: true,
        kind: "generation_notice",
        inReplyTo: userMessage?.id ?? null,
      },
      created_by: null,
    })
    .select(AI_MESSAGE_SELECT)
    .single();

  const { data: output, error: outputError } = await client
    .from("ai_workspace_outputs")
    .insert({
      organization_id: args.organizationId,
      story_id: args.context.storyId,
      conversation_id: conversation.id,
      message_id: assistantMessage?.id ?? null,
      action_type: args.action,
      status: "waiting_for_approval",
      title: generated.title,
      content: generated.content,
      content_version: 1,
      ai_job_id: job.job?.id ?? null,
      structured: {
        ...generated.structured,
        mock: true,
      } as unknown as Json,
      created_by: args.userId,
      updated_by: args.userId,
    })
    .select(AI_WORKSPACE_OUTPUT_SELECT)
    .single();

  if (outputError || !output) {
    if (job.job) {
      await AIJobManager.markJobFailed(
        client,
        job.job.id,
        args.userId,
        outputError?.message ?? "Failed to save output.",
      );
    }
    return {
      data: null,
      error: outputError?.message ?? "Failed to save generated output.",
    };
  }

  if (job.job) {
    await AIJobManager.markJobSucceeded(client, job.job.id, args.userId, {
      response: {
        outputId: output.id,
        title: output.title,
        mock: true,
      } as unknown as Json,
      tokensUsed: 0,
      cost: 0,
      processingTimeMs: Date.now() - started,
    });
  }

  const refreshed = await loadConversationForStory(client, args.context.storyId);
  if (refreshed.error || !refreshed.data) {
    return {
      data: null,
      error: refreshed.error ?? "Conversation reload failed.",
    };
  }

  return {
    data: { conversation: refreshed.data, output },
    error: null,
  };
}

export type { AIConversation };
