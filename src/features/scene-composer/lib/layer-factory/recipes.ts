import { createSceneObject } from "@/features/scene-composer/lib/object-factory";
import { defaultIndependentTextStyle } from "@/features/scene-composer/lib/text-layer";
import {
  createDefaultShapeConfig,
  setShapeConfig,
} from "@/features/scene-composer/lib/shape-composer";
import { createDefaultReveal } from "@/features/scene-composer/lib/shape-composer/reveal";
import type { ShapeKind } from "@/features/scene-composer/lib/shape-composer/types";
import type {
  ObjectTransform,
  SceneObject,
} from "@/features/scene-composer/types/scene-composer.types";
import {
  LAYER_KIND_TO_OBJECT_TYPE,
  type LayerKind,
} from "@/features/scene-composer/lib/layer-factory/types";

export type LayerFactoryOptions = {
  durationMs?: number;
  sortOrder?: number;
  transform?: Partial<ObjectTransform>;
  artboard?: { width: number; height: number };
  /** Optional name override (defaults to the menu label). */
  name?: string;
};

type Recipe = {
  kind: LayerKind;
  label: string;
  build: (options: LayerFactoryOptions) => SceneObject;
};

function base(
  kind: LayerKind,
  label: string,
  options: LayerFactoryOptions,
  extras: {
    transform?: Partial<ObjectTransform>;
    content?: Record<string, unknown>;
    style?: Record<string, unknown>;
    bindings?: Record<string, string>;
    metadata?: Record<string, unknown>;
  } = {},
): SceneObject {
  const objectType = LAYER_KIND_TO_OBJECT_TYPE[kind];
  const object = createSceneObject({
    objectType,
    name: options.name ?? label,
    durationMs: options.durationMs,
    sortOrder: options.sortOrder,
    transform: { ...extras.transform, ...options.transform },
    content: extras.content,
  });

  return {
    ...object,
    style: extras.style ? { ...object.style, ...extras.style } : object.style,
    bindings: extras.bindings
      ? { ...object.bindings, ...extras.bindings }
      : object.bindings,
    content: extras.content
      ? { ...object.content, ...extras.content }
      : object.content,
    metadata: {
      ...object.metadata,
      layer_kind: kind,
      ...extras.metadata,
    },
  };
}

function textRecipe(
  kind: LayerKind,
  label: string,
  opts: {
    token: string;
    fontSize: number;
    width: number;
    height: number;
    region?: string;
    placeholder?: string;
    style?: Record<string, unknown>;
  },
): Recipe {
  return {
    kind,
    label,
    build: (options) =>
      base(kind, label, options, {
        transform: { width: opts.width, height: opts.height, x: 80, y: 80 },
        content: { text: opts.placeholder ?? `{{${opts.token}}}` },
        bindings: { text: `{{${opts.token}}}` },
        style: defaultIndependentTextStyle({
          font_size: opts.fontSize,
          font_weight: 700,
          color: "#FFFFFF",
          fill: "transparent",
          ...opts.style,
        }),
        metadata: opts.region
          ? { region_key: opts.region, role: kind }
          : { role: kind },
      }),
  };
}

function mediaRecipe(
  kind: LayerKind,
  label: string,
  bindingKey: string,
  size: { width: number; height: number },
): Recipe {
  return {
    kind,
    label,
    build: (options) =>
      base(kind, label, options, {
        transform: { ...size, x: 200, y: 160 },
        bindings: { src: `{{${bindingKey}}}` },
        content: { media_kind: kind },
        style: { fill: "rgba(15,23,42,0.55)", corner_radius: 4 },
        metadata: { role: kind, media_slot: bindingKey },
      }),
  };
}

