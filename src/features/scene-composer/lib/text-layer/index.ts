export type {
  TextBindingOption,
  TextGlowStyle,
  TextGradientStyle,
  TextLayerAlign,
  TextLayerStyle,
  TextLayerVAlign,
  TextPaddingStyle,
  TextShadowStyle,
  TextStrokeStyle,
} from "@/features/scene-composer/lib/text-layer/types";

export {
  TEXT_LAYER_BINDING_KEYS,
  parseTextBindingToken,
  storyFieldForTextBinding,
} from "@/features/scene-composer/lib/text-layer/bindings";

export {
  defaultIndependentTextStyle,
  resolveTextLayerFontFamily,
  resolveTextLayerStyle,
  textLayerShellAlignCss,
  textLayerStyleToCss,
} from "@/features/scene-composer/lib/text-layer/style";
