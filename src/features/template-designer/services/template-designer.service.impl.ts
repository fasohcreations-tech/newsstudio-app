/**
 * Feature 040 — in-memory Template catalog until the persistence migration lands.
 * Seeds include GNN-001 as the first professional package reference.
 * Does not mutate Scene Composer / Story rows.
 */

import {
  createDefaultCanvas,
  createDefaultTheme,
  createDefaultTimelineDefaults,
  DEFAULT_BINDING_KEYS,
} from "@/features/template-designer/constants/template-designer.constants";
import type { TemplateDesignerService } from "@/features/template-designer/services/template-designer.service";
import type {
  BroadcastTemplate,
  BroadcastTemplateSummary,
  CreateTemplateInput,
  UpdateTemplateInput,
} from "@/features/template-designer/types/template-designer.types";

const store = new Map<string, BroadcastTemplate>();

function nowIso() {
  return new Date().toISOString();
}

function toSummary(t: BroadcastTemplate): BroadcastTemplateSummary {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    category: t.category,
    workflow_state: t.workflow_state,
    version: t.version,
    composer_scene_id: t.composer_scene_id,
    canvas: t.canvas,
    thumbnail_url: t.thumbnail_url,
    tags: t.tags,
    updated_at: t.updated_at,
  };
}

function slugCode(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function ensureSeed(organizationId: string) {
  const existing = [...store.values()].some(
    (t) => t.organization_id === organizationId,
  );
  if (existing) return;

  const seed: BroadcastTemplate[] = [
    {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      code: "GNN-001",
      name: "GNN 001 — Full News Story",
      description:
        "Primary broadcast news package: main video, lower third, left rail, ticker, logo.",
      category: "gnn",
      workflow_state: "published",
      version: 1,
      composer_scene_id: null,
      canvas: createDefaultCanvas("1920x1080"),
      theme: createDefaultTheme(),
      timeline_defaults: createDefaultTimelineDefaults(),
      binding_keys: [...DEFAULT_BINDING_KEYS],
      tags: ["news", "lower-third", "ticker", "left-rail"],
      thumbnail_url: null,
      metadata: { package_code: "GNN-001", feature: "040" },
      created_by: null,
      updated_by: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      code: "GNN-002",
      name: "GNN 002 — Breaking",
      description: "Breaking news treatment (scaffold — link Scene Composer when ready).",
      category: "breaking_news",
      workflow_state: "draft",
      version: 1,
      composer_scene_id: null,
      canvas: createDefaultCanvas("1920x1080"),
      theme: createDefaultTheme(),
      timeline_defaults: {
        ...createDefaultTimelineDefaults(),
        defaultDurationMs: 10_000,
      },
      binding_keys: [...DEFAULT_BINDING_KEYS],
      tags: ["breaking", "urgent"],
      thumbnail_url: null,
      metadata: { package_code: "GNN-002", feature: "040" },
      created_by: null,
      updated_by: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      code: "REELS-001",
      name: "Vertical Reels — News Cut",
      description: "9:16 social / reels package scaffold.",
      category: "vertical_reels",
      workflow_state: "draft",
      version: 1,
      composer_scene_id: null,
      canvas: createDefaultCanvas("1080x1920"),
      theme: createDefaultTheme(),
      timeline_defaults: {
        ...createDefaultTimelineDefaults(),
        defaultDurationMs: 30_000,
      },
      binding_keys: ["headline", "subheadline", "video", "logo", "ticker"],
      tags: ["vertical", "social"],
      thumbnail_url: null,
      metadata: { feature: "040" },
      created_by: null,
      updated_by: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  for (const t of seed) store.set(t.id, t);
}

export function createTemplateDesignerService(): TemplateDesignerService {
  return {
    async listTemplates(organizationId) {
      ensureSeed(organizationId);
      const list = [...store.values()]
        .filter(
          (t) =>
            t.organization_id === organizationId &&
            t.workflow_state !== "archived",
        )
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map(toSummary);
      return { data: list, error: null };
    },

    async getTemplate(templateId) {
      const t = store.get(templateId) ?? null;
      if (!t) return { data: null, error: "Template not found" };
      return { data: t, error: null };
    },

    async createTemplate(input: CreateTemplateInput) {
      ensureSeed(input.organizationId);
      const id = crypto.randomUUID();
      const stamp = nowIso();
      const code = (input.code?.trim() || slugCode(input.name) || "TPL").slice(
        0,
        32,
      );
      const template: BroadcastTemplate = {
        id,
        organization_id: input.organizationId,
        code,
        name: input.name.trim() || "Untitled Template",
        description: input.description?.trim() || "",
        category: input.category ?? "custom",
        workflow_state: "draft",
        version: 1,
        composer_scene_id: input.composerSceneId ?? null,
        canvas: createDefaultCanvas(input.aspectPreset ?? "1920x1080"),
        theme: createDefaultTheme(),
        timeline_defaults: createDefaultTimelineDefaults(),
        binding_keys: [...DEFAULT_BINDING_KEYS],
        tags: [],
        thumbnail_url: null,
        metadata: { feature: "040" },
        created_by: input.userId,
        updated_by: input.userId,
        created_at: stamp,
        updated_at: stamp,
      };
      store.set(id, template);
      return { data: template, error: null };
    },

    async updateTemplate(
      templateId: string,
      userId: string,
      patch: UpdateTemplateInput,
    ) {
      const current = store.get(templateId);
      if (!current) return { data: null, error: "Template not found" };
      const next: BroadcastTemplate = {
        ...current,
        ...patch,
        id: current.id,
        organization_id: current.organization_id,
        version: current.version + 1,
        updated_by: userId,
        updated_at: nowIso(),
      };
      store.set(templateId, next);
      return { data: next, error: null };
    },

    async duplicateTemplate(templateId, userId) {
      const current = store.get(templateId);
      if (!current) return { data: null, error: "Template not found" };
      const id = crypto.randomUUID();
      const stamp = nowIso();
      const copy: BroadcastTemplate = {
        ...current,
        id,
        code: `${current.code}-COPY`,
        name: `${current.name} (Copy)`,
        workflow_state: "draft",
        version: 1,
        created_by: userId,
        updated_by: userId,
        created_at: stamp,
        updated_at: stamp,
      };
      store.set(id, copy);
      return { data: copy, error: null };
    },

    async archiveTemplate(templateId, userId) {
      return this.updateTemplate(templateId, userId, {
        workflow_state: "archived",
      });
    },
  };
}
