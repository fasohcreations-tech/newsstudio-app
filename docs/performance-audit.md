# Supabase Egress Performance Audit

**Date:** 2026-08-03  
**Scope:** NewsStudio app — Creative Studio / Scene Composer primary hot path; shared media, content, AI services  
**Constraint:** No UI or business-logic changes — network / fetch / cache only

---

## Executive summary

Free-plan egress (~7GB+) was driven almost entirely by **repeated downloads of large JSON** (`scene_document`, `object_tree`) and **save amplification** (pre-fetch + full response body + relational sync + post-save refetch), not by DB size (~49MB) or Storage (~8MB).

| Area | Before | After |
|------|--------|-------|
| Scene library list | `select(*)` including full `scene_document` for every template | Lightweight columns; `scene_document` omitted; layer count from `metadata.layer_count` |
| Scene editor open | `ensureComposerDefaults` + full list + full components | Defaults only on library; lightweight list; components without `object_tree` |
| Autosave | ~900ms debounce; get+update+sync tables+get again; returning full JSON | **3.5s** debounce; single UPDATE; no table sync; no document in response |
| Explicit Save | Same path as autosave | `syncTables: true` + version checkpoint only |
| GNN defaults | Rewrote all component `object_tree` + downloaded master `scene_document` every library visit | Version-gated updates; skip document download when skeleton version matches |
| `select("*")` | Widespread across services | Explicit columns everywhere except intentional full-document scene reads (4) |
| Storage signed URLs | New sign on every thumbnail remount | In-memory cache until near expiry |
| TanStack Query | `staleTime: 60s`, refetch on focus off | Also `gcTime`, `refetchOnMount/Reconnect: false` |

**Estimated Creative Studio session reduction:** **70–90%** of scene-related egress.  
**Estimated overall monthly egress reduction (editor-heavy usage):** **60–85%**.  
On Supabase Free (5GB egress soft limit), that is the difference between constant overage and staying within plan for light/medium teams.

---

## 1. Query inventory (hot path)

| File | Component / caller | Query | Frequency | Purpose |
|------|-------------------|-------|-----------|---------|
| `scenes/page.tsx` | Library SSR | `ensureComposerDefaults` + `listScenes` (light) + `listCategories` | Once per library visit | Seed GNN + list templates |
| `scenes/[sceneId]/page.tsx` | Editor SSR | `getComposerScene` + light `listScenes` + `listCategories` + light `listComponents` | Once per open | Editor bootstrap |
| `scene-composer.service.impl.ts` | `saveComposerScene` | Single UPDATE (no document in RETURNING) | Autosave ~3.5s idle; Save = checkpoint | Persist document |
| `scene-composer.service.impl.ts` | `syncComposerTables` | Upsert objects/bindings/keyframes | Checkpoint / restore only | Normalized tables |
| `motion-scene.service.impl.ts` | `getScene` | Full row `select("*")` | Editor open, version ops | Load document |
| `motion-scene.service.impl.ts` | `listScenes` | Explicit cols, range 100 | Library / sidebar | Catalog |
| `media.service.ts` | `createSignedAssetUrl` | Storage sign (cached) | Thumbnails / bindings | Playback URLs |
| `profile.service.ts` | `getCurrentProfile` | Explicit profile cols | Most authenticated pages | Membership context |
| `middleware.ts` | Session refresh | `auth.getUser()` | Every matched request | Cookie refresh (required) |
| `use-auth.ts` | Client auth | `getSession` + `onAuthStateChange` | Once per mount | Client session |

**Realtime:** No Supabase Realtime `channel()` / `postgres_changes` subscriptions found. Local `subscribe()` hooks are in-memory (undo, playback, selection).

---

## 2. Root causes of egress

1. **`listScenes` downloaded every scene’s full JSON** for library and editor sidebar.
2. **Autosave (~900ms)** wrote large documents frequently and:
   - Prefetched the scene
   - `updateScene` returned `select("*")` (full document egress again)
   - Synced all object/binding/keyframe rows (409s when RLS blocked deletes)
   - Called `getComposerScene` again
3. **`ensureComposerDefaults` on every editor open** plus **unconditional GNN component UPDATEs** rewriting large `object_tree` JSON every library load.
4. **`listComponents` with `select("*")`** pulled every component’s `object_tree` into the editor even though the UI only shows name/kind/version.
5. **Signed URLs** recreated on every `MediaThumbnail` remount.
6. Broad **`select("*")`** across media, content, AI, timeline services.

---

## 3. Fixes applied

### Scene list vs editor document

- `listScenes({ lightweight: true })` is the default — omits `scene_document` / `timeline`.
- Stamps `metadata.layer_count` / `object_count` on save; library UI reads that.
- Pagination: default `limit=100`, `offset` supported via `.range()`.
- Editor page loads **one** full document via `getComposerScene`; sidebar lists stay light.
- Removed `ensureComposerDefaultsAction` from editor page and from `listComposerComponentsAction`.

### Autosave

