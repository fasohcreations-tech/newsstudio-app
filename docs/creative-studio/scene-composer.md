# Module 3.3 – Enterprise Scene Composer

The **Scene Composer** is the heart of the Motion Scene Engine. Every broadcast graphic is built here as editable JSON — no static PNGs, no hardcoded layouts.

## Route

| Route | Purpose |
|-------|---------|
| `/creative-studio/scenes/[sceneId]` | Full Scene Composer workspace |

## Folder structure

```
src/features/scene-composer/
├── actions/scene-composer.actions.ts
├── components/
│   ├── scene-composer-workspace.tsx
│   └── panels/
│       ├── composer-canvas.tsx
│       ├── composer-left-panel.tsx
│       ├── composer-layers-panel.tsx
│       ├── composer-right-panel.tsx
│       ├── composer-timeline-panel.tsx
│       └── composer-toolbar.tsx
├── constants/scene-composer.constants.ts
├── hooks/
│   ├── use-composer-document.ts   # undo/redo + document state
│   ├── use-composer-canvas.ts     # pan/zoom/selection
│   └── use-composer-playback.ts   # playhead + frame scrubbing
├── lib/
│   ├── composer-db.ts
│   └── object-factory.ts          # objects ↔ layers sync
├── schemas/scene-composer.schema.json
├── services/
│   ├── scene-composer.service.impl.ts
│   ├── canvas.service.impl.ts
│   ├── layer.service.impl.ts
│   └── history.service.impl.ts
└── types/scene-composer.types.ts
```

## Workspace layout

| Region | Panels |
|--------|--------|
| **Left** | Scene library, templates/components, media, brand, shapes, SVG, stock/AI placeholders |
| **Center** | Infinite design canvas — pan, zoom, snap, safe area, grid, rulers, drag objects |
| **Bottom** | Layer list + animation timeline with playhead, FPS timecode, loop |
| **Right** | Properties, inspector, animations, variables, effects, bindings, theme |

## Database (migration `20260324000017_scene_composer.sql`)

Extends `creative_studio_motion_scenes` with `workflow_state`, `frame_rate`, `composer_settings`.

| Table | Purpose |
|-------|---------|
| `creative_studio_scene_components` | Reusable logo/lower-third/title components |
| `creative_studio_scene_objects` | Normalized composer objects |
| `creative_studio_scene_timelines` | Per-scene timeline config |
| `creative_studio_scene_keyframes` | Keyframe architecture |
| `creative_studio_scene_bindings` | Variable ↔ object bindings |

`creative_studio_scene_versions` (from migration 16) stores immutable snapshots.

## Services

| Service | Role |
|---------|------|
| `SceneComposerService` | Load/save/export composer scenes |
| `CanvasService` | Snap, hit-test, align, coordinate transforms |
| `LayerService` | Object CRUD, reorder, duplicate, lock/hide |
| `AnimationService` | Preset catalog (via motion scene engine) |
| `ComponentService` | System component seeding + list |
| `VariableBindingService` | `{{headline}}` etc. (motion-scene-engine) |
| `ThemeService` | Theme mode + composer background |
| `HistoryService` | Undo/redo stack (80 commands) |

## JSON document v2.0

```json
{
  "version": "2.0",
  "objects": [{ "id": "...", "object_type": "text", "transform": {}, "content": { "text": "{{headline}}" } }],
  "layers": [],
  "bindings": [],
  "keyframes": [],
  "placeholders": [],
  "variables": [],
  "animations": []
}
```

Objects sync to `layers` on save for preview monitor compatibility.

## Scene workflow states

`draft` → `review` → `approved` → `published` → `archived`

## AI integration (architecture only)

AI modules will call external actions — **not** modify the composer UI:

- Choose scene template
- Populate variables
- Replace images/videos
- Generate headlines, captions, bible verse cards, quote cards

See `AiComposerRequest` type in `scene-composer.types.ts`.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Shift+Z` | Redo |
| `Ctrl/Cmd+S` | Save |
| `Alt+drag` | Pan canvas |

## Apply migration

Run `supabase/migrations/20260324000017_scene_composer.sql` after migration 16.

## TODOs

- [ ] Resize/rotate handles on canvas
- [ ] Keyframe editor UI with bezier curves
- [ ] Component clone + instance overrides
- [ ] Import scene JSON upload
- [ ] Story live variable sync from newsroom
- [ ] Manglish / voice dictation input modes (Smart Editor integration)
- [ ] Timeline drag-to-trim object in/out points
- [ ] Multi-select marquee on canvas

## Module 3.4 – GNN Broadcast Package v1

Scene Composer now seeds a complete default package for Good News Flash:

- Master design system (typography, colors, spacing, motion language)
- Reusable component library
- Motion preset library
- 10 master scenes (`GNN-001` to `GNN-010`)
- Responsive variants (16:9, 9:16, 1:1, 4K)

See `docs/creative-studio/gnn-broadcast-package-v1.md`.
