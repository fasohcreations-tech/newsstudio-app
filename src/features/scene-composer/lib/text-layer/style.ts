import type { CSSProperties } from "react";

import type { SceneObject } from "@/features/scene-composer/types/scene-composer.types";
import {
  resolveStoryMalayalamFont,
  storyMalayalamFontFamilyCss,
  STORY_MALAYALAM_FONT_OPTIONS,
} from "@/features/story-production/constants/story-font-options";
import type {
  TextGlowStyle,
  TextGradientStyle,
  TextLayerAlign,
  TextLayerStyle,
  TextLayerVAlign,
  TextPaddingStyle,
  TextShadowStyle,
  TextStrokeStyle,
} from "@/features/scene-composer/lib/text-layer/types";

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1) return true;
  if (value === "false" || value === 0) return false;
  return fallback;
}

function readPadding(style: Record<string, unknown>): TextPaddingStyle {
  const raw = style.padding;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const p = raw as Record<string, unknown>;
    return {
      top: asNumber(p.top, 8),
      right: asNumber(p.right, 12),
      bottom: asNumber(p.bottom, 8),
      left: asNumber(p.left, 12),
    };
  }
  const uniform = asNumber(raw, NaN);
  if (Number.isFinite(uniform)) {
    return { top: uniform, right: uniform, bottom: uniform, left: uniform };
  }
  return { top: 8, right: 12, bottom: 8, left: 12 };
}

function readStroke(style: Record<string, unknown>): TextStrokeStyle | null {
  const raw = style.text_stroke ?? style.stroke;
  if (!raw || typeof raw !== "object") {
    const width = asNumber(style.text_stroke_width ?? style.stroke_width, 0);
    const color = asString(style.text_stroke_color ?? style.stroke_color, "");
    if (width <= 0 || !color) return null;
    return { color, width };
  }
  const s = raw as Record<string, unknown>;
  const width = asNumber(s.width, 0);
  if (width <= 0) return null;
  return { color: asString(s.color, "#000000"), width };
}

function readShadow(style: Record<string, unknown>): TextShadowStyle | null {
  const raw = style.text_shadow ?? style.shadow;
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  return {
    color: asString(s.color, "rgba(0,0,0,0.55)"),
    blur: asNumber(s.blur, 4),
    offsetX: asNumber(s.offsetX ?? s.offset_x, 0),
    offsetY: asNumber(s.offsetY ?? s.offset_y, 2),
  };
}

function readGlow(style: Record<string, unknown>): TextGlowStyle | null {
  const raw = style.text_glow ?? style.glow;
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  return {
    color: asString(s.color, "#60A5FA"),
    blur: asNumber(s.blur, 12),
    strength: asNumber(s.strength, 1),
  };
}

function readGradient(style: Record<string, unknown>): TextGradientStyle | null {
  const raw = style.text_gradient ?? style.gradient;
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const stops = Array.isArray(g.stops)
    ? g.stops
        .map((stop) => {
          if (!stop || typeof stop !== "object") return null;
          const s = stop as Record<string, unknown>;
          return {
            offset: asNumber(s.offset, 0),
            color: asString(s.color, "#ffffff"),
          };
        })
        .filter((s): s is { offset: number; color: string } => Boolean(s))
    : [];
  if (stops.length < 2) return null;
  return {
    type: g.type === "radial" ? "radial" : "linear",
    angle: asNumber(g.angle, 180),
    stops,
  };
}

function resolveAlign(value: unknown): TextLayerAlign {
  if (value === "center" || value === "right" || value === "justify") return value;
  return "left";
}

function resolveVAlign(value: unknown): TextLayerVAlign {
  if (value === "top" || value === "bottom") return value;
  return "middle";
}

/**
 * Resolve per-object font. Falls back to story Malayalam font when the layer
 * has no explicit family (broadcast templates share the story font).
 */
export function resolveTextLayerFontFamily(
  object: SceneObject,
  bindings: Record<string, string>,
): string {
  const raw = asString(object.style?.font_family, "");
  if (raw) {
    const byValue = STORY_MALAYALAM_FONT_OPTIONS.find((o) => o.value === raw);
    if (byValue) return storyMalayalamFontFamilyCss(byValue.family);
    const byFamily = STORY_MALAYALAM_FONT_OPTIONS.find((o) => o.family === raw);
    if (byFamily) return storyMalayalamFontFamilyCss(byFamily.family);
    return storyMalayalamFontFamilyCss(raw);
  }
  const story = resolveStoryMalayalamFont(bindings);
  return storyMalayalamFontFamilyCss(story.family);
}

