/**
 * Story Package service — build Scene Collections from approved stories.
 * Never mutates Master Templates.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSceneComposerService } from "@/features/scene-composer/services/scene-composer.service.impl";
import { getScenePackageCode } from "@/features/scene-composer/lib/gnn-package-utils";
import { analyzeApprovedScript } from "@/features/story-scene-builder/lib/analyze-script";
import {
  buildPanelSceneBindings,
  extractMasterChromeAssets,
  mergeChromeAssets,
  panelToInstanceFields,
  panelToStoryData,
  type MasterChromeAssets,
} from "@/features/story-scene-builder/lib/build-panel-bindings";
import {
  DEFAULT_MASTER_TEMPLATE_CODE,
  findMasterTemplateByCode,
  findMasterTemplateById,
} from "@/features/story-scene-builder/lib/find-master-template";
import { instantiateSceneFromMaster } from "@/features/story-scene-builder/lib/instantiate-scene";
import { storySceneBuilderDb } from "@/features/story-scene-builder/lib/scene-builder-db";
import { segmentVoiceTiming } from "@/features/story-scene-builder/lib/voice-segmentation";
import type {
  BuildStoryScenesResult,
  StoryPackageBundle,
  StoryPackageRow,
  StorySceneInstanceRow,
  StoryVoiceSegmentRow,
} from "@/features/story-scene-builder/types/scene-builder.types";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

type Client = SupabaseClient;
type Result<T> = { data: T | null; error: string | null };

function ok<T>(data: T): Result<T> {
  return { data, error: null };
}

function fail<T>(error: string): Result<T> {
  return { data: null, error };
}

function asPackage(row: unknown): StoryPackageRow {
  return row as StoryPackageRow;
}

function historyEntry(
  action: string,
  by: string,
  detail: Record<string, unknown> = {},
) {
  return {
    at: new Date().toISOString(),
    action,
    by,
    ...detail,
  };
}

function estimateDurationFromWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
  // ~150 wpm narration → ms
  return Math.max(8_000, Math.round((words / 150) * 60_000));
}

/** Optional story/schedule advertisement assignment (empty until schedule ships). */
function resolveAdvertisementRef(_story: Record<string, unknown>): string {
  void _story;
  return "";
}

async function loadMasterChromeAssets(
  client: Client,
  masterTemplateId: string,
): Promise<MasterChromeAssets> {
  const db = storySceneBuilderDb(client);
  const { data } = await db
    .from("creative_studio_motion_scenes")
    .select("resolved_bindings, metadata")
    .eq("id", masterTemplateId)
    .maybeSingle();

  return extractMasterChromeAssets(
    (data as {
      resolved_bindings?: Record<string, string> | null;
      metadata?: Record<string, unknown> | null;
    }) ?? {},
  );
}

export async function getStoryPackageByStoryId(
  client: Client,
  storyId: string,
): Promise<Result<StoryPackageBundle | null>> {
  const db = storySceneBuilderDb(client);
  const { data: pkg, error } = await db
    .from("story_packages")
    .select("*")
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!pkg) return ok(null);

  const packageId = (pkg as StoryPackageRow).id;

  const [{ data: segments }, { data: scenes }] = await Promise.all([
    db
      .from("story_voice_segments")
      .select("*")
      .eq("package_id", packageId)
      .order("sort_order", { ascending: true }),
    db
      .from("story_scene_instances")
      .select("*")
      .eq("package_id", packageId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
  ]);

  return ok({
    package: asPackage(pkg),
    voiceSegments: (segments ?? []) as StoryVoiceSegmentRow[],
    scenes: (scenes ?? []) as StorySceneInstanceRow[],
  });
}

export async function listStoryPackagesForOrg(
  client: Client,
  organizationId: string,
): Promise<Result<StoryPackageRow[]>> {
  const db = storySceneBuilderDb(client);
  const { data, error } = await db
    .from("story_packages")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return fail(error.message);
  return ok((data ?? []).map(asPackage));
}

