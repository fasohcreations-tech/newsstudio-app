# Module 3.1 – Enterprise Timeline Engine

Professional multi-track timeline editor for newsroom Creative Studio workflows.

**Scope:** Architecture, persistence, and desktop-class UI. No rendering, FFmpeg, export, or AI editing.

## Folder structure

```
src/features/creative-studio/
├── actions/
│   ├── timeline.actions.ts          # create / move / trim clips
│   └── clip-operations.actions.ts   # split, duplicate, delete, track, markers
├── components/
│   ├── timeline-engine/
│   │   ├── timeline-engine.tsx      # Main orchestrator
│   │   ├── timeline-toolbar.tsx     # Zoom, snap, ripple, undo, clip ops
│   │   ├── timeline-ruler.tsx       # Time ruler + playhead scrub
│   │   ├── track-header.tsx         # Collapse, mute, lock, resize
│   │   ├── track-lane.tsx           # Drop zone + clip lane
│   │   └── clip-block.tsx           # Trim, move, selection
│   └── panels/
│       └── timeline-editor.tsx      # Legacy 3.0 editor (kept for reference)
├── constants/
│   └── timeline-engine.constants.ts # Track kinds, colors, ripple modes
├── hooks/
│   ├── use-timeline-selection.ts    # Client selection state
│   └── use-undo-redo.ts             # Client undo/redo stack
├── lib/
│   ├── studio-utils.ts              # Snap, drag-drop compatibility
│   └── timeline-engine-utils.ts     # ms ↔ px, ruler ticks
├── services/
│   ├── interfaces/
│   │   ├── track.service.ts
│   │   ├── clip.service.ts
│   │   ├── selection.service.ts
│   │   ├── undo-redo.service.ts
│   │   └── enterprise-timeline.service.ts
│   ├── track.service.impl.ts
│   ├── clip.service.impl.ts
│   ├── selection.service.impl.ts
│   ├── undo-redo.service.impl.ts
│   └── enterprise-timeline.service.impl.ts
└── types/
    └── timeline-engine.types.ts

supabase/migrations/
└── 20260324000014_timeline_engine.sql
```

## Track types

| Kind | Label |
|------|-------|
| `video` | Video |
| `image` | Images |
| `graphics` | Graphics |
| `title` | Titles |
| `subtitle` | Subtitles |
| `voice` | Voice |
| `music` | Music |
| `sfx` | Sound FX |
| `marker` | Markers |
| `ai_suggestion` | AI Suggestions |

Legacy `audio` tracks remain compatible (mapped to voice/music in the UI).

## Clip operations

| Operation | UI | Server action | Service |
|-----------|-----|---------------|---------|
| Trim start/end | Drag handles | `trimTimelineClipAction` | `ClipService.trim` |
| Split | Toolbar @ playhead | `splitTimelineClipAction` | `ClipService.split` |
| Duplicate | Toolbar | `duplicateTimelineClipAction` | `ClipService.duplicate` |
| Delete | Toolbar | `deleteTimelineClipAction` | `ClipService.softDelete` |
| Lock / Mute / Hide | Inspector (future) | `updateClipFlagsAction` | `ClipService` |
| Rename / Color | Inspector | `updateClipFlagsAction` | `ClipService.update` |
| Move | Drag clip body | `moveTimelineClipAction` | `ClipService.move` |

## Timeline features

- **Zoom** – toolbar ± (0.5×–3×)
- **Horizontal / vertical scroll** – overflow container
- **Time ruler** – adaptive tick spacing
- **Snap** – frame-aligned (`snapMs`)
- **Ripple editing** – architecture via `ripple_mode` (`off | standard | trim | roll`); trim ripple shifts downstream clips
- **Magnetic timeline** – `magnetic_enabled` flag (UI toggle; full behavior TBD)
- **Markers** – `creative_studio_timeline_markers` table + ruler display
- **Playhead** – ruler scrub + lane indicator
- **Selection** – single + shift-add clips; track header selection
- **Drag & drop** – media bin → compatible track lanes

## Story linking

Stored on timelines and clips (migration `20260324000014`):

| Field | Level |
|-------|-------|
| `story_id` | Timeline |
| `scene_id` | Timeline, Clip |
| `content_object_id` | Timeline, Clip |
| `voice_segment_id` | Timeline, Clip |
| `script_paragraph_id` | Timeline, Clip |

Flexible many-to-many links: `creative_studio_timeline_links` (`kind` + `target_id`).

## Database summary

**Extended tables**

- `creative_studio_timelines` — `story_id`, `scene_id`, `content_object_id`, `voice_segment_id`, `script_paragraph_id`, `magnetic_enabled`, `ripple_mode`
- `creative_studio_timeline_tracks` — `collapsed`, `visible`, `solo`, `color_label`
- `creative_studio_timeline_clips` — `locked`, `muted`, `hidden`, `color_label`, story FKs, `source_clip_id`

**New tables**

- `creative_studio_timeline_markers`
- `creative_studio_timeline_links`

**Enums extended**

- `creative_track_kind` — `image`, `title`, `voice`, `music`, `sfx`, `marker`, `ai_suggestion`
- `creative_clip_kind` — `title`, `voice`, `music`, `sfx`, `ai_suggestion`
- `creative_timeline_link_kind` — story, scene, content_object, voice_segment, script_paragraph

Apply in Supabase SQL Editor:

```sql
-- Run: supabase/migrations/20260324000014_timeline_engine.sql
```

## Services

| Service | Role |
|---------|------|
| `TimelineService` | Base bundle, CRUD (Module 3.0) |
| `EnterpriseTimelineService` | Markers, links, ripple/magnetic settings |
| `TrackService` | Track order, collapse, height, mute/lock |
| `ClipService` | Trim, split, duplicate, delete, flags |
| `SelectionService` | Client-only clip/track/marker selection |
| `UndoRedoService` | Client-only command stack (max 50) |

## TODOs (future modules)

- [ ] Persist undo/redo to server or operational transform
- [ ] Full magnetic timeline (clip collision + auto-close gaps)
- [ ] Roll / trim ripple modes (beyond standard shift)
- [ ] Multi-clip drag across tracks
- [ ] Keyboard shortcuts for split (S), duplicate (Ctrl+D), delete
- [ ] Load markers from DB on workspace mount
- [ ] Story/scene linking UI in inspector
- [ ] `creative_studio_timeline_links` CRUD UI
- [ ] Regenerate `database.types.ts` from Supabase CLI
- [ ] AI Suggestions track population (Module 4.x — no AI editing here)
- [ ] Waveform / thumbnail clip previews (no FFmpeg in this module)