function shapeRecipe(
  kind: LayerKind,
  label: string,
  size: { width: number; height: number },
  metadata: Record<string, unknown> = {},
): Recipe {
  return {
    kind,
    label,
    build: (options) => {
      const object = base(kind, label, options, {
        transform: { ...size, x: 160, y: 160 },
        metadata: { role: kind, ...metadata },
      });
      const shapeKind = layerKindToShapeKind(kind);
      return setShapeConfig(
        object,
        createDefaultShapeConfig(shapeKind, {
          enabled: true,
          reveal: createDefaultReveal({ enabled: false }),
          ...(kind === "triangle" ? { sides: 3 } : null),
          ...(kind === "polygon"
            ? { sides: Number(metadata.sides) || 6 }
            : null),
          ...(kind === "star"
            ? { starPoints: Number(metadata.points) || 5 }
            : null),
        }),
      );
    },
  };
}

function layerKindToShapeKind(kind: LayerKind): ShapeKind {
  switch (kind) {
    case "rounded_rectangle":
      return "rounded_rectangle";
    case "circle":
      return "circle";
    case "ellipse":
      return "ellipse";
    case "triangle":
      return "triangle";
    case "polygon":
      return "polygon";
    case "line":
      return "line";
    case "arrow":
      return "arrow";
    case "star":
      return "star";
    default:
      return "rectangle";
  }
}

