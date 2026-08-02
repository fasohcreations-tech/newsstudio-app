import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createContentObject,
  listContentObjects,
  updateContentObject,
} from "@/features/content/services/content.service";
import {
  MEDIAOS_EDITOR_VERSION,
  SMART_EDITOR_MODULE,
} from "@/features/smart-editor/constants/editor.constants";
import type {
  EditorDraftMetadata,
  EditorLanguage,
  NewsroomFormat,
} from "@/features/smart-editor/types/editor.types";
import type { Database, Json } from "@/shared/types/database.types";

type Client = SupabaseClient<Database>;

export type UpsertEditorDraftInput = {
  organizationId: string;
  storyId: string;
  userId: string;
  contentObjectId?: string;
  title?: string;
  bodyHtml: string;
  bodyPlain: string;
  language: EditorLanguage;
  revision: number;
  lastCursorPosition?: number | null;
  newsroomFormat: NewsroomFormat;
  wordCount: number;
  characterCount: number;
};

function isEditorMeta(value: unknown): value is EditorDraftMetadata {
  if (!value || typeof value !== "object") return false;
  return (value as { module?: string }).module === SMART_EDITOR_MODULE;
}

export async function upsertEditorDraft(
  client: Client,
  input: UpsertEditorDraftInput,
) {
  const metadata: EditorDraftMetadata = {
    module: SMART_EDITOR_MODULE,
    editorVersion: MEDIAOS_EDITOR_VERSION,
    bodyHtml: input.bodyHtml,
    bodyPlain: input.bodyPlain,
    language: input.language,
    revision: input.revision,
    lastCursorPosition: input.lastCursorPosition ?? null,
    newsroomFormat: input.newsroomFormat,
    wordCount: input.wordCount,
    characterCount: input.characterCount,
    autosavedAt: new Date().toISOString(),
  };

  if (input.contentObjectId) {
    return updateContentObject(client, input.contentObjectId, {
      title: input.title ?? "Editor draft",
      language: input.language === "manglish" ? "ml" : input.language,
      metadata: metadata as unknown as Json,
      version: input.revision,
      updated_by: input.userId,
      status: "draft",
    });
  }

  const existing = await listContentObjects(
    client,
    {
      organizationId: input.organizationId,
      storyId: input.storyId,
    },
    { type: "article", status: "draft" },
  );

  const match = (existing.data ?? []).find((row) => isEditorMeta(row.metadata));
  if (match) {
    return updateContentObject(client, match.id, {
      title: input.title ?? match.title,
      language: input.language === "manglish" ? "ml" : input.language,
      metadata: metadata as unknown as Json,
      version: input.revision,
      updated_by: input.userId,
    });
  }

  return createContentObject(client, {
    organization_id: input.organizationId,
    story_id: input.storyId,
    type: "article",
    title: input.title ?? "Smart Editor draft",
    status: "draft",
    language: input.language === "manglish" ? "ml" : input.language,
    metadata: metadata as unknown as Json,
    version: input.revision,
    created_by: input.userId,
    updated_by: input.userId,
  });
}

export async function getEditorDraftForStory(
  client: Client,
  organizationId: string,
  storyId: string,
) {
  const result = await listContentObjects(
    client,
    { organizationId, storyId },
    { type: "article" },
  );
  if (result.error) return { data: null, error: result.error };
  const match = (result.data ?? []).find((row) => isEditorMeta(row.metadata));
  return { data: match ?? null, error: null };
}
