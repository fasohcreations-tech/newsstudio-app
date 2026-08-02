# Creative Studio (Module 3.0)

Desktop-class timeline workspace for manual news production editing. Manual editing is the primary workflow; AI-assisted editing, rendering, FFmpeg, and export are intentionally deferred.

## Routes

| Route | Purpose |
| --- | --- |
| `/creative-studio` | Project list — create, open, duplicate, archive, delete |
| `/creative-studio/projects/[projectId]` | Full studio workspace |
| Story workspace **Timeline** tab | Open or create story-linked projects |

## Layout

- **Left panel:** Project Explorer, Media Bin (Media Library + favorites), Template Library
- **Center:** Preview monitor + transport controls
- **Bottom:** Resizable multi-track timeline with drag-drop, trim handles, ripple mode
- **Right panel:** Inspector + AI Assistant placeholder

## Database

Migration: `supabase/migrations/20260324000013_creative_studio.sql`

Tables: `creative_studio_projects`, `creative_studio_timelines`, `creative_studio_timeline_tracks`, `creative_studio_timeline_clips`, `creative_studio_templates`, `creative_studio_template_placeholders`.

Types are mirrored in `src/shared/types/database.types.ts`.

## Implemented capabilities

| Area | Status |
| --- | --- |
| Project CRUD + story link | Done |
| Media bin → Media Library | Done |
| Favorites (client collections) | Done |
| Drag-drop clips to timeline | Done |
| Trim handles (in/out) | Done |
| Ripple editing toggle | Done |
| Persist playhead / zoom / snap | Done (debounced) |
| Story workspace deep link | Done |
| Render / FFmpeg / export | Deferred |
| AI editing panel | Placeholder |

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Frame step |
| `S` | Toggle snap |
| `F` | Fullscreen |
| `Ctrl+=` / `Ctrl+-` | Zoom in / out |
| `Ctrl+5` (story workspace) | Timeline tab |

## Remaining (future modules)

- [ ] Apply migration in Supabase if not yet applied
- [ ] Regenerate types via Supabase CLI after schema changes
- [ ] RenderService + FFmpeg export pipeline
- [ ] AI-assisted editing in right panel
- [ ] Full ripple on left-edge trims and cross-track edits

## Usage

```tsx
import { CreativeStudioWorkspace } from "@/features/creative-studio";
```

Server pages load project, templates, and media bin assets, then render `CreativeStudioWorkspace`.
