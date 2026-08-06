# MediaOS Feature 040 — Professional Template Designer v1

**Branch:** `feature/template-designer-v1`  
**Module:** `src/features/template-designer/`  
**Routes:** `/templates/*`  
**Status:** Single-page Design Workspace live. Templates are persisted scenes.

---

## 1. Objective

Evolve Scene Composer into a complete **Professional Broadcast Template Designer** — the foundation for every future news graphics package (GNN 001/002, Breaking, Election, Weather, Sports, Live, Promo, Documentary, Interview, Social, Vertical Reels, …).

**Do not redesign existing modules.** Integrate:

- AI Producer · Story Editor · Scene Library · Timeline · Asset Engine  
- Behaviour Engine · Shape Composer · Motion Library · Story Preview  
- Render Engine V2 (consumes Template Instances later)

---

## 2. Product model

```
Story  →  references Template  →  supplies Data only
Template  →  owns Layout / Layers / Effects / Behaviours / Bindings
Timeline  →  renders Template Instances
Renderer  →  paints from Template + Story data (Canvas V2 / DOM Legacy)
```

| Owns | Does not own |
|------|----------------|
| Canvas, theme, layers, groups | Headline / ticker text values |
| Effects, behaviours, animations | Story media URLs |
| Binding *slots* (keys) | Story metadata |
| Timeline defaults | Playout schedule |

**Save format:** reusable Template JSON. Never embed Story data inside Templates.

---

## 3. Architecture decision — a Template *is* a template scene

The first pass kept `BroadcastTemplate` records in an in-memory store and gave
each feature its own placeholder route. That produced ten pages with no editing
capability, and templates vanished on server restart.

Feature 040 is now backed by the existing persistence:

- `creative_studio_motion_scenes` rows with **`is_template = true`** *are* the
  templates. `motionService.listScenes()` already filters on that flag, so the
  Template Library and the Scene Library can never drift apart.
- `templateId` in the route **is** the composer scene id.
- No migration, no second source of truth, and templates survive restarts.

Links from the earlier in-memory build carry ids that were never scenes. The
Design route detects that and explains it instead of returning a bare 404.

---

## 4. Single Design Workspace

`/templates/:templateId/design` mounts **`SceneComposerWorkspace`** — the same
runtime Story Preview uses. One screen, four regions:

| Region | Component | Capabilities |
|--------|-----------|--------------|
| **Left** | `ComposerLayersPanel` | Hierarchical tree (groups nest via `parent_object_id`), drag & drop reorder, group / ungroup, lock, hide, rename, duplicate, delete |
| **Center** | `EditorCanvas` | Zoom, pan, rulers, grid, guides, safe area, snap, object + multi-selection, bounding box, 8 resize handles, rotation handle |
| **Right** | `PropertyInspectorPanel` | Object · Text · Transform · Animation · Effects · Behaviours · Shapes · Bindings · Story |
| **Bottom** | `EnhancedTimelinePanel` | Playhead, markers, playback controls, frame stepping, loop, fps |

The Property Inspector switches contents on the selected object's kind
(`classifyObject`), so a logo, ticker, clock and shape each expose their own
fields.

### Engines are embedded, not forked

| Inspector tab | Existing module |
|---------------|-----------------|
| Animation | Motion Library (`LayerMotionFields`) |
| Effects | Broadcast Effects (`LayerEffectsPanel`) |
| Behaviours | Behaviour Engine (`LayerBehaviorsPanel`) |
| Shapes | Shape Composer (`LayerShapePanel`) |
| Bindings | Story variable binding (`LayerBindingsPanel`) |
| Story | Story data form (`StoryDataFormPanel`) |
| Canvas preview | `StoryLivePreview` |

---

## 5. Routes

| Route | Behaviour |
|-------|-----------|
| `/templates` | Library — lists persisted template scenes |
| `/templates/new` | Creates a real template scene, then opens the workspace |
| `/templates/:id` | Redirect → `design` |
| `/templates/:id/design` | **The workspace** (single page) |
| `/templates/:id/layers` · `/preview` | Redirect → `design` |
| `/templates/:id/properties` | Redirect → `design?inspector=object` |
| `/templates/:id/animations` | Redirect → `design?inspector=animation` |
| `/templates/:id/effects` | Redirect → `design?inspector=effects` |
| `/templates/:id/behaviours` | Redirect → `design?inspector=behaviors` |
| `/templates/:id/shapes` | Redirect → `design?inspector=shape` |
| `/templates/:id/bindings` | Redirect → `design?inspector=bindings` |
| `/templates/:id/assets` | Redirect → `design?inspector=story` |

The per-feature routes are kept as redirects so existing links stay valid and
land on the matching inspector tab. Story routes are **unchanged**.

---

## 6. Bindings

`LayerBindingsPanel` writes the tokens the runtime already resolves:

| Field | Written value | Consumed by |
|-------|---------------|-------------|
| `bindings.text` | `{{headline}}` | `StoryLivePreview`, Canvas text renderer |
| `bindings.src` | `{{image}}` | `StoryLivePreview`, `scene-to-runtime` |
| `bindings.story_field` | `image` | `resolveMediaTargetForObject` (media browser target) |

---

## 7. Status

| Deliverable | Status |
|-------------|--------|
| Single Design Workspace | ✅ |
| Layer tree + drag & drop + groups | ✅ |
| Canvas zoom/pan/grid/rulers/safe area/snap | ✅ (pre-existing) |
| Multi-selection bounding box | ✅ |
| Rotation handle (Shift = 15° steps) | ✅ |
| Inspector: Object/Text/Transform/Animation/Effects/Behaviours/Shapes/Bindings | ✅ |
| Animation timeline (bottom) | ✅ (pre-existing) |
| Persisted templates (no in-memory store) | ✅ |
| Deep links from legacy panel routes | ✅ |
| Story routes unchanged | ✅ |
| Keyframe editing in bottom timeline | 🔲 next |
| Nested group transform inheritance on canvas | 🔲 next |
| `Story.template_id` reference | 🔲 next (additive, non-breaking) |
| Template Compiler for Render Engine V2 | 🔲 later |

### Known limits

- Resize math uses unrotated axes, so dragging a side handle on a rotated layer
  moves along screen axes rather than the layer's local axes.
- Grouping creates a transform parent; the canvas does not yet cascade a group's
  transform onto its children.
- The bottom timeline exposes playback and markers; per-property keyframe curves
  are still edited in the Animation tab.

### Orphaned scaffolding

`template-designer-shell.tsx`, `template-panel-placeholder.tsx`,
`render-template-panel.tsx`, `template-designer.actions.ts` and the in-memory
`template-designer.service.impl.ts` are no longer referenced by any route. They
are retained (not deleted) and can be removed once the branch is reviewed.

---

## 8. Success criteria (Feature 040)

- Designer can build a full broadcast package without code.  
- One Template → unlimited Stories.  
- Story Preview + Timeline keep working.  
- No existing functionality broken.  
- Template format ready for compiler / Canvas renderer without schema churn.
