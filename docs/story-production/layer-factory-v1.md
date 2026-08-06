# MediaOS Feature 042 — Professional Layer Creation System

**Branch:** `feature/design-workspace-v2`  
**Module:** `src/features/scene-composer/lib/layer-factory/`

---

## Problem

The temporary **Add Layer** control always created a Rectangle. That is not acceptable for a broadcast graphics editor.

## Solution

### LayerFactory

```ts
LayerFactory.create("headline", { durationMs, artboard, sortOrder })
```

- Every creatable object has a **LayerKind** (menu identity).
- Recipes map kinds → `SceneObject` (type, transform, style, bindings, metadata).
- **Never** falls back to Rectangle — unknown kinds throw.
- Extensible: `LayerFactory.register(recipe, menu)`.

Canvas, AI Producer, Story Builder, and future modules must use this API — do not hardcode `createSceneObject({ objectType: "rectangle" })` for menu creation.

### Add Layer menu

Opening **Add** / **Add Layer** shows categorized kinds:

| Category | Examples |
|----------|----------|
| Text | Headline, Subheadline, Paragraph, Rich Text, Bible Verse, Quote, Scrolling Text |
| Media | Image, Video, Audio, Image Sequence, Live Stream, Web Page |
| Shapes | Rectangle, Rounded Rectangle, Circle, Ellipse, Triangle, Polygon, Line, Arrow, Star |
| Vector | SVG, Icon, Logo |
| Broadcast | Lower Third, Clock, Date, Breaking News Strap, Ticker, Reporter Box, Location Box, QR Code |
| Containers | Group, Folder, Mask, Component, Smart Container |
| Generators | Gradient, Noise, Background, Grid, Pattern |

### Entry points

- Layers panel → **Add**
- Menu bar → **Add Layer**
- Empty scene CTA

Both open the same `AddLayerMenu` driven by `LayerFactory.getMenu()`.

### Metadata

Created objects carry `metadata.layer_kind` so runtime/preview can distinguish Headline vs Paragraph even when both use `object_type: "text"`.

Kinds without a dedicated `SceneObjectType` yet (Triangle, Arrow, Noise, …) map to the closest type and store `shape_variant` / `generator` in metadata — ready for later first-class support without schema churn.

---

## Files

```
src/features/scene-composer/lib/layer-factory/
  types.ts      # LayerKind, categories, catalog
  recipes.ts    # default recipes
  index.ts      # LayerFactory API
components/editor/add-layer-menu.tsx
```

---

## Success

- Choosing Headline creates a Headline layer, not a Rectangle.
- Choosing Rectangle is the only path that creates a Rectangle.
- New kinds can be added by registering a recipe + menu entry.
