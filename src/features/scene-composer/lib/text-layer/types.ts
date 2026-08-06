/**
 * Feature 043 — Professional Text Layer style model.
 * Independent text object typography (not a rectangle with a label).
 */

export type TextLayerAlign = "left" | "center" | "right" | "justify";
export type TextLayerVAlign = "top" | "middle" | "bottom";

export type TextStrokeStyle = {
  color: string;
  width: number;
};

export type TextShadowStyle = {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
};

export type TextGlowStyle = {
  color: string;
  blur: number;
  strength: number;
};

export type TextGradientStyle = {
  type: "linear" | "radial";
  angle: number;
  stops: Array<{ offset: number; color: string }>;
};

export type TextPaddingStyle = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Normalized typography for preview + canvas V2 (same keys on SceneObject.style). */
export type TextLayerStyle = {
  font_family: string;
  font_size: number;
  font_weight: number;
  italic: boolean;
  underline: boolean;
  letter_spacing: number;
  line_height: number;
  alignment: TextLayerAlign;
  vertical_alignment: TextLayerVAlign;
  padding: TextPaddingStyle;
  color: string;
  opacity: number;
  stroke: TextStrokeStyle | null;
  shadow: TextShadowStyle | null;
  glow: TextGlowStyle | null;
  gradient: TextGradientStyle | null;
  auto_width: boolean;
  auto_height: boolean;
  /** Word-wrap inside the layer box (alias of legacy `wrap`). */
  auto_wrap: boolean;
  /** Legacy: when true, treated as auto_width || auto_height. */
  auto_resize: boolean;
  unicode_script: string;
  input_mode: "unicode" | "manglish" | "voice";
  /** Panel fill behind text — transparent for independent text layers. */
  fill: string;
};

export type TextBindingOption = {
  key: string;
  label: string;
  /** StoryDataRecord field updated when canvas-editing a bound layer. */
  storyField?: string;
};