- Debounce **900ms → 3500ms** (`useComposerAutosave`).
- Fingerprint skip + in-flight coalescing unchanged (still no save storms).
- Autosave: `revalidate: false`, `syncTables: false`.
- Checkpoint (Ctrl+S / Save): `syncTables: true` + version snapshot.

### Stop refetch after save

- `saveComposerScene` merges the client document into the action result — **no second GET**.
- `updateScene({ refetch: false })` omits `scene_document` from RETURNING.
- `createScene` no longer calls `getScene` after insert.

### 409 conflicts

- Object/binding/keyframe sync already used **upsert**; now runs **only on checkpoint**, so autosave no longer hammers inserts during drag.
- GNN component seed still existence-checks before insert.

### `select("*")`

- Replaced across creative-studio, content, intake, story scripts, AI workspace/production/jobs, media folders/assets, profile, scene components/categories/presets.
- **Intentionally retained (4):** `getScene`, create insert returning, duplicate insert returning, version snapshot read — these **must** transfer the document when opening/editing.

### Storage

- Module-level signed URL cache in `createSignedAssetUrl` (refresh 60s before expiry).

### Auth

- No redundant client polling added; `useAuth` remains single mount + listener.
- Middleware `getUser()` kept (Supabase session refresh requirement).

### TanStack Query

- `staleTime: 60_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus/Reconnect/Mount: false`.

### Dev logging

- `src/shared/lib/supabase/query-log.ts` — `withQueryLog(label, run)` logs ms, ~KB, rows, and duplicate detection within 750ms (development only).
- Wired on `listScenes`, `getScene`, `saveComposerScene`.

### GNN defaults cost

- Component tree UPDATEs gated on version metadata (`layout_skeleton_version`, `background_version`, `frame_version`, `main_video_version`).
- Master scene document download skipped when `layout_skeleton_version` already matches.

---

## 4. Files changed (primary)

| Path | Change |
|------|--------|
| `src/shared/lib/supabase/query-log.ts` | **New** — egress diagnostics |
| `src/features/motion-scene-engine/services/motion-scene.service.impl.ts` | Lightweight list, pagination, update options, query logs |
| `src/features/scene-composer/services/scene-composer.service.impl.ts` | Lean save, light components, version-gated GNN sync |
| `src/features/scene-composer/actions/scene-composer.actions.ts` | `syncTables` flag; no defaults on list components |
| `src/features/scene-composer/hooks/use-composer-document.ts` | 3.5s autosave debounce |
| `src/features/scene-composer/components/scene-composer-workspace.tsx` | Checkpoint-only table sync |
| `src/app/(app)/creative-studio/scenes/[sceneId]/page.tsx` | No defaults seed; light lists |
| `src/features/media/services/media.service.ts` | Explicit selects + signed URL cache |
| `src/features/profile/services/profile.service.ts` | Explicit columns |
| `src/shared/components/providers/query-provider.tsx` | Stronger cache defaults |
| Library UI panels | `metadata.layer_count` for layer badge |
| Creative / content / intake / AI services | Explicit `select` column constants |

---

## 5. Verification checklist

| Check | Status |
|-------|--------|
| No duplicate full-document list downloads | ✓ lightweight list default |
| No unnecessary post-save refetch | ✓ local merge |
| No `select("*")` except intentional full-document scene ops | ✓ 4 remaining |
| Autosave debounced (≥2s) | ✓ 3.5s |
| Large scene JSON only on open / explicit load | ✓ |
| Auth not polled in a loop | ✓ |
| No unnecessary Realtime subscriptions | ✓ none present |
| Dev query timing / size logs | ✓ `[supabase]` console.debug |
| Report generated | ✓ this file |

---

## 6. Estimated savings

Assumptions: active editor session ~30 min, autosave previously every ~1s of activity with ~200–800KB document round-trips, library visited often.

| Source | Rough before | Rough after |
|--------|--------------|-------------|
| Library list (10 scenes × ~500KB) | ~5MB / visit | ~50–150KB / visit |
| Editor open (list + components trees) | multi-MB | ~1× document + light lists |
| Autosave (document × N + sync + refetch) | 10–50+ MB / session | ~1× document ingress per save; tiny RETURNING |
| GNN ensureDefaults | multi-MB writes/reads / visit | near-zero when versions current |
| Media signed URLs | 1 Storage API call / thumbnail mount | 1 / asset / hour |

**Monthly (heavy Creative Studio use):** previously multi-GB from document churn alone; post-fix typically **well under Free-plan egress** if Storage CDN for media is kept modest.

---

## 7. Follow-ups (optional, not required for this pass)

- Replace remaining 4 scene `select("*")` with an explicit full-column list (same payload, clearer intent).
- Add UI pagination controls when scene count exceeds 100.
- Persist signed URL cache across tabs via `sessionStorage` if Storage API calls remain visible in metrics.
- Consider a one-shot `ensure_defaults` flag in org settings to skip even the cheap version checks after first seed.