/** Built-in recipes — LayerFactory.register() can override or extend. */
export const DEFAULT_LAYER_RECIPES: Recipe[] = [
  textRecipe("headline", "Headline", {
    token: "headline",
    fontSize: 48,
    width: 1100,
    height: 96,
    region: "headline",
  }),
  textRecipe("subheadline", "Subheadline", {
    token: "subheadline",
    fontSize: 28,
    width: 960,
    height: 64,
    region: "subheadline",
    style: { font_weight: 500 },
  }),
  textRecipe("paragraph", "Paragraph", {
    token: "summary",
    fontSize: 22,
    width: 720,
    height: 220,
    placeholder: "Paragraph text",
    style: { font_weight: 400, wrap: true, auto_wrap: true },
  }),
  textRecipe("rich_text", "Rich Text", {
    token: "summary",
    fontSize: 24,
    width: 720,
    height: 200,
    placeholder: "Rich text",
    style: { auto_wrap: true, wrap: true },
  }),
  textRecipe("bible_verse", "Bible Verse", {
    token: "bible_verse",
    fontSize: 26,
    width: 900,
    height: 140,
    placeholder: "{{bible_verse}}",
    style: { italic: true, font_style: "italic", font_weight: 500 },
  }),
  textRecipe("quote", "Quote", {
    token: "quote",
    fontSize: 30,
    width: 860,
    height: 160,
    placeholder: "{{quote}}",
    style: { italic: true, font_style: "italic" },
  }),
  {
    kind: "scrolling_text",
    label: "Scrolling Text",
    build: (options) =>
      base("scrolling_text", "Scrolling Text", options, {
        transform: { width: 1600, height: 56, x: 80, y: 980 },
        content: { text: "{{ticker}}" },
        bindings: { text: "{{ticker}}" },
        style: defaultIndependentTextStyle({
          font_size: 22,
          font_weight: 600,
          color: "#FFFFFF",
          fill: "rgba(15,23,42,0.92)",
          auto_wrap: false,
          wrap: false,
        }),
        metadata: { region_key: "ticker", role: "scrolling_text" },
      }),
  },

  mediaRecipe("image", "Image", "image", { width: 640, height: 360 }),
  mediaRecipe("video", "Video", "video", { width: 960, height: 540 }),
  mediaRecipe("audio", "Audio", "voice", { width: 320, height: 64 }),
  mediaRecipe("image_sequence", "Image Sequence", "image", {
    width: 640,
    height: 360,
  }),
  mediaRecipe("live_stream", "Live Stream", "video", {
    width: 960,
    height: 540,
  }),
  mediaRecipe("web_page", "Web Page", "image", { width: 800, height: 450 }),

  shapeRecipe("rectangle", "Rectangle", { width: 320, height: 180 }),
  shapeRecipe("rounded_rectangle", "Rounded Rectangle", {
    width: 320,
    height: 180,
  }),
  shapeRecipe("circle", "Circle", { width: 160, height: 160 }),
  shapeRecipe("ellipse", "Ellipse", { width: 240, height: 140 }),
  shapeRecipe("triangle", "Triangle", { width: 200, height: 180 }, {
    shape_variant: "triangle",
    sides: 3,
  }),
  shapeRecipe("polygon", "Polygon", { width: 200, height: 200 }, {
    shape_variant: "polygon",
    sides: 6,
  }),
  shapeRecipe("line", "Line", { width: 400, height: 4 }),
  shapeRecipe("arrow", "Arrow", { width: 400, height: 24 }, {
    shape_variant: "arrow",
  }),
  shapeRecipe("star", "Star", { width: 200, height: 200 }, {
    shape_variant: "star",
    points: 5,
  }),

  {
    kind: "svg",
    label: "SVG",
    build: (options) =>
      base("svg", "SVG", options, {
        transform: { width: 200, height: 200, x: 200, y: 200 },
        metadata: { role: "svg" },
      }),
  },
  {
    kind: "icon",
    label: "Icon",
    build: (options) =>
      base("icon", "Icon", options, {
        transform: { width: 64, height: 64, x: 200, y: 200 },
        metadata: { role: "icon" },
      }),
  },
  {
    kind: "logo",
    label: "Logo",
    build: (options) =>
      base("logo", "Logo", options, {
        transform: { width: 180, height: 180, x: 80, y: 80 },
        bindings: { src: "{{logo}}" },
        metadata: { region_key: "logo", role: "logo" },
      }),
  },

  {
    kind: "lower_third",
    label: "Lower Third",
    build: (options) => {
      const artW = options.artboard?.width ?? 1920;
      const artH = options.artboard?.height ?? 1080;
      return base("lower_third", "Lower Third", options, {
        transform: {
          width: Math.round(artW * 0.72),
          height: 96,
          x: 80,
          y: artH - 220,
        },
        content: { text: "{{headline}}" },
        bindings: { text: "{{headline}}" },
        style: {
          font_size: 36,
          font_weight: 700,
          color: "#0B1220",
          fill: "#FFFFFF",
          corner_radius: 0,
          vertical_alignment: "middle",
        },
        metadata: {
          region_key: "headline",
          role: "lower_third",
          component_slug: "lower-third",
        },
      });
    },
  },
  {
    kind: "clock",
    label: "Clock",
    build: (options) =>
      base("clock", "Clock", options, {
        transform: { width: 160, height: 48, x: 80, y: 40 },
        metadata: { role: "clock" },
      }),
  },
  {
    kind: "date",
    label: "Date",
    build: (options) =>
      base("date", "Date", options, {
        transform: { width: 200, height: 48, x: 260, y: 40 },
        metadata: { role: "date" },
      }),
  },
  {
    kind: "breaking_news_strap",
    label: "Breaking News Strap",
    build: (options) => {
      const artW = options.artboard?.width ?? 1920;
      return base("breaking_news_strap", "Breaking News Strap", options, {
        transform: { width: artW, height: 72, x: 0, y: 0 },
        content: { text: "BREAKING" },
        bindings: { text: "{{headline}}" },
        style: {
          font_size: 28,
          font_weight: 800,
          color: "#FFFFFF",
          fill: "#B91C1C",
          alignment: "left",
          vertical_alignment: "middle",
        },
        metadata: { role: "breaking_news_strap", region_key: "breaking" },
      });
    },
  },
  {
    kind: "ticker",
    label: "Ticker",
    build: (options) => {
      const artW = options.artboard?.width ?? 1920;
      const artH = options.artboard?.height ?? 1080;
      return base("ticker", "Ticker", options, {
        transform: { width: artW, height: 56, x: 0, y: artH - 56 },
        content: { text: "{{ticker}}" },
        bindings: { text: "{{ticker}}" },
        style: {
          font_size: 22,
          font_weight: 600,
          color: "#FFFFFF",
          fill: "#1D4ED8",
        },
        metadata: { region_key: "ticker", role: "ticker" },
      });
    },
  },
  textRecipe("reporter_box", "Reporter Box", {
    token: "reporter",
    fontSize: 20,
    width: 360,
    height: 72,
    region: "reporter",
    style: { fill: "rgba(15,23,42,0.85)", font_weight: 600 },
  }),
  textRecipe("location_box", "Location Box", {
    token: "location",
    fontSize: 18,
    width: 320,
    height: 56,
    region: "location",
    style: { fill: "rgba(15,23,42,0.85)", font_weight: 500 },
  }),
  {
    kind: "qr_code",
    label: "QR Code",
    build: (options) =>
      base("qr_code", "QR Code", options, {
        transform: { width: 128, height: 128, x: 80, y: 80 },
        metadata: { role: "qr_code" },
      }),
  },

  {
    kind: "group",
    label: "Group",
    build: (options) =>
      base("group", "Group", options, {
        transform: { width: 400, height: 300, x: 200, y: 200 },
        metadata: { role: "group" },
      }),
  },
  {
    kind: "folder",
    label: "Folder",
    build: (options) =>
      base("folder", "Folder", options, {
        transform: { width: 400, height: 300, x: 200, y: 200 },
        metadata: { role: "folder", container_kind: "folder" },
      }),
  },
  {
    kind: "mask",
    label: "Mask",
    build: (options) =>
      base("mask", "Mask", options, {
        transform: { width: 400, height: 300, x: 200, y: 200 },
        metadata: { role: "mask" },
      }),
  },
  {
    kind: "component",
    label: "Component",
    build: (options) =>
      base("component", "Component", options, {
        transform: { width: 400, height: 300, x: 200, y: 200 },
        metadata: { role: "component" },
      }),
  },
  {
    kind: "smart_container",
    label: "Smart Container",
    build: (options) =>
      base("smart_container", "Smart Container", options, {
        transform: { width: 640, height: 360, x: 200, y: 200 },
        content: {
          media_container: {
            slides: "",
            transitionStyle: "fade",
            intervalMs: 5000,
            transitionMs: 600,
            slideIndex: 0,
            fit: "contain",
            autoplay: true,
          },
        },
        metadata: { role: "smart_container", container_kind: "smart" },
      }),
  },

  {
    kind: "gradient",
    label: "Gradient",
    build: (options) => {
      const artW = options.artboard?.width ?? 1920;
      const artH = options.artboard?.height ?? 1080;
      return base("gradient", "Gradient", options, {
        transform: { width: artW, height: artH, x: 0, y: 0 },
        metadata: { role: "gradient", generator: "gradient" },
      });
    },
  },
  {
    kind: "noise",
    label: "Noise",
    build: (options) => {
      const artW = options.artboard?.width ?? 1920;
      const artH = options.artboard?.height ?? 1080;
      return base("noise", "Noise", options, {
        transform: { width: artW, height: artH, x: 0, y: 0 },
        style: { fill: "rgba(255,255,255,0.06)" },
        metadata: { role: "noise", generator: "noise" },
      });
    },
  },
  {
    kind: "background",
    label: "Background",
    build: (options) => {
      const artW = options.artboard?.width ?? 1920;
      const artH = options.artboard?.height ?? 1080;
      return base("background", "Background", options, {
        transform: { width: artW, height: artH, x: 0, y: 0 },
        style: { fill: "#071225" },
        content: {
          media_container: {
            slides: "",
            transitionStyle: "fade",
            intervalMs: 5000,
            transitionMs: 600,
            slideIndex: 0,
            fit: "contain",
            autoplay: true,
          },
        },
        metadata: {
          role: "background",
          layer: "background",
          generator: "background",
        },
      });
    },
  },
  {
    kind: "grid",
    label: "Grid",
    build: (options) => {
      const artW = options.artboard?.width ?? 1920;
      const artH = options.artboard?.height ?? 1080;
      return base("grid", "Grid", options, {
        transform: { width: artW, height: artH, x: 0, y: 0 },
        style: { fill: "transparent" },
        metadata: { role: "grid", generator: "grid", grid_size: 32 },
      });
    },
  },
  {
    kind: "pattern",
    label: "Pattern",
    build: (options) => {
      const artW = options.artboard?.width ?? 1920;
      const artH = options.artboard?.height ?? 1080;
      return base("pattern", "Pattern", options, {
        transform: { width: artW, height: artH, x: 0, y: 0 },
        metadata: { role: "pattern", generator: "pattern" },
      });
    },
  },
];