async function clearPackageContents(
  client: Client,
  packageId: string,
  userId: string,
): Promise<string | null> {
  const db = storySceneBuilderDb(client);
  const motionDb = storySceneBuilderDb(client);

  const { data: instances } = await db
    .from("story_scene_instances")
    .select("id, scene_id")
    .eq("package_id", packageId)
    .is("deleted_at", null);

  const sceneIds = ((instances ?? []) as Array<{ scene_id: string }>)
    .map((row) => row.scene_id)
    .filter(Boolean);

  if (sceneIds.length > 0) {
    await motionDb
      .from("creative_studio_motion_scenes")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .in("id", sceneIds)
      .eq("is_template", false);
  }

  await db
    .from("story_scene_instances")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: userId,
      status: "archived",
    })
    .eq("package_id", packageId)
    .is("deleted_at", null);

  await db.from("story_voice_segments").delete().eq("package_id", packageId);

  return null;
}

export async function buildStoryScenePackage(
  client: Client,
  input: {
    storyId: string;
    userId: string;
    masterTemplateCode?: string;
    masterTemplateId?: string;
  },
): Promise<Result<BuildStoryScenesResult>> {
  const db = storySceneBuilderDb(client);
  let masterCode = input.masterTemplateCode ?? DEFAULT_MASTER_TEMPLATE_CODE;

  const { data: story, error: storyError } = await client
    .from("stories")
    .select("*")
    .eq("id", input.storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (storyError || !story) {
    return fail(storyError?.message ?? "Story not found");
  }

  const approvedScript = (story.approved_script ?? "").trim();
  if (!approvedScript) {
    return fail("Approve the story script before building scenes.");
  }

  // Seed Master Template Library (immutable masters) if missing.
  const composer = createSceneComposerService(client);
  await composer.ensureDefaults(story.organization_id, input.userId);

  let master: Awaited<ReturnType<typeof findMasterTemplateByCode>>["data"] =
    null;

  if (input.masterTemplateId) {
    const byId = await findMasterTemplateById(
      client,
      story.organization_id,
      input.masterTemplateId,
    );
    if (!byId.data) {
      return fail(byId.error ?? "Master Template not found");
    }
    master = byId.data;
    masterCode = getScenePackageCode(master) ?? "";
  } else {
    let masterResult = await findMasterTemplateByCode(
      client,
      story.organization_id,
      masterCode,
    );

    // Second pass: revive/reseed can race with a prior soft-delete; retry once.
    if (!masterResult.data) {
      await composer.ensureDefaults(story.organization_id, input.userId);
      masterResult = await findMasterTemplateByCode(
        client,
        story.organization_id,
        masterCode,
      );
    }

    if (!masterResult.data) {
      return fail(masterResult.error ?? "Master Template not found");
    }
    master = masterResult.data;
    masterCode = getScenePackageCode(master) ?? masterCode;
  }
  const packageTemplateCode = masterCode.trim();

  const existing = await getStoryPackageByStoryId(client, input.storyId);
  if (existing.error) return fail(existing.error);

  let pkg = existing.data?.package ?? null;
  const previousHistory = Array.isArray(pkg?.history) ? pkg!.history : [];

  if (!pkg) {
    const { data: created, error: createError } = await db
      .from("story_packages")
      .insert({
        organization_id: story.organization_id,
        story_id: story.id,
        title: `${story.title} · Scene Package`,
        status: "building",
        master_template_id: master.id,
        master_template_code: packageTemplateCode || null,
        created_by: input.userId,
        updated_by: input.userId,
        history: [
          historyEntry("created", input.userId, { master_template_code: masterCode }),
        ],
        ai_metadata: {
          pipeline: "story-scene-builder",
          step: 2,
        },
      })
      .select("*")
      .single();

    if (createError || !created) {
      return fail(createError?.message ?? "Failed to create story package");
    }
    pkg = asPackage(created);
  } else {
    await db
      .from("story_packages")
      .update({
        status: "building",
        error: null,
        master_template_id: master.id,
        master_template_code: packageTemplateCode || null,
        updated_by: input.userId,
      })
      .eq("id", pkg.id);

    const cleared = await clearPackageContents(client, pkg.id, input.userId);
    if (cleared) return fail(cleared);
  }

  try {
    const analyzed = analyzeApprovedScript({
      title: story.title,
      summary: story.summary,
      approvedScript,
      subHeadlineMedia: story.sub_headline_media,
    });

    const voiceDurationMs =
      story.voice_duration_ms && story.voice_duration_ms > 0
        ? story.voice_duration_ms
        : estimateDurationFromWords(approvedScript);

    const timed = segmentVoiceTiming(analyzed, voiceDurationMs);
    const createdSceneIds: string[] = [];
    const voiceSegments: StoryVoiceSegmentRow[] = [];
    const scenes: StorySceneInstanceRow[] = [];
    const masterChrome = extractMasterChromeAssets(master);
    const advertisementRef = resolveAdvertisementRef(
      story as unknown as Record<string, unknown>,
    );

    for (const panel of timed) {
      const instanceFields = panelToInstanceFields({
        panelSubheadline: panel.subheadline,
        mediaCaption: panel.mediaCaption,
        bodyText: panel.bodyText,
        mediaKind: panel.mediaKind,
        mediaRef: panel.mediaRef,
        chrome: masterChrome,
        advertisementRef,
        storyHeadline: panel.storyHeadline,
      });

      const { data: voiceRow, error: voiceError } = await db
        .from("story_voice_segments")
        .insert({
          organization_id: story.organization_id,
          story_id: story.id,
          package_id: pkg.id,
          sort_order: panel.index,
          label: panel.label,
          text: panel.text,
          start_ms: panel.startMs,
          end_ms: panel.endMs,
          duration_ms: panel.durationMs,
          // On-screen headline context for this panel (not Story Headline)
          headline: instanceFields.headline,
          subheadline: instanceFields.subheadline,
          body_text: panel.bodyText,
          media_kind: panel.mediaKind,
          media_ref: panel.mediaRef,
          media_caption: panel.mediaCaption,
          metadata: {
            weight: panel.weight,
            story_headline: panel.storyHeadline,
            voice_url: story.voice_url,
            voice_storage_path: story.voice_storage_path,
            binding_model: "story-panel-v1",
          },
        })
        .select("*")
        .single();

      if (voiceError || !voiceRow) {
        throw new Error(voiceError?.message ?? "Failed to store voice segment");
      }

      const voiceSegment = voiceRow as StoryVoiceSegmentRow;
      voiceSegments.push(voiceSegment);

      const bindings = buildPanelSceneBindings({
        storyHeadline: panel.storyHeadline,
        panelSubheadline: panel.subheadline,
        bodyText: panel.bodyText,
        mediaKind: panel.mediaKind,
        mediaRef: panel.mediaRef,
        mediaCaption: panel.mediaCaption,
        voiceUrl: story.voice_url,
        chrome: masterChrome,
        advertisementRef,
        panelIndex: panel.index,
      });

      const storyData = panelToStoryData({
        storyHeadline: panel.storyHeadline,
        panelSubheadline: panel.subheadline,
        bodyText: panel.bodyText,
        mediaKind: panel.mediaKind,
        mediaRef: panel.mediaRef,
        mediaCaption: panel.mediaCaption,
        voiceUrl: story.voice_url,
        chrome: masterChrome,
        advertisementRef,
        panelIndex: panel.index,
      });

      const clone = await instantiateSceneFromMaster(client, {
        master,
        userId: input.userId,
        name: `${panel.subheadline || panel.label} · ${panel.label}`,
        durationMs: panel.durationMs,
        resolvedBindings: bindings,
        storyData,
        storyId: story.id,
        packageId: pkg.id,
        segmentIndex: panel.index,
        storyHeadline: panel.storyHeadline,
      });

      if (!clone.data) {
        throw new Error(clone.error ?? "Scene instantiate failed");
      }

      createdSceneIds.push(clone.data.id);

      const animations =
        (clone.data.scene_document as { animations?: unknown[] } | undefined)
          ?.animations ?? [];

      const { data: instanceRow, error: instanceError } = await db
        .from("story_scene_instances")
        .insert({
          organization_id: story.organization_id,
          package_id: pkg.id,
          story_id: story.id,
          master_template_id: master.id,
          scene_id: clone.data.id,
          voice_segment_id: voiceSegment.id,
          sort_order: panel.index,
          timeline_order: panel.index,
          name: panel.label,
          status: "ready",
          duration_ms: panel.durationMs,
          headline: instanceFields.headline,
          subheadline: instanceFields.subheadline,
          body_text: instanceFields.body_text,
          video_asset_ref: instanceFields.video_asset_ref,
          image_asset_ref: instanceFields.image_asset_ref,
          logo_ref: instanceFields.logo_ref,
          advertisement_ref: instanceFields.advertisement_ref,
          animations,
          // Behaviors stay Master Template defaults (cloned in scene_document)
          behaviors: [],
          metadata: {
            master_template_code: packageTemplateCode || master.name,
            voice_start_ms: panel.startMs,
            voice_end_ms: panel.endMs,
            ...instanceFields.metadataExtras,
          },
          created_by: input.userId,
          updated_by: input.userId,
        })
        .select("*")
        .single();

      if (instanceError || !instanceRow) {
        throw new Error(instanceError?.message ?? "Failed to store scene instance");
      }

      scenes.push(instanceRow as StorySceneInstanceRow);
    }

    const totalDurationMs = timed.reduce((sum, s) => sum + s.durationMs, 0);
    const nextHistory = [
      ...previousHistory,
      historyEntry("built", input.userId, {
        scene_count: scenes.length,
        master_template_code: packageTemplateCode || master.name,
        voice_duration_ms: voiceDurationMs,
        voice_status: story.voice_status,
      }),
    ];

    const { data: updatedPkg, error: updateError } = await db
      .from("story_packages")
      .update({
        status: "ready",
        scene_count: scenes.length,
        total_duration_ms: totalDurationMs,
        voice_duration_ms: voiceDurationMs,
        built_at: new Date().toISOString(),
        built_by: input.userId,
        updated_by: input.userId,
        error: null,
        history: nextHistory,
        ai_metadata: {
          pipeline: "story-scene-builder",
          step: 2,
          segment_count: scenes.length,
          master_template_id: master.id,
          master_template_code: packageTemplateCode || master.name,
          analyzed_at: new Date().toISOString(),
          voice_status: story.voice_status,
          binding_model: "story-panel-v1",
          story_headline: story.title,
        },
      })
      .eq("id", pkg.id)
      .select("*")
      .single();

    if (updateError || !updatedPkg) {
      throw new Error(updateError?.message ?? "Failed to finalize package");
    }

    return ok({
      package: asPackage(updatedPkg),
      voiceSegments,
      scenes,
      createdSceneIds,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scene build failed";
    await db
      .from("story_packages")
      .update({
        status: "failed",
        error: message,
        updated_by: input.userId,
        history: [
          ...previousHistory,
          historyEntry("failed", input.userId, { error: message }),
        ],
      })
      .eq("id", pkg.id);

    return fail(message);
  }
}

type SyncPanelsResult = {
  updatedSceneIds: string[];
  package: StoryPackageRow | null;
};

async function loadStoryPanelsForSync(client: Client, storyId: string) {
  const { data: story, error } = await client
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !story) {
    return { story: null, panels: [], error: error?.message ?? "Story not found" };
  }

  const approvedScript = (story.approved_script ?? "").trim();
  if (!approvedScript) {
    return {
      story,
      panels: [],
      error: "Approve the story script before syncing scenes.",
    };
  }

  const panels = analyzeApprovedScript({
    title: story.title,
    summary: story.summary,
    approvedScript,
    subHeadlineMedia: story.sub_headline_media,
  });

  return { story, panels, error: null as string | null };
}

async function applyPanelToSceneInstance(
  client: Client,
  input: {
    userId: string;
    story: {
      id: string;
      title: string;
      organization_id: string;
      voice_url: string | null;
    };
    instance: StorySceneInstanceRow;
    panel: {
      index: number;
      label: string;
      text: string;
      storyHeadline: string;
      subheadline: string;
      bodyText: string;
      mediaKind: "" | "image" | "video" | "caption";
      mediaRef: string;
      mediaCaption: string;
    };
    /** Master chrome defaults; instance Composer overrides are preserved over these. */
    masterChrome: MasterChromeAssets;
    advertisementRef: string;
  },
): Promise<string | null> {
  const db = storySceneBuilderDb(client);
  const { instance, panel, story, masterChrome, advertisementRef, userId } =
    input;

  const { data: sceneRow, error: sceneLoadError } = await db
    .from("creative_studio_motion_scenes")
    .select("id, metadata, resolved_bindings, duration_ms")
    .eq("id", instance.scene_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (sceneLoadError || !sceneRow) {
    return sceneLoadError?.message ?? "Scene clone not found";
  }

  const prevMeta =
    ((sceneRow as { metadata?: Record<string, unknown> }).metadata as
      | Record<string, unknown>
      | undefined) ?? {};
  const prevBindings =
    ((sceneRow as { resolved_bindings?: Record<string, string> })
      .resolved_bindings as Record<string, string> | undefined) ?? {};
  const prevStoryData =
    prevMeta.story_data && typeof prevMeta.story_data === "object"
      ? (prevMeta.story_data as Record<string, unknown>)
      : null;

  // Keep Composer overrides for logo / Optional Info; fill gaps from master.
  const chrome = mergeChromeAssets(masterChrome, prevBindings, prevStoryData);

  const bindings = buildPanelSceneBindings({
    storyHeadline: panel.storyHeadline,
    panelSubheadline: panel.subheadline,
    bodyText: panel.bodyText,
    mediaKind: panel.mediaKind,
    mediaRef: panel.mediaRef,
    mediaCaption: panel.mediaCaption,
    voiceUrl: story.voice_url,
    chrome,
    advertisementRef,
    panelIndex: panel.index,
  });

  const storyData = panelToStoryData({
    storyHeadline: panel.storyHeadline,
    panelSubheadline: panel.subheadline,
    bodyText: panel.bodyText,
    mediaKind: panel.mediaKind,
    mediaRef: panel.mediaRef,
    mediaCaption: panel.mediaCaption,
    voiceUrl: story.voice_url,
    chrome,
    advertisementRef,
    panelIndex: panel.index,
  });

  const fields = panelToInstanceFields({
    panelSubheadline: panel.subheadline,
    mediaCaption: panel.mediaCaption,
    bodyText: panel.bodyText,
    mediaKind: panel.mediaKind,
    mediaRef: panel.mediaRef,
    chrome,
    advertisementRef,
    storyHeadline: panel.storyHeadline,
  });

  const { error: sceneUpdateError } = await db
    .from("creative_studio_motion_scenes")
    .update({
      resolved_bindings: bindings,
      name: `${panel.subheadline || panel.label} · ${panel.label}`,
      metadata: {
        ...prevMeta,
        ...fields.metadataExtras,
        is_story_instance: true,
        story_id: story.id,
        segment_index: panel.index,
        story_data: storyData,
        story_data_version: "1.0",
        story_engine_version: "3.7",
        synced_from_panels_at: new Date().toISOString(),
      },
      updated_by: userId,
    })
    .eq("id", instance.scene_id)
    .eq("is_template", false);

  if (sceneUpdateError) return sceneUpdateError.message;

  const { error: instanceUpdateError } = await db
    .from("story_scene_instances")
    .update({
      name: panel.label,
      headline: fields.headline,
      subheadline: fields.subheadline,
      body_text: fields.body_text,
      video_asset_ref: fields.video_asset_ref,
      image_asset_ref: fields.image_asset_ref,
      logo_ref: fields.logo_ref,
      advertisement_ref: fields.advertisement_ref,
      metadata: {
        ...(instance.metadata ?? {}),
        ...fields.metadataExtras,
        synced_from_panels_at: new Date().toISOString(),
      },
      updated_by: userId,
      status: "ready",
    })
    .eq("id", instance.id)
    .is("deleted_at", null);

  if (instanceUpdateError) return instanceUpdateError.message;

  // Keep voice segment media refs in sync for this panel order.
  if (instance.voice_segment_id) {
    await db
      .from("story_voice_segments")
      .update({
        headline: fields.headline,
        subheadline: fields.subheadline,
        body_text: panel.bodyText,
        media_kind: panel.mediaKind,
        media_ref: panel.mediaRef,
        media_caption: panel.mediaCaption,
        text: panel.text || panel.bodyText,
      })
      .eq("id", instance.voice_segment_id);
  }

  return null;
}

/**
 * Push current Story Panel subheadlines + media into existing Scene Instances
 * without destroying clones (in-place binding refresh).
 */
export async function syncStoryPackageFromPanels(
  client: Client,
  input: { storyId: string; userId: string },
): Promise<Result<SyncPanelsResult>> {
  const loaded = await loadStoryPanelsForSync(client, input.storyId);
  if (loaded.error || !loaded.story) {
    return fail(loaded.error ?? "Story not found");
  }
  if (loaded.panels.length === 0) {
    return fail("No story panels found to sync.");
  }

  const bundle = await getStoryPackageByStoryId(client, input.storyId);
  if (bundle.error) return fail(bundle.error);
  if (!bundle.data || bundle.data.scenes.length === 0) {
    return fail("No Scene Collection yet. Build scenes first.");
  }

  const chromeByTemplateId = new Map<string, MasterChromeAssets>();
  const advertisementRef = resolveAdvertisementRef(
    loaded.story as unknown as Record<string, unknown>,
  );

  const updatedSceneIds: string[] = [];

  for (const instance of bundle.data.scenes) {
    const panel =
      loaded.panels.find((p) => p.index === instance.sort_order) ??
      loaded.panels[instance.sort_order] ??
      null;
    if (!panel) continue;

    const templateId = instance.master_template_id?.trim() ?? "";
    if (!chromeByTemplateId.has(templateId)) {
      chromeByTemplateId.set(
        templateId,
        templateId
          ? await loadMasterChromeAssets(client, templateId)
          : extractMasterChromeAssets({}),
      );
    }
    const masterChrome =
      chromeByTemplateId.get(templateId) ?? extractMasterChromeAssets({});

    const err = await applyPanelToSceneInstance(client, {
      userId: input.userId,
      story: loaded.story,
      instance,
      panel,
      masterChrome,
      advertisementRef,
    });
    if (err) return fail(err);
    updatedSceneIds.push(instance.scene_id);
  }

  const db = storySceneBuilderDb(client);
  const history = Array.isArray(bundle.data.package.history)
    ? bundle.data.package.history
    : [];
  const { data: updatedPkg } = await db
    .from("story_packages")
    .update({
      updated_by: input.userId,
      history: [
        ...history,
        historyEntry("synced_panels", input.userId, {
          updated_count: updatedSceneIds.length,
        }),
      ],
      ai_metadata: {
        ...(bundle.data.package.ai_metadata ?? {}),
        last_panel_sync_at: new Date().toISOString(),
      },
    })
    .eq("id", bundle.data.package.id)
    .select("*")
    .single();

  return ok({
    updatedSceneIds,
    package: updatedPkg ? asPackage(updatedPkg) : bundle.data.package,
  });
}

/**
 * Sync a single Scene Instance from its story panel (used when opening Composer).
 */
export async function syncStorySceneInstanceFromPanels(
  client: Client,
  input: { sceneId: string; userId: string },
): Promise<Result<{ sceneId: string }>> {
  const db = storySceneBuilderDb(client);

  const { data: instance, error: instanceError } = await db
    .from("story_scene_instances")
    .select("*")
    .eq("scene_id", input.sceneId)
    .is("deleted_at", null)
    .maybeSingle();

  if (instanceError) return fail(instanceError.message);
  if (!instance) {
    // Not a story instance — nothing to sync.
    return ok({ sceneId: input.sceneId });
  }

  const row = instance as StorySceneInstanceRow;
  const loaded = await loadStoryPanelsForSync(client, row.story_id);
  if (loaded.error || !loaded.story) {
    return fail(loaded.error ?? "Story not found");
  }

  const panel =
    loaded.panels.find((p) => p.index === row.sort_order) ??
    loaded.panels[row.sort_order] ??
    null;
  if (!panel) {
    return fail("Matching story panel not found for this scene.");
  }

  const masterChrome = await loadMasterChromeAssets(
    client,
    row.master_template_id,
  );
  const advertisementRef = resolveAdvertisementRef(
    loaded.story as unknown as Record<string, unknown>,
  );

  const err = await applyPanelToSceneInstance(client, {
    userId: input.userId,
    story: loaded.story,
    instance: row,
    panel,
    masterChrome,
    advertisementRef,
  });
  if (err) return fail(err);

  return ok({ sceneId: input.sceneId });
}

/** Re-link one story scene instance to a different library master template. */
export async function relinkStorySceneInstanceTemplate(
  client: Client,
  input: {
    sceneInstanceId: string;
    masterTemplateId: string;
    userId: string;
  },
): Promise<Result<{ instance: StorySceneInstanceRow; sceneId: string }>> {
  const db = storySceneBuilderDb(client);

  const { data: instance, error: instanceError } = await db
    .from("story_scene_instances")
    .select("*")
    .eq("id", input.sceneInstanceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (instanceError) return fail(instanceError.message);
  if (!instance) return fail("Scene instance not found");

  const row = instance as StorySceneInstanceRow;
  if (row.master_template_id === input.masterTemplateId) {
    return ok({ instance: row, sceneId: row.scene_id });
  }

  const { data: currentScene, error: sceneError } = await db
    .from("creative_studio_motion_scenes")
    .select("resolved_bindings, metadata")
    .eq("id", row.scene_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (sceneError) return fail(sceneError.message);
  if (!currentScene) return fail("Current scene clone not found");

  const masterResult = await findMasterTemplateById(
    client,
    row.organization_id,
    input.masterTemplateId,
  );
  if (!masterResult.data) {
    return fail(masterResult.error ?? "Template not found");
  }

  const master = masterResult.data;
  const masterCode = getScenePackageCode(master) ?? "";
  const resolvedBindings =
    (currentScene as { resolved_bindings?: Record<string, string> })
      .resolved_bindings ?? {};
  const sceneMeta = (currentScene as { metadata?: Record<string, unknown> })
    .metadata;
  const storyData = (sceneMeta?.story_data ?? {}) as StoryDataRecord;

  const clone = await instantiateSceneFromMaster(client, {
    master,
    userId: input.userId,
    name: row.headline || row.name,
    durationMs: row.duration_ms,
    resolvedBindings,
    storyData,
    storyId: row.story_id,
    packageId: row.package_id,
    segmentIndex: row.sort_order,
    storyHeadline:
      typeof row.metadata?.story_headline === "string"
        ? row.metadata.story_headline
        : row.headline,
  });

  if (!clone.data) {
    return fail(clone.error ?? "Failed to clone template");
  }

  const { data: updated, error: updateError } = await db
    .from("story_scene_instances")
    .update({
      master_template_id: master.id,
      scene_id: clone.data.id,
      updated_by: input.userId,
      metadata: {
        ...row.metadata,
        master_template_code: masterCode || master.name,
        relinked_from_scene_id: row.scene_id,
        relinked_at: new Date().toISOString(),
      },
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return fail(updateError?.message ?? "Failed to update scene instance");
  }

  await db
    .from("creative_studio_motion_scenes")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: input.userId,
    })
    .eq("id", row.scene_id);

  const synced = await syncStorySceneInstanceFromPanels(client, {
    sceneId: clone.data.id,
    userId: input.userId,
  });
  if (!synced.data) {
    return fail(synced.error ?? "Template linked but sync failed");
  }

  return ok({
    instance: updated as StorySceneInstanceRow,
    sceneId: clone.data.id,
  });
}
