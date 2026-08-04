# Production Pipeline Step 3 — Timeline Assembly Engine

Assembles a ready **Story Scene Collection** into an editable production
Timeline. Each Timeline Clip **references** a Scene Instance — Scene documents
are never duplicated. No rendering. No BroadcastOS.

## Flow

```text
News Story
  → Story Panels
  → Story Scene Collection (package status = ready)
  → Timeline Assembly Engine
  → Editable multi-track Timeline
```

## Gate

**Ready for Timeline** = `story_packages.status === 'ready'` with one or more
Scene Instances. (There is no separate story status enum value.)

## Schema

Migration `20260324000027_story_timeline_assembly.sql`:

| Table | Role |
| --- | --- |
| `story_timelines` | One live timeline per story |
| `story_timeline_tracks` | Scene, Voice, Music, Graphics, Ticker, Advertisement |
| `story_timeline_clips` | References `scene_instance_id` / `voice_segment_id` |
| `story_timeline_transitions` | Cut / Fade / Cross Dissolve / Slide / Push / Wipe / Broadcast Reveal |

## Assembly rules

- Scene clip duration prefers voice window (`voice_end_ms − voice_start_ms`),
  then voice segment length, then instance `duration_ms`.
- Scenes are placed back-to-back with cut transitions (no intentional gaps).
- Voice is a **single continuous** clip spanning the full timeline (story
  voiceover file from 0), not chopped per panel — so VO plays seamlessly.
- Preview stretches Master Template layer `end_ms` (often 10s) to the active
  clip duration so compositions do not go blank mid-scene.

## Non-destructive editing

Editors may move, trim, split, duplicate, delete, disable, lock clips and change
transitions. **Never** mutates Master Templates, Story Panels, Stories, or Scene
Library rows.

## Scene synchronization

If a Scene Instance changes after assembly, the Timeline tab prompts:

- **Apply** — refresh clip name/duration from the instance
- **Ignore** — keep timeline edit

Never auto-overwrites timeline edits.

## UI

Story Workspace → **Timeline** tab:

1. Assemble / Reassemble Timeline
2. **Preview monitor** — composed Creative Studio Scene (`StoryLivePreview` via
   `scene_id`) at playhead, not raw attached media alone
3. **Transport** — play / pause / scrub / step / prev-next scene (Space toggles play)
4. Multi-track panel (ruler, headers, clips, playhead, zoom, snap)
5. Voice — single continuous story voiceover across the timeline
6. Optional Creative Studio link (unchanged)

## Code map

```text
src/features/story-timeline-assembly/
  actions/timeline.actions.ts
  components/story-timeline-assembly-workspace.tsx
  components/story-timeline-panel.tsx
  constants/timeline.constants.ts
  schemas/timeline.schemas.ts
  services/timeline-assembly.service.ts
  services/timeline-edit.service.ts
  types/timeline.types.ts
```

Apply the migration before using Timeline Assembly in a live Supabase project.

Out of scope: rendering, BroadcastOS, redesign of Creative Studio or Scene Builder.
