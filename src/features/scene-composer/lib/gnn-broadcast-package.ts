import { createSceneObject, objectsToLayers } from "@/features/scene-composer/lib/object-factory";
import { buildGnn001SkeletonDocument } from "@/features/scene-composer/lib/gnn-001-full-news-story-skeleton";
import { buildAllResponsiveVariants } from "@/features/scene-composer/lib/responsive-layout";
import type {
  ComposerSceneDocument,
  SceneBinding,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import {
  GNN_BROADCAST_PACKAGE_ID,
  GNN_MASTER_SCENE_CODES,
  GNN_VARIABLES,
  type GnnMasterSceneDefinition,
  type GnnSceneDraft,
} from "@/features/scene-composer/constants/gnn-broadcast-package.constants";
import { GNN_001_SKELETON_VERSION } from "@/features/scene-composer/lib/gnn-001-full-news-story-skeleton";

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function buildCoreBindings(objects: SceneObject[]) {
  const textObject = objects.find((object) => object.object_type === "text");
  const objectId = textObject?.id ?? null;

  const bindings: SceneBinding[] = GNN_VARIABLES.map((key, index) => ({
    id: uid("bind"),
    object_id: objectId,
    variable_key: key,
    binding_source: "story",
    target_property: key === "logo" ? "content.logo" : "content.text",
    token: `{{${key}}}`,
    resolved_value: "",
    auto_update: true,
    metadata: {},
    sort_order: index,
  }));
  return bindings;
}

function buildCommonDocument(
  definition: GnnMasterSceneDefinition,
): ComposerSceneDocument {
  // GNN-001 is layout-skeleton only for this step (bordered placeholders).
  if (definition.code === "GNN-001") {
    return buildGnn001SkeletonDocument(definition.defaults.duration_ms);
  }

  const objects = definition.defaults.objects.map((item, index) =>
    createSceneObject({
      objectType: item.object_type,
      name: item.name,
      durationMs: definition.defaults.duration_ms,
      sortOrder: index,
      transform: {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      },
      content: item.text ? { text: item.text } : {},
    }),
  );

  if (definition.code !== "GNN-010") {
    objects.push(
      createSceneObject({
        objectType: "ticker",
        name: "Ticker",
        durationMs: definition.defaults.duration_ms,
        sortOrder: objects.length,
        transform: { x: 0, y: 1016, width: 1920, height: 64 },
        content: { text: "{{ticker}}" },
      }),
    );
  }

  const bindings = buildCoreBindings(objects);

  return {
    version: "2.0",
    objects,
    layers: objectsToLayers(objects),
    placeholders: [],
    variables: GNN_VARIABLES.map((key, index) => ({
      id: uid("var"),
      variable_key: key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      kind: "text",
      default_value: "",
      story_field: key,
      brand_field: null,
      auto_update: true,
      metadata: {},
      sort_order: index,
    })),
    animations: [],
    bindings,
    keyframes: [],
  };
}

export const GNN_MASTER_SCENES: GnnMasterSceneDefinition[] = [
  {
    code: "GNN-001",
    name: "GNN-001 Full News Story",
    scene_type: "story",
    description:
      "Full news story layout skeleton — bordered placeholder regions only (Module 3.5 step).",
    defaults: {
      duration_ms: 12000,
      // Geometry is owned by gnn-001-full-news-story-skeleton.ts
      objects: [],
    },
  },
  {
    code: "GNN-002",
    name: "GNN-002 Breaking News",
    scene_type: "breaking_news",
    description: "High-priority breaking layout with live urgency styling.",
    defaults: {
      duration_ms: 9000,
      objects: [
        { key: "bg", name: "Background Animation", object_type: "gradient", x: 0, y: 0, width: 1920, height: 1080 },
        { key: "video", name: "Video Placeholder", object_type: "video", x: 120, y: 170, width: 1240, height: 700 },
        { key: "breaking", name: "BREAKING Banner", object_type: "text", x: 120, y: 88, width: 620, height: 64, text: "BREAKING NEWS" },
        { key: "headline", name: "Headline", object_type: "text", x: 120, y: 886, width: 1280, height: 86, text: "{{headline}}" },
        { key: "live", name: "LIVE Badge", object_type: "text", x: 1412, y: 170, width: 180, height: 48, text: "LIVE" },
        { key: "logo", name: "Logo", object_type: "logo", x: 1728, y: 40, width: 140, height: 80 },
        { key: "clock", name: "Clock", object_type: "clock", x: 1580, y: 986, width: 144, height: 40, text: "{{time}}" },
      ],
    },
  },
  {
    code: "GNN-003",
    name: "GNN-003 Headlines",
    scene_type: "headline",
    description: "Headlines stack with numbering and icon placeholders.",
    defaults: {
      duration_ms: 10000,
      objects: [
        { key: "bg", name: "Animated Background", object_type: "gradient", x: 0, y: 0, width: 1920, height: 1080 },
        { key: "title", name: "Headline", object_type: "text", x: 88, y: 94, width: 760, height: 72, text: "{{headline}}" },
        { key: "list", name: "Headline List", object_type: "rich_text", x: 88, y: 220, width: 1520, height: 690, text: "1. {{headline}}\n2. {{subheadline}}\n3. {{summary}}" },
        { key: "icons", name: "Icons", object_type: "svg", x: 1618, y: 220, width: 180, height: 240 },
        { key: "logo", name: "Logo", object_type: "logo", x: 1728, y: 40, width: 140, height: 80 },
      ],
    },
  },
  {
    code: "GNN-004",
    name: "GNN-004 Live Reporter",
    scene_type: "reporter",
    description: "Split layout for live reporter and studio reference.",
    defaults: {
      duration_ms: 12000,
      objects: [
        { key: "reporter-video", name: "Reporter Video", object_type: "video", x: 80, y: 132, width: 1140, height: 720 },
        { key: "studio-video", name: "Studio Video", object_type: "video", x: 1248, y: 132, width: 592, height: 332 },
        { key: "reporter-name", name: "Reporter Name", object_type: "text", x: 80, y: 866, width: 420, height: 48, text: "{{reporter}}" },
        { key: "location", name: "Location", object_type: "text", x: 80, y: 912, width: 500, height: 42, text: "{{location}}" },
        { key: "live", name: "LIVE Indicator", object_type: "text", x: 1248, y: 478, width: 180, height: 42, text: "LIVE" },
        { key: "headline", name: "Headline", object_type: "text", x: 80, y: 958, width: 1220, height: 52, text: "{{headline}}" },
        { key: "clock", name: "Clock", object_type: "clock", x: 1580, y: 986, width: 144, height: 40, text: "{{time}}" },
      ],
    },
  },
  {
    code: "GNN-005",
    name: "GNN-005 Interview",
    scene_type: "guest",
    description: "Two-up interview view with anchor/guest labels.",
    defaults: {
      duration_ms: 11000,
      objects: [
        { key: "guest-video", name: "Guest Video", object_type: "video", x: 96, y: 160, width: 836, height: 620 },
        { key: "anchor-video", name: "Anchor Video", object_type: "video", x: 988, y: 160, width: 836, height: 620 },
        { key: "guest-name", name: "Guest Name", object_type: "text", x: 96, y: 792, width: 420, height: 44, text: "{{guest}}" },
        { key: "anchor-name", name: "Anchor Name", object_type: "text", x: 988, y: 792, width: 420, height: 44, text: "{{reporter}}" },
        { key: "designation", name: "Designation", object_type: "text", x: 96, y: 836, width: 620, height: 38, text: "{{designation}}" },
        { key: "headline", name: "Headline", object_type: "text", x: 96, y: 886, width: 1480, height: 64, text: "{{headline}}" },
        { key: "logo", name: "Logo", object_type: "logo", x: 1728, y: 40, width: 140, height: 80 },
      ],
    },
  },
  {
    code: "GNN-006",
    name: "GNN-006 Scripture",
    scene_type: "scripture",
    description: "Scripture card over cinematic background with soft motion.",
    defaults: {
      duration_ms: 13000,
      objects: [
        { key: "bg-video", name: "Background Video", object_type: "video", x: 0, y: 0, width: 1920, height: 1080 },
        { key: "glass", name: "Glass Panel", object_type: "rounded_rectangle", x: 190, y: 170, width: 1540, height: 740 },
        { key: "verse", name: "Bible Verse", object_type: "rich_text", x: 250, y: 250, width: 1420, height: 430, text: "{{verse}}" },
        { key: "reference", name: "Reference", object_type: "text", x: 250, y: 706, width: 720, height: 60, text: "{{reference}}" },
        { key: "logo", name: "Logo", object_type: "logo", x: 1728, y: 40, width: 140, height: 80 },
      ],
    },
  },
  {
    code: "GNN-007",
    name: "GNN-007 Quote Card",
    scene_type: "quote",
    description: "Quote card with portrait, source, and background accents.",
    defaults: {
      duration_ms: 9000,
      objects: [
        { key: "bg", name: "Background Animation", object_type: "gradient", x: 0, y: 0, width: 1920, height: 1080 },
        { key: "photo", name: "Photo", object_type: "image", x: 96, y: 144, width: 540, height: 720 },
        { key: "quote", name: "Quote", object_type: "rich_text", x: 680, y: 220, width: 1144, height: 420, text: "{{quote}}" },
        { key: "author", name: "Author", object_type: "text", x: 680, y: 672, width: 560, height: 52, text: "{{author}}" },
        { key: "organization", name: "Organization", object_type: "text", x: 680, y: 724, width: 700, height: 44, text: "{{organization}}" },
        { key: "logo", name: "Logo", object_type: "logo", x: 1728, y: 40, width: 140, height: 80 },
      ],
    },
  },
  {
    code: "GNN-008",
    name: "GNN-008 Statistics",
    scene_type: "statistics",
    description: "Data-driven frame with chart and number placeholders.",
    defaults: {
      duration_ms: 10000,
      objects: [
        { key: "headline", name: "Headline", object_type: "text", x: 96, y: 90, width: 900, height: 72, text: "{{headline}}" },
        { key: "summary", name: "Summary", object_type: "text", x: 96, y: 162, width: 1240, height: 52, text: "{{summary}}" },
        { key: "chart", name: "Charts Placeholder", object_type: "component", x: 96, y: 250, width: 1220, height: 620 },
        { key: "numbers", name: "Numbers", object_type: "counter", x: 1358, y: 250, width: 466, height: 320, text: "{{summary}}" },
        { key: "icons", name: "Icons", object_type: "svg", x: 1358, y: 584, width: 466, height: 286 },
        { key: "logo", name: "Logo", object_type: "logo", x: 1728, y: 40, width: 140, height: 80 },
      ],
    },
  },
  {
    code: "GNN-009",
    name: "GNN-009 Timeline",
    scene_type: "timeline",
    description: "Chronological event timeline with dates and highlights.",
    defaults: {
      duration_ms: 10000,
      objects: [
        { key: "headline", name: "Headline", object_type: "text", x: 96, y: 90, width: 900, height: 72, text: "{{headline}}" },
        { key: "summary", name: "Summary", object_type: "text", x: 96, y: 162, width: 1240, height: 52, text: "{{summary}}" },
        { key: "timeline", name: "Timeline", object_type: "component", x: 100, y: 280, width: 1720, height: 460 },
        { key: "events", name: "Events", object_type: "rich_text", x: 130, y: 300, width: 1650, height: 420, text: "{{date}} — {{summary}}" },
        { key: "icons", name: "Icons", object_type: "svg", x: 130, y: 760, width: 420, height: 120 },
      ],
    },
  },
  {
    code: "GNN-010",
    name: "GNN-010 Outro",
    scene_type: "outro",
    description: "Program outro with CTA, social links, and credits.",
    defaults: {
      duration_ms: 9000,
      objects: [
        { key: "bg", name: "Background", object_type: "gradient", x: 0, y: 0, width: 1920, height: 1080 },
        { key: "thank-you", name: "Thank You", object_type: "text", x: 600, y: 190, width: 720, height: 110, text: "നന്ദി" },
        { key: "subscribe", name: "Subscribe", object_type: "text", x: 660, y: 320, width: 600, height: 58, text: "Subscribe for updates" },
        { key: "qr", name: "QR Code", object_type: "qr_code", x: 860, y: 428, width: 200, height: 200, text: "{{reference}}" },
        { key: "website", name: "Website", object_type: "text", x: 690, y: 666, width: 540, height: 44, text: "{{reference}}" },
        { key: "social", name: "Social Media", object_type: "text", x: 700, y: 714, width: 520, height: 40, text: "{{organization}}" },
        { key: "credits", name: "Credits", object_type: "rich_text", x: 620, y: 774, width: 680, height: 140, text: "{{summary}}" },
        { key: "logo", name: "Logo", object_type: "logo", x: 890, y: 66, width: 140, height: 80 },
      ],
    },
  },
];

export function buildGnnBroadcastSceneDrafts(): GnnSceneDraft[] {
  return GNN_MASTER_SCENES.map((definition, index) => {
    const composer_document = buildCommonDocument(definition);
    const responsive_documents = buildAllResponsiveVariants(composer_document);

    return {
      scene_type: definition.scene_type,
      name: definition.name,
      description: definition.description,
      duration_ms: definition.defaults.duration_ms,
      composer_document,
      responsive_documents,
      metadata: {
        package_id: GNN_BROADCAST_PACKAGE_ID,
        package_version: "1.0.0",
        package_code: GNN_MASTER_SCENE_CODES[index],
        ai_ready: true,
        editable: true,
        ...(definition.code === "GNN-001"
          ? {
              layout_mode: "skeleton",
              layout_skeleton_version: GNN_001_SKELETON_VERSION,
            }
          : {}),
      },
    };
  });
}
