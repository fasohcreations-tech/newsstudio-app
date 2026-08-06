/**
 * Feature 043 — attribute wiring verification (resolve → CSS → runtime fields).
 * Run: npx tsx src/features/scene-composer/lib/text-layer/verify-attributes.ts
 */

import {
  resolveTextLayerStyle,
  textLayerStyleToCss,
  textLayerShellAlignCss,
} from "./style";
import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function baseObject(style: Record<string, unknown>): SceneObject {
  return {
    id: "t1",
    name: "Headline",
    object_type: "text",
    sort_order: 0,
    start_ms: 0,
    end_ms: 5000,
    offset_ms: 0,
    visible: true,
    locked: false,
    layer_color: "#fff",
    transform: {
      x: 0,
      y: 0,
      width: 400,
      height: 80,
      scale: 1,
      rotation: 0,
      opacity: 0.75,
    },
    style,
    content: { text: "വാർത്ത" },
    bindings: { text: "{{headline}}" },
    metadata: { layer_kind: "headline", region_key: "headline" },
  };
}

const checks: Array<{ name: string; run: () => void }> = [
  {
    name: "Font Family / Size / Weight",
    run: () => {
      const style = resolveTextLayerStyle(
        baseObject({
          font_family: "noto-serif-malayalam-bold",
          font_size: 54,
          font_weight: 800,
        }),
      );
      assert(style.font_family === "noto-serif-malayalam-bold", "font_family");
      assert(style.font_size === 54, "font_size");
      assert(style.font_weight === 800, "font_weight");
      const css = textLayerStyleToCss(style, '"Noto Serif Malayalam"');
      assert(css.fontSize === 54, "css fontSize");
      assert(css.fontWeight === 800, "css fontWeight");
    },
  },
  {
    name: "Italic / Underline",
    run: () => {
      const style = resolveTextLayerStyle(
        baseObject({ italic: true, underline: true, font_style: "italic" }),
      );
      assert(style.italic, "italic");
      assert(style.underline, "underline");
      const css = textLayerStyleToCss(style, "sans-serif");
      assert(css.fontStyle === "italic", "css italic");
      assert(css.textDecoration === "underline", "css underline");
    },
  },
  {
    name: "Letter Spacing / Line Height",
    run: () => {
      const style = resolveTextLayerStyle(
        baseObject({ letter_spacing: 2.5, line_height: 1.6 }),
      );
      assert(style.letter_spacing === 2.5, "letter_spacing");
      assert(style.line_height === 1.6, "line_height");
      const css = textLayerStyleToCss(style, "sans-serif");
      assert(css.letterSpacing === "2.5px", "css letterSpacing px");
      assert(css.lineHeight === 1.6, "css lineHeight");
    },
  },
  {
    name: "Alignment / Vertical / Padding",
    run: () => {
      const style = resolveTextLayerStyle(
        baseObject({
          alignment: "justify",
          vertical_alignment: "bottom",
          padding: { top: 4, right: 10, bottom: 6, left: 8 },
        }),
      );
      assert(style.alignment === "justify", "alignment");
      assert(style.vertical_alignment === "bottom", "vertical");
      assert(style.padding.left === 8 && style.padding.top === 4, "padding");
      const css = textLayerStyleToCss(style, "sans-serif");
      assert(css.textAlign === "justify", "css textAlign");
      assert(css.padding === "4px 10px 6px 8px", "css padding");
      const shell = textLayerShellAlignCss(style);
      assert(shell.alignItems === "flex-end", "shell vertical");
    },
  },
  {
    name: "Color / Stroke / Shadow / Glow",
    run: () => {
      const style = resolveTextLayerStyle(
        baseObject({
          color: "#FFCC00",
          text_stroke: { color: "#000000", width: 2 },
          text_shadow: { color: "#111111", blur: 6, offsetX: 1, offsetY: 3 },
          text_glow: { color: "#60A5FA", blur: 14, strength: 2 },
        }),
      );
      assert(style.color === "#FFCC00", "color");
      assert(style.stroke?.width === 2, "stroke");
      assert(style.shadow?.blur === 6, "shadow");
      assert(style.glow?.strength === 2, "glow");
      const css = textLayerStyleToCss(style, "sans-serif");
      assert(css.color === "#FFCC00", "css color");
      assert(css.WebkitTextStroke === "2px #000000", "css stroke");
      assert(String(css.textShadow).includes("6px"), "css shadow");
      assert(String(css.textShadow).includes("#60A5FA"), "css glow");
    },
  },
  {
    name: "Opacity (transform, not doubled in CSS)",
    run: () => {
      const object = baseObject({});
      const style = resolveTextLayerStyle(object);
      assert(style.opacity === 0.75, "opacity from transform");
      const css = textLayerStyleToCss(style, "sans-serif");
      assert(css.opacity === undefined, "css must not set opacity");
    },
  },
  {
    name: "Gradient",
    run: () => {
      const style = resolveTextLayerStyle(
        baseObject({
          text_gradient: {
            type: "linear",
            angle: 90,
            stops: [
              { offset: 0, color: "#ffffff" },
              { offset: 1, color: "#38bdf8" },
            ],
          },
        }),
      );
      assert(style.gradient?.stops.length === 2, "gradient stops");
      const css = textLayerStyleToCss(style, "sans-serif");
      assert(css.WebkitBackgroundClip === "text", "css clip");
      assert(css.WebkitTextFillColor === "transparent", "css fill");
    },
  },
  {
    name: "Auto Width / Height / Wrap",
    run: () => {
      const style = resolveTextLayerStyle(
        baseObject({
          auto_width: true,
          auto_height: true,
          auto_wrap: false,
          wrap: false,
        }),
      );
      assert(style.auto_width, "auto_width");
      assert(style.auto_height, "auto_height");
      assert(!style.auto_wrap, "auto_wrap off");
      const css = textLayerStyleToCss(style, "sans-serif");
      assert(css.whiteSpace === "nowrap", "nowrap");
    },
  },
];

let failed = 0;
for (const check of checks) {
  try {
    check.run();
    console.log(`✓ ${check.name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${check.name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  console.error(`\n${failed} attribute check(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} attribute groups verified.`);