/** Normalize SceneObject.style into a complete TextLayerStyle. */
export function resolveTextLayerStyle(
  object: SceneObject,
  bindings: Record<string, string> = {},
  defaults?: { fontSize?: number; fontWeight?: number; color?: string },
): TextLayerStyle {
  const style = (object.style ?? {}) as Record<string, unknown>;
  const region =
    typeof object.metadata?.region_key === "string"
      ? object.metadata.region_key
      : "";
  const isHeadline = region === "headline" || /headline/i.test(object.name);
  const isSubheadline =
    region === "subheadline" || /subheadline/i.test(object.name);
  const isTicker = object.object_type === "ticker" || region === "ticker";

  const defaultSize =
    defaults?.fontSize ??
    (isHeadline ? 48 : isSubheadline ? 28 : isTicker ? 22 : 24);
  const defaultWeight =
    defaults?.fontWeight ?? (isHeadline ? 800 : isTicker ? 600 : 700);

  const italic =
    asBool(style.italic) ||
    asString(style.font_style, "") === "italic" ||
    asString(style.fontStyle, "") === "italic";

  const autoWrap = asBool(style.auto_wrap, asBool(style.wrap, !isTicker));
  const autoResize = asBool(style.auto_resize, false);
  const autoWidth = asBool(style.auto_width, autoResize && !autoWrap);
  const autoHeight = asBool(style.auto_height, autoResize);

  const storyFont = resolveStoryMalayalamFont(bindings);
  const fontFamily = asString(style.font_family, storyFont.family);

  return {
    font_family: fontFamily,
    font_size: asNumber(style.font_size ?? style.fontSize, defaultSize),
    font_weight: asNumber(style.font_weight ?? style.fontWeight, defaultWeight),
    italic,
    underline: asBool(style.underline),
    letter_spacing: asNumber(style.letter_spacing ?? style.letterSpacing, 0),
    line_height: asNumber(style.line_height ?? style.lineHeight, 1.35),
    alignment: resolveAlign(style.alignment ?? style.textAlign),
    vertical_alignment: resolveVAlign(style.vertical_alignment),
    padding: readPadding(style),
    color: asString(
      style.color,
      defaults?.color ?? (isTicker ? "#ffffff" : "#FFFFFF"),
    ),
    opacity: asNumber(
      style.text_opacity ?? object.transform?.opacity ?? 1,
      1,
    ),
    stroke: readStroke(style),
    shadow: readShadow(style),
    glow: readGlow(style),
    gradient: readGradient(style),
    auto_width: autoWidth,
    auto_height: autoHeight,
    auto_wrap: autoWrap,
    auto_resize: autoResize,
    unicode_script: asString(style.unicode_script, "malayalam"),
    input_mode:
      style.input_mode === "manglish" || style.input_mode === "voice"
        ? style.input_mode
        : "unicode",
    fill: asBool(style.text_background)
      ? asString(style.fill, "transparent")
      : "transparent",
  };
}

function textShadowCss(
  shadow: TextShadowStyle | null,
  glow: TextGlowStyle | null,
): string | undefined {
  const parts: string[] = [];
  if (shadow) {
    parts.push(
      `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}`,
    );
  }
  if (glow) {
    const strength = Math.max(1, Math.round(glow.strength));
    for (let i = 0; i < strength; i += 1) {
      parts.push(`0 0 ${glow.blur}px ${glow.color}`);
    }
  }
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function gradientCss(gradient: TextGradientStyle): string {
  const stops = gradient.stops
    .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
    .join(", ");
  if (gradient.type === "radial") {
    return `radial-gradient(circle, ${stops})`;
  }
  return `linear-gradient(${gradient.angle}deg, ${stops})`;
}

/**
 * DOM CSS for StoryLivePreview / canvas editor — shared with render intent.
 * Opacity lives on the layer shell (transform.opacity), not here — nesting
 * would square the fade.
 */
export function textLayerStyleToCss(
  textStyle: TextLayerStyle,
  fontFamilyCss: string,
  options?: { singleLine?: boolean },
): CSSProperties {
  const pad = textStyle.padding;
  const css: CSSProperties = {
    fontFamily: fontFamilyCss,
    fontSize: textStyle.font_size,
    fontWeight: textStyle.font_weight,
    fontStyle: textStyle.italic ? "italic" : "normal",
    textDecoration: textStyle.underline ? "underline" : "none",
    letterSpacing: `${textStyle.letter_spacing}px`,
    lineHeight: textStyle.line_height,
    textAlign: textStyle.alignment,
    color: textStyle.color,
    padding: `${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
    // Block layout so textAlign / justify / wrap apply to the glyphs.
    display: "block",
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    whiteSpace: options?.singleLine
      ? "nowrap"
      : textStyle.auto_wrap
        ? "pre-wrap"
        : "nowrap",
    wordBreak: textStyle.auto_wrap ? "break-word" : "normal",
    overflowWrap: textStyle.auto_wrap ? "anywhere" : undefined,
    overflow: "hidden",
    background:
      textStyle.fill && textStyle.fill !== "transparent"
        ? textStyle.fill
        : "transparent",
    textShadow: textShadowCss(textStyle.shadow, textStyle.glow),
    WebkitTextStroke: textStyle.stroke
      ? `${textStyle.stroke.width}px ${textStyle.stroke.color}`
      : undefined,
    // Unicode / Malayalam shaping
    unicodeBidi: "plaintext",
    direction: "ltr",
  };

  if (textStyle.gradient) {
    css.backgroundImage = gradientCss(textStyle.gradient);
    css.WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.WebkitTextFillColor = "transparent";
    css.color = "transparent";
  }

  return css;
}

/** Shell flex alignment for vertical_alignment (content node stays block). */
export function textLayerShellAlignCss(
  textStyle: TextLayerStyle,
): Pick<CSSProperties, "display" | "alignItems"> {
  return {
    display: "flex",
    alignItems:
      textStyle.vertical_alignment === "top"
        ? "flex-start"
        : textStyle.vertical_alignment === "bottom"
          ? "flex-end"
          : "center",
  };
}

/** Defaults written onto new independent text layers (LayerFactory / object-factory). */
export function defaultIndependentTextStyle(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    font_family: "Noto Sans Malayalam",
    font_size: 32,
    font_weight: 700,
    italic: false,
    underline: false,
    letter_spacing: 0,
    line_height: 1.35,
    alignment: "left",
    vertical_alignment: "middle",
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    color: "#FFFFFF",
    fill: "transparent",
    auto_width: false,
    auto_height: false,
    auto_wrap: true,
    auto_resize: false,
    unicode_script: "malayalam",
    input_mode: "unicode",
    text_stroke: null,
    text_shadow: null,
    text_glow: null,
    text_gradient: null,
    text_background: false,
    ...overrides,
  };
}
