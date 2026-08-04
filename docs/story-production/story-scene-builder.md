# Production Pipeline Step 2 — AI Story Scene Builder

Builds editable **Scene Instances** from an approved story without modifying Master Templates.

## Binding model (Story Panel → Scene)

```text
Story
├── Story Headline          ← story identity only (NOT on-screen headline)
├── Story Summary / Script
└── Story Panels[]
    ├── Subheadline         → Scene {{headline}} (on-screen) + Story Data “On-screen Headline”
    ├── Media               → Main Media Container ({{main_video}} / {{video}})
    ├── Voice Segment       → {{voice}} + timing window
    ├── Duration / Order
    └── Caption (optional)  → Scene {{subheadline}}
```

Composer Story Instances:

- Open Scene 01…N → form is **Scene Data** (not full story panels)
- Hydration remaps legacy scenes where Headline still held the story title and
  Sub Headline N held the panel line — Scene N uses Sub Headline N + its media
- Rebuild Scene Collection to stamp `binding_model: story-panel-v1` + panel `story_data`

Also bound at generate time:

| Placeholder | Source |
| --- | --- |
| Logo / Reporter / channel_logo | **Master Template** chrome (falls back to GNN demo assets) |
| Optional Information Area 2 | **Master Template** `optional_info_image` / text |
| Advertisement | Story or schedule assignment (when present) |
| Behaviors / animations | Master Template defaults (cloned, not edited on master) |

Editors may override logo, Optional Info, main media, or on-screen headline on the **Scene Instance** in Composer. **Sync from Story Panels** refreshes panel headline/media only and preserves Composer chrome overrides. **Rebuild** re-seeds chrome from the Master Template.

## Workflow

```text
Approved Story → Generated Voice → Analyze into Story Panels
  → Voice timing → Instantiate scenes from Master (e.g. GNN-001)
  → Store Story Package (scenes + voice segments + AI metadata)
```

Timeline generation is **out of scope** for this step — see
`docs/story-production/timeline-assembly.md` (Pipeline Step 3).


## Data model

| Table | Role |
| --- | --- |
| `story_packages` | One live package per story (inventory + history) |
| `story_voice_segments` | Per-panel narration timing windows |
| `story_scene_instances` | Links story ↔ master template ↔ editable `scene_id` clone |

`story_scene_instances.headline` stores the **panel subheadline** (on-screen).  
`metadata.story_headline` keeps the story-level title.

Constraint: `scene_id <> master_template_id` — instances never point at the master row.

## Master Template protection

- Published / archived `is_template` scenes are immutable (DB trigger + service guards).
- Story production always clones (`is_template=false`, `parent_scene_id=master`) and only fills `resolved_bindings`.

## UI

Story Workspace → **Scenes** tab:

1. Prerequisites (approved script, voice status)
2. Build / Rebuild Scene Collection from `GNN-001`
3. Expandable Story Package → Scene 01…N (shows panel headline)
4. Open Scene Composer on the **instance** only

## Code map

```text
src/features/story-scene-builder/
  lib/analyze-script.ts          # Story Panels from Sub Headlines / paragraphs
  lib/build-panel-bindings.ts    # Panel → placeholder binding contract
  lib/voice-segmentation.ts
  lib/instantiate-scene.ts
  lib/master-template-guard.ts
  services/story-package.service.ts
  actions/scene-builder.actions.ts
  components/story-scene-library-tab.tsx
```
