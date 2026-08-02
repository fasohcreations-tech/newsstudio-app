# Module 3.2 – Enterprise Motion Scene Engine

MediaOS Creative Studio graphics are **reusable Motion Scenes** — editable JSON documents with layers, placeholders, animations, and timeline behavior. No static PNG templates, no FFmpeg rendering pipeline in this module.

## Routes

| Route | Purpose |
|-------|---------|
| `/creative-studio/scenes` | Scene library + newsroom quick create |
| `/creative-studio/scenes/[sceneId]` | Desktop-class scene editor |
| `/creative-studio/graphics` | Legacy redirect → scenes |

## Folder structure

```
src/features/motion-scene-engine/
├── actions/motion-scene.actions.ts
├── components/
│   ├── motion-scene-library-home.tsx
│   ├── motion-scene-editor-workspace.tsx
│   ├── motion-scene-overlay.tsx
│   └── panels/
├── constants/motion-scene.constants.ts
├── hooks/use-scene-preview.ts
├── lib/
│   ├── clip-motion-scene-metadata.ts
│   ├── motion-scene-db.ts
│   ├── motion-scene-navigation.ts
│   ├── scene-defaults.ts
│   └── variable-binding.ts
├── schemas/motion-scene.schema.json
├── services/motion-scene.service.impl.ts
└── types/motion-scene.types.ts
```

## Database (migration `20260324000016_motion_scene_engine.sql`)

- `creative_studio_motion_scenes`
- `creative_studio_scene_layers`
- `creative_studio_scene_placeholders`
- `creative_studio_scene_variables`
- `creative_studio_scene_animations`
- `creative_studio_scene_versions`
- `creative_studio_scene_categories`
- `creative_studio_scene_tags` / `scene_tag_links`

Legacy graphic template tables and the GNN broadcast pack are **purged** by this migration.

## Services

| Service | Implementation |
|---------|----------------|
| `MotionSceneService` | `motion-scene.service.impl.ts` |
| `AnimationService` | System presets via `ensureAnimationPresets` |
| `SceneLibraryService` | `listScenes`, `listCategories` |
| `PlaceholderService` | Normalized `scene_placeholders` sync |
| `ThemeService` | `theme_mode` + `properties.theme_tokens` |
| `VariableBindingService` | `variable-binding.ts` |

## Variable binding

Placeholders use `{{headline}}`, `{{reporter}}`, `{{primary_color}}`, etc. Story changes should flow through `resolved_bindings` on timeline clips:

```json
{
  "motion_scene_id": "…",
  "scene_type": "lower_third",
  "scene_document": { "version": "1.0", "layers": [], "placeholders": [] },
  "resolved_bindings": { "headline": "…" }
}
```

## Creative Studio integration

- **Preview Monitor** — `MotionSceneOverlay` from clip metadata
- **Inspector** — “Open in Scene Editor”
- **Project header** — link to `/creative-studio/scenes?projectId=…&trackId=…`
- **Place at playhead** — scene editor when opened from a project

## TODOs

- [ ] Undo/redo command stack in editor
- [ ] Dockable panel persistence (reuse `ResizablePanel`)
- [ ] Full keyframe editor per layer property
- [ ] Story → `VariableBindingService` live sync from newsroom
- [ ] Brand kit theme auto-resolve for `channel` theme mode
- [ ] Responsive reposition rules per aspect format (16:9, 9:16, 1:1, 4:5, 21:9)
- [ ] Scene version history UI
- [ ] AI scene generation (future module) consuming this JSON schema

## Apply migration

Run `supabase/migrations/20260324000016_motion_scene_engine.sql` in the Supabase SQL editor after migrations 13–15.
