# MediaOS Feature 040 — Professional Template Designer v1

**Branch:** `feature/template-designer-v1`  
**Module:** `src/features/template-designer/`  
**Routes:** `/templates/*`  
**Status:** Initialized (scaffold). Persistence + deep Scene Composer hosting come next.

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

## 3. Routes (shipped)

| Route | Purpose |
|-------|---------|
| `/templates` | Library list |
| `/templates/new` | Create template |
| `/templates/:id` | Redirect → design |
| `/templates/:id/design` | Main Designer |
| `/templates/:id/assets` | Template assets |
| `/templates/:id/layers` | Layer Manager |
| `/templates/:id/properties` | Property Inspector |
| `/templates/:id/animations` | Animation Editor |
| `/templates/:id/behaviours` | Behaviour Editor |
| `/templates/:id/shapes` | Shape Composer |
| `/templates/:id/effects` | Effects Studio |
| `/templates/:id/bindings` | Data Bindings |
| `/templates/:id/preview` | Live Preview |

Story routes are **unchanged**.

---

## 4. Module map

```
src/features/template-designer/
  types/template-designer.types.ts
  constants/template-designer.constants.ts
  services/
    template-designer.service.ts
    template-designer.service.impl.ts   # in-memory seed (dev scaffold)
  actions/template-designer.actions.ts
  components/
    template-library-home.tsx
    create-template-form.tsx
    template-designer-shell.tsx
    template-panel-placeholder.tsx
  lib/
    load-template.ts
    render-template-panel.tsx
```

App nav: **Templates** → `/templates` (`src/shared/config/navigation.ts`).

---

## 5. Integration contract

Each Designer panel **hosts** an existing engine — it does not fork it:

| Panel | Existing module |
|-------|-----------------|
| Design / Layers / Properties | Scene Composer |
| Shapes | Shape Composer |
| Behaviours | Behaviour Engine |
| Animations | Motion Library |
| Effects | Broadcast Effects |
| Preview | StoryLivePreview |
| Assets | Asset Engine |
| Bindings | Story variable binding |

`BroadcastTemplate.composer_scene_id` links to an existing Composer Scene when available.

---

## 6. Initialization status

| Deliverable | Status |
|-------------|--------|
| Route hierarchy | ✅ |
| Template types + binding keys | ✅ |
| Library / create / designer shell | ✅ |
| Seed packages (GNN-001, GNN-002, Reels) | ✅ in-memory |
| Nav entry | ✅ |
| Story routes unchanged | ✅ |
| Supabase persistence migration | 🔲 next |
| Embed SceneComposerWorkspace in Design | 🔲 next |
| Story.template_id reference | 🔲 next (non-breaking) |
| Template Compiler for Render Engine V2 | 🔲 later |

---

## 7. Next engineering steps

1. **Migration** `broadcast_templates` table (JSON document + `composer_scene_id` FK).  
2. **Design panel** mounts `SceneComposerWorkspace` when a scene is linked; “Create scene from template” otherwise.  
3. **Layer / Properties** panels become thin shells over Composer selection state.  
4. **Story integration:** additive `template_id` on story/package — Stories still work without it.  
5. Keep Template JSON stable for future Template Compiler + Render Engine V2.

---

## 8. Success criteria (Feature 040)

- Designer can build a full broadcast package without code.  
- One Template → unlimited Stories.  
- Story Preview + Timeline keep working.  
- No existing functionality broken.  
- Template format ready for compiler / Canvas renderer without schema churn.
