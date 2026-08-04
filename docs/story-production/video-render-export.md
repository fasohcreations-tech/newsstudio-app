# Module 3.1 — Video Rendering & Export Engine

Renders an assembled **Timeline** into a publishable video file.
Non-destructive: never mutates Story, Story Panels, Master Templates, Scene
Instances, or Timeline rows.

## Pipeline position

```text
Timeline Assembly (3.0)
  → Video Rendering & Export (3.1)
  → publishable MP4 / WebM / MOV
```

BroadcastOS is intentionally out of scope.

## Features

1. **Rendering Engine** — browser compositor over an immutable `RenderPlan`
2. **Export Dialog** — format, resolution, frame rate, bitrate, voice/music
3. **Render Queue** — status, progress, ETA, cancel, retry, open/download
4. **Background rendering** — job ledger in Supabase; encode runs in-session
5. **Supabase Storage** — outputs under `stories/{org}/renders/{story}/{id}.*`
6. **MP4 export** — H.264 when MediaRecorder supports it; WebM fallback

Future codecs (HEVC, ProRes) plug in via the same job + encoder adapter surface
(`FUTURE_EXPORT_CODECS`).

## Schema

Migration `20260324000028_video_render_export.sql` → `story_video_renders`.

## UI

Story Workspace → **Timeline** tab → **Video Rendering & Export** card
(below Timeline Assembly; Creative Studio remains optional and unchanged).

## Code map

```text
src/features/video-render-export/
  actions/render.actions.ts
  components/video-export-dialog.tsx
  components/video-render-queue.tsx
  components/video-render-export-panel.tsx
  constants/render.constants.ts
  lib/build-render-plan.ts
  lib/compositor.ts
  lib/video-render-db.ts
  schemas/render.schemas.ts
  services/browser-render-worker.ts
  services/render-job.service.ts
  types/render.types.ts
```

Apply migration `000028` on your Supabase project before using Export.
