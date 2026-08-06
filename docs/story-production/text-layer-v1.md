# MediaOS Feature 043 — Professional Text Layer

**Branch:** `feature/design-workspace-v2`  
**Module:** `src/features/scene-composer/lib/text-layer/`

---

## Problem

Text in the designer was treated like a rectangle with a label. Typography was incomplete, canvas editing did not exist, and preview/render styling could drift.

## Solution

A **Text Layer** is an independent object with its own typography, bindings, and inline edit mode. Story Preview and Canvas V2 consume the **same** style resolution (`resolveTextLayerStyle` → DOM CSS / RuntimeLayer).

### Kinds (via LayerFactory)

Headline · Subheadline · Paragraph · Rich Text · Scrolling Text · Quote · Bible Verse

### Properties

Font Family · Font Size · Weight · Italic · Underline · Letter Spacing · Line Height · Alignment · Padding · Color · Stroke · Shadow · Glow · Opacity · Gradient · Auto Width · Auto Height · Auto Wrap

### Canvas editing

- Double-click a text layer → edit mode (`contentEditable`)
- ESC cancels; blur / Ctrl+Enter commits
- Malayalam / English / Unicode (`lang="ml"`, unicode plaintext)
- Bound layers update the story field so preview updates instantly

### Data binding

Text can bind to: Headline, Subheadline, Ticker, Story Summary, AI Output, Reporter, Location, Date, Time (+ Quote / Bible Verse).

Tokens live in `bindings.text` / `content.text` as `{{key}}`. Aliases `story`, `story_summary`, and `ai_output` resolve to `summary`.

### Shared pipeline

```
SceneObject.style
  → resolveTextLayerStyle()
  → StoryLivePreview (textLayerStyleToCss + TextLayerContent)
  → scene-to-runtime → drawTextLayer (Canvas V2)
```

### Attribute matrix (verified)

| Attribute | Inspector | Preview CSS | Canvas V2 |
|-----------|-----------|-------------|-----------|
| Font Family | ✓ | ✓ | ✓ |
| Font Size | ✓ | ✓ | ✓ |
| Weight | ✓ (+ synced from Malayalam font token) | ✓ | ✓ |
| Italic | ✓ | ✓ | ✓ |
| Underline | ✓ | ✓ | ✓ |
| Letter Spacing | ✓ | ✓ (`px`) | ✓ |
| Line Height | ✓ | ✓ | ✓ |
| Alignment | ✓ | ✓ | ✓ |
| Vertical align | ✓ | ✓ (shell flex) | ✓ |
| Padding | ✓ | ✓ | ✓ |
| Color | ✓ | ✓ | ✓ |
| Stroke | ✓ | ✓ | ✓ |
| Shadow | ✓ | ✓ | ✓ |
| Glow | ✓ | ✓ | ✓ |
| Opacity | ✓ (transform) | ✓ (shell only — not doubled) | ✓ |
| Gradient | ✓ | ✓ | ✓ |
| Auto Width / Height / Wrap | ✓ | ✓ | wrap ✓ |

Run: `npx tsx src/features/scene-composer/lib/text-layer/verify-attributes.ts`


```
src/features/scene-composer/lib/text-layer/
src/features/scene-composer/components/editor/text-layer-content.tsx
src/features/story-production/components/story-live-preview.tsx
src/features/scene-composer/components/editor/property-inspector-panel.tsx
src/features/video-render-export/lib/scene-to-runtime.ts
packages/render-engine/src/canvas/text-renderer.ts
docs/story-production/text-layer-v1.md
```
